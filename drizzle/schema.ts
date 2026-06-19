import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, bigint } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Leads ───────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  jobTitle: varchar("jobTitle", { length: 256 }),
  company: varchar("company", { length: 256 }),
  companyType: mysqlEnum("companyType", ["municipality", "general_contractor", "home_builder", "civil", "other"]).default("other"),
  city: varchar("city", { length: 128 }),
  province: varchar("province", { length: 64 }).default("Alberta"),
  region: mysqlEnum("region", ["edmonton", "calgary", "red_deer", "other"]).default("other"),
  source: mysqlEnum("source", ["scotts_directories", "linkedin", "manual", "import", "web_search"]).default("manual"),
  sourceUrl: text("sourceUrl"),
  segment: mysqlEnum("segment", ["existing_customer", "new_local", "new_national"]),
  status: mysqlEnum("status", ["new", "verified", "contacted", "qualified", "warm", "hot", "converted", "archived"]).default("new").notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "bounced", "invalid"]).default("pending"),
  tags: json("tags").$type<string[]>(),
  notes: text("notes"),
  linkedinUrl: text("linkedinUrl"),
  engagementScore: int("engagementScore").default(0),
  lastContactedAt: timestamp("lastContactedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Campaigns ───────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  track: mysqlEnum("track", ["existing_customers", "new_local", "new_national"]).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  description: text("description"),
  sendingDomain: varchar("sendingDomain", { length: 256 }),
  fromName: varchar("fromName", { length: 128 }),
  fromEmail: varchar("fromEmail", { length: 320 }),
  totalLeads: int("totalLeads").default(0),
  sentCount: int("sentCount").default(0),
  openCount: int("openCount").default(0),
  clickCount: int("clickCount").default(0),
  replyCount: int("replyCount").default(0),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Sequence Steps ──────────────────────────────────────────────────────────
export const sequenceSteps = mysqlTable("sequence_steps", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  stepOrder: int("stepOrder").notNull(),
  subject: varchar("subject", { length: 512 }),
  body: text("body"),
  delayDays: int("delayDays").default(0),
  stepType: mysqlEnum("stepType", ["email", "follow_up", "final"]).default("email"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type InsertSequenceStep = typeof sequenceSteps.$inferInsert;

// ─── Campaign Leads (junction) ───────────────────────────────────────────────
export const campaignLeads = mysqlTable("campaign_leads", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  leadId: int("leadId").notNull(),
  currentStep: int("currentStep").default(1),
  status: mysqlEnum("status", ["queued", "active", "completed", "unsubscribed", "bounced"]).default("queued").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  lastSentAt: timestamp("lastSentAt"),
  completedAt: timestamp("completedAt"),
});

export type CampaignLead = typeof campaignLeads.$inferSelect;
export type InsertCampaignLead = typeof campaignLeads.$inferInsert;

// ─── Engagement Events ───────────────────────────────────────────────────────
export const engagementEvents = mysqlTable("engagement_events", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  campaignId: int("campaignId"),
  stepId: int("stepId"),
  eventType: mysqlEnum("eventType", ["sent", "opened", "clicked", "replied", "bounced", "unsubscribed"]).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

export type EngagementEvent = typeof engagementEvents.$inferSelect;
export type InsertEngagementEvent = typeof engagementEvents.$inferInsert;

// ─── Salesforce Tasks ────────────────────────────────────────────────────────
export const salesforceTasks = mysqlTable("salesforce_tasks", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  taskType: mysqlEnum("taskType", ["call", "follow_up", "meeting"]).default("call").notNull(),
  subject: varchar("subject", { length: 512 }),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  status: mysqlEnum("status", ["pending", "synced", "failed", "completed"]).default("pending").notNull(),
  salesforceId: varchar("salesforceId", { length: 64 }),
  syncedAt: timestamp("syncedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SalesforceTask = typeof salesforceTasks.$inferSelect;
export type InsertSalesforceTask = typeof salesforceTasks.$inferInsert;

// ─── Sending Domains ─────────────────────────────────────────────────────────
export const sendingDomains = mysqlTable("sending_domains", {
  id: int("id").autoincrement().primaryKey(),
  domain: varchar("domain", { length: 256 }).notNull(),
  status: mysqlEnum("status", ["pending", "warming", "active", "paused", "blacklisted"]).default("pending").notNull(),
  spfVerified: boolean("spfVerified").default(false),
  dkimVerified: boolean("dkimVerified").default(false),
  dmarcVerified: boolean("dmarcVerified").default(false),
  warmupDay: int("warmupDay").default(0),
  dailySendLimit: int("dailySendLimit").default(50),
  totalSent: int("totalSent").default(0),
  bounceRate: int("bounceRate").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SendingDomain = typeof sendingDomains.$inferSelect;
export type InsertSendingDomain = typeof sendingDomains.$inferInsert;

// ─── Rollout Milestones ──────────────────────────────────────────────────────
export const rolloutMilestones = mysqlTable("rollout_milestones", {
  id: int("id").autoincrement().primaryKey(),
  phase: mysqlEnum("phase", ["poc", "staged_beta", "full_alberta_rollout"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  targetDate: timestamp("targetDate"),
  completedDate: timestamp("completedDate"),
  leadsProcessed: int("leadsProcessed").default(0),
  emailsSent: int("emailsSent").default(0),
  openRate: int("openRate").default(0),
  clickRate: int("clickRate").default(0),
  warmLeads: int("warmLeads").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RolloutMilestone = typeof rolloutMilestones.$inferSelect;
export type InsertRolloutMilestone = typeof rolloutMilestones.$inferInsert;

// ─── Salesforce Config ───────────────────────────────────────────────────────
export const integrationConfigs = mysqlTable("integration_configs", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["salesforce", "scotts_directories", "linkedin", "email_provider"]).notNull(),
  configData: json("configData").$type<Record<string, unknown>>(),
  isActive: boolean("isActive").default(false),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = typeof integrationConfigs.$inferInsert;
