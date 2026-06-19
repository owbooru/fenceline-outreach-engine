import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "rob@fenceline.ca",
    name: "Rob McMullen",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Rob McMullen");
    expect(result?.email).toBe("rob@fenceline.ca");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("leads router", () => {
  it("list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats returns expected shape", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.stats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("bySegment");
    expect(result).toHaveProperty("byStatus");
    expect(result).toHaveProperty("bySource");
    expect(typeof result.total).toBe("number");
  });
});

describe("campaigns router", () => {
  it("list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("engagement router", () => {
  it("stats returns expected shape", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.engagement.stats({});
    expect(result).toHaveProperty("sent");
    expect(result).toHaveProperty("opened");
    expect(result).toHaveProperty("clicked");
    expect(result).toHaveProperty("replied");
    expect(result).toHaveProperty("bounced");
  });

  it("events returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.engagement.events({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("salesforce router", () => {
  it("tasks returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.salesforce.tasks({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("domains router", () => {
  it("list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.domains.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("rollout router", () => {
  it("milestones returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rollout.milestones();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("integrations router", () => {
  it("list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
