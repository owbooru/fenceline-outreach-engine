import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { searchWebForLeads } from "./webSearch";

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
    list: protectedProcedure
      .input(z.object({
        segment: z.string().optional(),
        status: z.string().optional(),
        source: z.string().optional(),
        search: z.string().optional(),
        companyType: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getLeads(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getLeadById(input.id)),

    create: protectedProcedure
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

    createBulk: protectedProcedure
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

    update: protectedProcedure
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

    bulkUpdate: protectedProcedure
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

    stats: protectedProcedure.query(() => db.getLeadStats()),
  }),

  // ─── Campaigns ─────────────────────────────────────────────────────────────
  campaigns: router({
    list: protectedProcedure
      .input(z.object({ track: z.string().optional() }).optional())
      .query(({ input }) => db.getCampaigns(input?.track)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const campaign = await db.getCampaignById(input.id);
        const steps = await db.getSequenceSteps(input.id);
        return { campaign, steps };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        track: z.enum(["existing_customers", "new_local", "new_national"]),
        description: z.string().optional(),
        sendingDomain: z.string().optional(),
        fromName: z.string().optional(),
        fromEmail: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCampaign(input as any);
        return { id };
      }),

    update: protectedProcedure
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
        }),
      }))
      .mutation(async ({ input }) => {
        const data: any = { ...input.data };
        if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);
        if (data.status === 'active') data.startedAt = new Date();
        await db.updateCampaign(input.id, data);
        return { success: true };
      }),

    enrollLeads: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        leadIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.enrollLeadsInCampaign(input.campaignId, input.leadIds);
        return { success: true };
      }),

    getLeads: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(({ input }) => db.getCampaignLeads(input.campaignId)),
  }),

  // ─── Sequence Steps ────────────────────────────────────────────────────────
  sequences: router({
    list: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(({ input }) => db.getSequenceSteps(input.campaignId)),

    create: protectedProcedure
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

    update: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSequenceStep(input.id);
        return { success: true };
      }),
  }),

  // ─── Engagement ────────────────────────────────────────────────────────────
  engagement: router({
    events: protectedProcedure
      .input(z.object({
        leadId: z.number().optional(),
        campaignId: z.number().optional(),
        eventType: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getEngagementEvents(input)),

    stats: protectedProcedure
      .input(z.object({ campaignId: z.number().optional() }).optional())
      .query(({ input }) => db.getEngagementStats(input?.campaignId)),

    record: protectedProcedure
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
    tasks: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.getSalesforceTasks(input?.status)),

    createTask: protectedProcedure
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

    updateTask: protectedProcedure
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
    list: protectedProcedure.query(() => db.getSendingDomains()),

    create: protectedProcedure
      .input(z.object({
        domain: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSendingDomain(input as any);
        return { id };
      }),

    update: protectedProcedure
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
    milestones: protectedProcedure.query(() => db.getRolloutMilestones()),

    create: protectedProcedure
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

    update: protectedProcedure
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
    list: protectedProcedure.query(() => db.getIntegrationConfigs()),

    upsert: protectedProcedure
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
    search: protectedProcedure
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
});

export type AppRouter = typeof appRouter;
