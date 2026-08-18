import { eq, desc, asc, and, like, inArray, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  leads, InsertLead, Lead,
  campaigns, InsertCampaign, Campaign,
  sequenceSteps, InsertSequenceStep,
  campaignLeads, InsertCampaignLead,
  engagementEvents, InsertEngagementEvent,
  salesforceTasks, InsertSalesforceTask,
  sendingDomains, InsertSendingDomain,
  rolloutMilestones, InsertRolloutMilestone,
  integrationConfigs, InsertIntegrationConfig,
  activityLog, InsertActivityLogEntry,
  unsubscribes, InsertUnsubscribe,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Leads ───────────────────────────────────────────────────────────────────
export async function getLeads(filters?: { segment?: string; status?: string; source?: string; search?: string; companyType?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.segment) conditions.push(eq(leads.segment, filters.segment as any));
  if (filters?.status) conditions.push(eq(leads.status, filters.status as any));
  if (filters?.source) conditions.push(eq(leads.source, filters.source as any));
  if (filters?.companyType) conditions.push(eq(leads.companyType, filters.companyType as any));
  if (filters?.search) conditions.push(like(leads.company, `%${filters.search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(500);
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(lead);
  return result[0].insertId;
}

export async function createLeadsBulk(leadsData: InsertLead[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (leadsData.length === 0) return;
  // Duplicate detection: check existing emails and name+company combos
  const existing = await db.select({ email: leads.email, firstName: leads.firstName, lastName: leads.lastName, company: leads.company }).from(leads);
  const existingEmails = new Set(existing.filter(e => e.email).map(e => e.email!.toLowerCase()));
  const existingNameCompany = new Set(existing.map(e => `${(e.firstName || "").toLowerCase()}|${(e.lastName || "").toLowerCase()}|${(e.company || "").toLowerCase()}`));

  const newLeads = leadsData.filter(lead => {
    if (lead.email && existingEmails.has(lead.email.toLowerCase())) return false;
    const key = `${(lead.firstName || "").toLowerCase()}|${(lead.lastName || "").toLowerCase()}|${(lead.company || "").toLowerCase()}`;
    if (existingNameCompany.has(key)) return false;
    return true;
  });

  const duplicateCount = leadsData.length - newLeads.length;
  if (newLeads.length > 0) {
    // Apply consent expiry calculation to each lead
    const leadsWithConsent = newLeads.map(lead => {
      const basis = (lead.consentBasis || "none") as ConsentBasis;
      const obtainedAt = lead.consentObtainedAt || new Date();
      const expiresAt = calculateConsentExpiry(basis, obtainedAt);
      return {
        ...lead,
        consentBasis: basis,
        consentObtainedAt: obtainedAt,
        consentExpiresAt: expiresAt,
      };
    });
    await db.insert(leads).values(leadsWithConsent);

    // Record consent events for each imported lead
    const insertedLeads = await db.select({ id: leads.id, email: leads.email, consentBasis: leads.consentBasis })
      .from(leads)
      .orderBy(desc(leads.id))
      .limit(leadsWithConsent.length);
    for (const imported of insertedLeads) {
      if (imported.email) {
        await db.insert(consentEvents).values({
          leadId: imported.id,
          email: imported.email,
          eventType: "imported",
          consentBasis: imported.consentBasis as any,
          source: "bulk_import",
          recordedBy: "system",
        });
      }
    }
  }
  // Log the import activity
  await logActivity("leads_imported", `Imported ${newLeads.length} contacts${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ""}`, { total: leadsData.length, imported: newLeads.length, duplicates: duplicateCount });
  return { imported: newLeads.length, duplicates: duplicateCount };
}

export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If consent basis is being updated, recalculate expiry
  if (data.consentBasis) {
    const obtainedAt = data.consentObtainedAt || new Date();
    data.consentObtainedAt = obtainedAt;
    data.consentExpiresAt = calculateConsentExpiry(data.consentBasis as ConsentBasis, obtainedAt);
  }
  // Auto-suppress on bounce: if verificationStatus is being set to bounced, add to unsubscribes
  if (data.verificationStatus === "bounced") {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (lead?.email) {
      const [existing] = await db.select().from(unsubscribes).where(eq(unsubscribes.email, lead.email.toLowerCase())).limit(1);
      if (!existing) {
        await db.insert(unsubscribes).values({ email: lead.email.toLowerCase(), leadId: id, reason: "hard bounce" });
      }
      // Record consent event for bounce
      await db.insert(consentEvents).values({
        leadId: id,
        email: lead.email,
        eventType: "bounced",
        source: "auto_suppress",
        recordedBy: "system",
      });
    }
  }
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function updateLeadsBulk(ids: number[], data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set(data).where(inArray(leads.id, ids));
}

export async function getLeadStats() {
  const db = await getDb();
  if (!db) return { total: 0, bySegment: {}, byStatus: {}, bySource: {} };
  const all = await db.select().from(leads);
  const total = all.length;
  const bySegment: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  all.forEach(l => {
    bySegment[l.segment || 'unclassified'] = (bySegment[l.segment || 'unclassified'] || 0) + 1;
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    bySource[l.source || 'unknown'] = (bySource[l.source || 'unknown'] || 0) + 1;
  });
  return { total, bySegment, byStatus, bySource };
}

// ─── Campaigns ───────────────────────────────────────────────────────────────
export async function getCampaigns(track?: string) {
  const db = await getDb();
  if (!db) return [];
  const where = track ? eq(campaigns.track, track as any) : undefined;
  return db.select().from(campaigns).where(where).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(campaign: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaigns).values(campaign);
  return result[0].insertId;
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

// ─── Sequence Steps ──────────────────────────────────────────────────────────
export async function getSequenceSteps(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sequenceSteps).where(eq(sequenceSteps.campaignId, campaignId)).orderBy(asc(sequenceSteps.stepOrder));
}

export async function createSequenceStep(step: InsertSequenceStep) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sequenceSteps).values(step);
  return result[0].insertId;
}

export async function updateSequenceStep(id: number, data: Partial<InsertSequenceStep>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sequenceSteps).set(data).where(eq(sequenceSteps.id, id));
}

export async function deleteSequenceStep(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sequenceSteps).where(eq(sequenceSteps.id, id));
}

// ─── Campaign Leads ──────────────────────────────────────────────────────────
export async function enrollLeadsInCampaign(campaignId: number, leadIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values = leadIds.map(leadId => ({ campaignId, leadId }));
  await db.insert(campaignLeads).values(values);
  await db.update(campaigns).set({ totalLeads: sql`totalLeads + ${leadIds.length}` }).where(eq(campaigns.id, campaignId));
}

export async function getCampaignLeads(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignLeads).where(eq(campaignLeads.campaignId, campaignId));
}

// ─── Engagement Events ───────────────────────────────────────────────────────
export async function createEngagementEvent(event: InsertEngagementEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(engagementEvents).values(event);
}

export async function getEngagementEvents(filters?: { leadId?: number; campaignId?: number; eventType?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.leadId) conditions.push(eq(engagementEvents.leadId, filters.leadId));
  if (filters?.campaignId) conditions.push(eq(engagementEvents.campaignId, filters.campaignId));
  if (filters?.eventType) conditions.push(eq(engagementEvents.eventType, filters.eventType as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(engagementEvents).where(where).orderBy(desc(engagementEvents.occurredAt)).limit(1000);
}

export async function getEngagementStats(campaignId?: number) {
  const db = await getDb();
  if (!db) return { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 };
  const where = campaignId ? eq(engagementEvents.campaignId, campaignId) : undefined;
  const events = await db.select().from(engagementEvents).where(where);
  const stats = { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 };
  events.forEach(e => {
    if (e.eventType in stats) stats[e.eventType as keyof typeof stats]++;
  });
  return stats;
}

// ─── Salesforce Tasks ────────────────────────────────────────────────────────
export async function getSalesforceTasks(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const where = status ? eq(salesforceTasks.status, status as any) : undefined;
  return db.select().from(salesforceTasks).where(where).orderBy(desc(salesforceTasks.createdAt));
}

export async function createSalesforceTask(task: InsertSalesforceTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(salesforceTasks).values(task);
  return result[0].insertId;
}

export async function updateSalesforceTask(id: number, data: Partial<InsertSalesforceTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(salesforceTasks).set(data).where(eq(salesforceTasks.id, id));
}

// ─── Sending Domains ─────────────────────────────────────────────────────────
export async function getSendingDomains() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sendingDomains).orderBy(desc(sendingDomains.createdAt));
}

export async function createSendingDomain(domain: InsertSendingDomain) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sendingDomains).values(domain);
  return result[0].insertId;
}

export async function updateSendingDomain(id: number, data: Partial<InsertSendingDomain>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sendingDomains).set(data).where(eq(sendingDomains.id, id));
}

// ─── Rollout Milestones ──────────────────────────────────────────────────────
export async function getRolloutMilestones() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rolloutMilestones).orderBy(asc(rolloutMilestones.id));
}

export async function createRolloutMilestone(milestone: InsertRolloutMilestone) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rolloutMilestones).values(milestone);
  return result[0].insertId;
}

export async function updateRolloutMilestone(id: number, data: Partial<InsertRolloutMilestone>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rolloutMilestones).set(data).where(eq(rolloutMilestones.id, id));
}

// ─── Integration Configs ─────────────────────────────────────────────────────
export async function getIntegrationConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(integrationConfigs);
}

export async function upsertIntegrationConfig(provider: string, configData: Record<string, unknown>, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(integrationConfigs).where(eq(integrationConfigs.provider, provider as any)).limit(1);
  if (existing.length > 0) {
    await db.update(integrationConfigs).set({ configData, isActive }).where(eq(integrationConfigs.id, existing[0].id));
  } else {
    await db.insert(integrationConfigs).values({ provider: provider as any, configData, isActive });
  }
}

// ─── Activity Log ────────────────────────────────────────────────────────────
export async function logActivity(action: string, description: string, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values({ action, description, metadata });
}

export async function getActivityLog(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
}

// ─── Unsubscribes ────────────────────────────────────────────────────────────
export async function addUnsubscribe(email: string, leadId?: number, reason?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(unsubscribes).values({ email: email.toLowerCase(), leadId, reason }).onDuplicateKeyUpdate({ set: { reason } });
  await logActivity("unsubscribe", `${email} unsubscribed${reason ? `: ${reason}` : ""}`, { email, leadId });
}

export async function getUnsubscribes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(unsubscribes).orderBy(desc(unsubscribes.unsubscribedAt));
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("[CASL Compliance] Database unavailable — cannot verify unsubscribe status. Send blocked.");
  const result = await db.select().from(unsubscribes).where(eq(unsubscribes.email, email.toLowerCase())).limit(1);
  return result.length > 0;
}
import { calculateConsentExpiry, type ConsentBasis } from "../shared/consent";
import { consentEvents } from "../drizzle/schema";
