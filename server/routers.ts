import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { searchWebForLeads } from "./webSearch";
import { scrapeLinkedIn } from "./linkedinScraper";
import { sendCampaignStep, getQueueStatus, getEmailConfig } from "./emailSender";
import { handleReply } from "./replyDetector";
import { getDb } from "./db";
import { senderProfiles } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Leads ─────────────────────────────────────────────────────────────────
  leads: router({
    list: publicProcedure
      .input(z.object({
        segment: z.string().optional(),
        status: z.string().optional(),
        source: z.string().optional(),
        search: z.string().optional(),
        companyType: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getLeads(input)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getLeadById(input.id)),

    create: publicProcedure
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        jobTitle: z.string().optional(),
        company: z.string().optional(),
        companyType: z.enum(["municipality", "general_contractor", "home_builder", "civil", "other"]).optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        region: z.enum(["edmonton", "calgary", "red_deer", "other"]).optional(),
        source: z.enum(["scotts_directories", "linkedin", "manual", "import", "web_search"]).optional(),
        sourceUrl: z.string().optional(),
        segment: z.enum(["existing_customer", "new_local", "new_national"]).optional(),
        linkedinUrl: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLead(input as any);
        return { id };
      }),

    createBulk: publicProcedure
      .input(z.object({
        leads: z.array(z.object({
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          jobTitle: z.string().optional(),
          company: z.string().optional(),
          companyType: z.enum(["municipality", "general_contractor", "home_builder", "civil", "other"]).optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          region: z.enum(["edmonton", "calgary", "red_deer", "other"]).optional(),
          source: z.enum(["scotts_directories", "linkedin", "manual", "import", "web_search"]).optional(),
          sourceUrl: z.string().optional(),
          segment: z.enum(["existing_customer", "new_local", "new_national"]).optional(),
          linkedinUrl: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }))
      }))
      .mutation(async ({ input }) => {
        await db.createLeadsBulk(input.leads as any);
        return { count: input.leads.length };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          jobTitle: z.string().optional(),
          company: z.string().optional(),
          companyType: z.enum(["municipality", "general_contractor", "home_builder", "civil", "other"]).optional(),
          city: z.string().optional(),
          segment: z.enum(["existing_customer", "new_local", "new_national"]).optional(),
          status: z.enum(["new", "verified", "contacted", "qualified", "warm", "hot", "converted", "archived"]).optional(),
          verificationStatus: z.enum(["pending", "verified", "bounced", "invalid"]).optional(),
          tags: z.array(z.string()).optional(),
          notes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateLead(input.id, input.data as any);
        return { success: true };
      }),

    bulkUpdate: publicProcedure
      .input(z.object({
        ids: z.array(z.number()),
        data: z.object({
          status: z.enum(["new", "verified", "contacted", "qualified", "warm", "hot", "converted", "archived"]).optional(),
          segment: z.enum(["existing_customer", "new_local", "new_national"]).optional(),
          tags: z.array(z.string()).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateLeadsBulk(input.ids, input.data as any);
        return { success: true };
      }),

    stats: publicProcedure.query(() => db.getLeadStats()),
  }),

  // ─── Campaigns ─────────────────────────────────────────────────────────────
  campaigns: router({
    list: publicProcedure
      .input(z.object({ track: z.string().optional() }).optional())
      .query(({ input }) => db.getCampaigns(input?.track)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const campaign = await db.getCampaignById(input.id);
        const steps = await db.getSequenceSteps(input.id);
        return { campaign, steps };
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string(),
        track: z.enum(["existing_customers", "new_local", "new_national"]),
        description: z.string().optional(),
        sendingDomain: z.string().optional(),
        fromName: z.string().optional(),
        fromEmail: z.string().optional(),
        senderProfileId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCampaign(input as any);
        await db.logActivity("campaign_created", `Campaign "${input.name}" created (${input.track} track)`, { campaignId: id, track: input.track });
        return { id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          status: z.enum(["draft", "active", "paused", "completed"]).optional(),
          description: z.string().optional(),
          sendingDomain: z.string().optional(),
          fromName: z.string().optional(),
          fromEmail: z.string().optional(),
          scheduledAt: z.string().optional(),
          senderProfileId: z.number().nullable().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const data: any = { ...input.data };
        if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);
        if (data.status === 'active') data.startedAt = new Date();
        await db.updateCampaign(input.id, data);
        if (input.data.status) {
          await db.logActivity(`campaign_${input.data.status}`, `Campaign #${input.id} status changed to ${input.data.status}`, { campaignId: input.id, status: input.data.status });
        }
        return { success: true };
      }),

    enrollLeads: publicProcedure
      .input(z.object({
        campaignId: z.number(),
        leadIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.enrollLeadsInCampaign(input.campaignId, input.leadIds);
        return { success: true, enrolled: input.leadIds.length };
      }),

    getLeads: publicProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(({ input }) => db.getCampaignLeads(input.campaignId)),

    unenrollLead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const { campaignLeads } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await database.delete(campaignLeads).where(eq(campaignLeads.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Sequence Steps ────────────────────────────────────────────────────────
  sequences: router({
    list: publicProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(({ input }) => db.getSequenceSteps(input.campaignId)),

    create: publicProcedure
      .input(z.object({
        campaignId: z.number(),
        stepOrder: z.number(),
        subject: z.string().optional(),
        body: z.string().optional(),
        delayDays: z.number().optional(),
        stepType: z.enum(["email", "follow_up", "final"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSequenceStep(input as any);
        return { id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          subject: z.string().optional(),
          body: z.string().optional(),
          delayDays: z.number().optional(),
          stepType: z.enum(["email", "follow_up", "final"]).optional(),
          stepOrder: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateSequenceStep(input.id, input.data as any);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSequenceStep(input.id);
        return { success: true };
      }),
  }),

  // ─── Engagement ────────────────────────────────────────────────────────────
  engagement: router({
    events: publicProcedure
      .input(z.object({
        leadId: z.number().optional(),
        campaignId: z.number().optional(),
        eventType: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getEngagementEvents(input)),

    stats: publicProcedure
      .input(z.object({ campaignId: z.number().optional() }).optional())
      .query(({ input }) => db.getEngagementStats(input?.campaignId)),

    record: publicProcedure
      .input(z.object({
        leadId: z.number(),
        campaignId: z.number().optional(),
        stepId: z.number().optional(),
        eventType: z.enum(["sent", "opened", "clicked", "replied", "bounced", "unsubscribed"]),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createEngagementEvent(input as any);
        return { success: true };
      }),
  }),

  // ─── Salesforce ────────────────────────────────────────────────────────────
  salesforce: router({
    tasks: publicProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.getSalesforceTasks(input?.status)),

    createTask: publicProcedure
      .input(z.object({
        leadId: z.number(),
        taskType: z.enum(["call", "follow_up", "meeting"]).optional(),
        subject: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSalesforceTask(input as any);
        return { id };
      }),

    updateTask: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["pending", "synced", "failed", "completed"]).optional(),
          salesforceId: z.string().optional(),
          errorMessage: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateSalesforceTask(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ─── Sending Domains ───────────────────────────────────────────────────────
  domains: router({
    list: publicProcedure.query(() => db.getSendingDomains()),

    create: publicProcedure
      .input(z.object({
        domain: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSendingDomain(input as any);
        return { id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["pending", "warming", "active", "paused", "blacklisted"]).optional(),
          spfVerified: z.boolean().optional(),
          dkimVerified: z.boolean().optional(),
          dmarcVerified: z.boolean().optional(),
          warmupDay: z.number().optional(),
          dailySendLimit: z.number().optional(),
          notes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateSendingDomain(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ─── Rollout Milestones ────────────────────────────────────────────────────
  rollout: router({
    milestones: publicProcedure.query(() => db.getRolloutMilestones()),

    create: publicProcedure
      .input(z.object({
        phase: z.enum(["poc", "staged_beta", "full_alberta_rollout"]),
        title: z.string(),
        description: z.string().optional(),
        targetDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const data: any = { ...input };
        if (data.targetDate) data.targetDate = new Date(data.targetDate);
        const id = await db.createRolloutMilestone(data);
        return { id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["not_started", "in_progress", "completed"]).optional(),
          completedDate: z.string().optional(),
          leadsProcessed: z.number().optional(),
          emailsSent: z.number().optional(),
          openRate: z.number().optional(),
          clickRate: z.number().optional(),
          warmLeads: z.number().optional(),
          notes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const data: any = { ...input.data };
        if (data.completedDate) data.completedDate = new Date(data.completedDate);
        await db.updateRolloutMilestone(input.id, data);
        return { success: true };
      }),
  }),

  // ─── Integration Configs ───────────────────────────────────────────────────
  integrations: router({
    list: publicProcedure.query(() => db.getIntegrationConfigs()),

    upsert: publicProcedure
      .input(z.object({
        provider: z.enum(["salesforce", "scotts_directories", "linkedin", "email_provider"]),
        configData: z.record(z.string(), z.unknown()),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertIntegrationConfig(input.provider, input.configData, input.isActive);
        return { success: true };
      }),
  }),

  // ─── Web Search ─────────────────────────────────────────────────────────────
  webSearch: router({
    search: publicProcedure
      .input(z.object({
        criteria: z.string(),
        region: z.string(),
        industry: z.string(),
        customKeywords: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const results = await searchWebForLeads(input);
        return { results };
      }),
  }),

  // ─── LinkedIn Scraper ──────────────────────────────────────────────────────────
  linkedin: router({
    scrape: publicProcedure
      .input(z.object({
        jobTitle: z.string(),
        company: z.string(),
        region: z.string(),
        industry: z.string(),
        keywords: z.string(),
      }))
      .mutation(async ({ input }) => {
        const results = await scrapeLinkedIn(input);
        return { results };
      }),
  }),

  // ─── Activity Log ──────────────────────────────────────────────────────────
  activity: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(({ input }) => db.getActivityLog(input?.limit)),
  }),

  // ─── Unsubscribes ─────────────────────────────────────────────────────────
  unsubscribes: router({
    list: publicProcedure.query(() => db.getUnsubscribes()),

    add: publicProcedure
      .input(z.object({
        email: z.string(),
        leadId: z.number().optional(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.addUnsubscribe(input.email, input.leadId, input.reason);
        return { success: true };
      }),

    check: publicProcedure
      .input(z.object({ email: z.string() }))
      .query(({ input }) => db.isUnsubscribed(input.email)),
  }),

  // ─── Email Sending ──────────────────────────────────────────────────────────
  email: router({
    status: publicProcedure.query(() => {
      const config = getEmailConfig();
      const queueStatus = getQueueStatus();
      return { configured: !!config, ...queueStatus };
    }),
    sendStep: publicProcedure
      .input(z.object({ campaignId: z.number(), stepId: z.number() }))
      .mutation(async ({ input }) => {
        return sendCampaignStep(input.campaignId, input.stepId);
      }),
  }),

  // ─── Consent Events (read-only compliance log) ─────────────────────────────
  consent: router({
    events: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];
        const { consentEvents } = await import("../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        return database.select().from(consentEvents).orderBy(desc(consentEvents.recordedAt)).limit(input?.limit || 100);
      }),
    // Get sendable count for a campaign (how many enrolled leads pass assertSendable)
    sendableCount: publicProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return { total: 0, sendable: 0, excluded: 0, reasons: [] as string[] };
        const { campaignLeads, leads } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const { checkSendable } = await import("./caslCompliance");
        const enrolled = await database.select().from(campaignLeads).where(
          and(eq(campaignLeads.campaignId, input.campaignId), eq(campaignLeads.status, "active"))
        );
        let sendable = 0;
        let excluded = 0;
        const reasons: string[] = [];
        for (const enrollment of enrolled) {
          const [lead] = await database.select().from(leads).where(eq(leads.id, enrollment.leadId)).limit(1);
          if (!lead) { excluded++; reasons.push("Lead not found"); continue; }
          const result = await checkSendable(lead);
          if (result.sendable) { sendable++; } else { excluded++; if (result.reason) reasons.push(result.reason); }
        }
        return { total: enrolled.length, sendable, excluded, reasons: Array.from(new Set(reasons)) };
      }),
  }),

  // ─── Sender Profiles ──────────────────────────────────────────────────────
  senderProfiles: router({
    list: publicProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];
      return database.select().from(senderProfiles).orderBy(desc(senderProfiles.createdAt));
    }),

    create: publicProcedure
      .input(z.object({
        senderName: z.string().min(1),
        senderEmail: z.string().email(),
        senderTitle: z.string().optional(),
        tone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        const result = await database.insert(senderProfiles).values(input as any);
        return { id: (result as any)[0]?.insertId || 0 };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          senderName: z.string().min(1).optional(),
          senderEmail: z.string().email().optional(),
          senderTitle: z.string().optional(),
          tone: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        await database.update(senderProfiles).set(input.data as any).where(eq(senderProfiles.id, input.id));
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        await database.delete(senderProfiles).where(eq(senderProfiles.id, input.id));
        return { success: true };
      }),
  }),

});

export type AppRouter = typeof appRouter;
