import { describe, it, expect, vi, beforeEach } from "vitest";

// Set the env var before importing the module
process.env.APP_ACCESS_PASSWORD = "Fenceline!";
process.env.JWT_SECRET = "test-secret-minimum-32-chars-long-here";

import express from "express";
import request from "supertest";
import { registerAccessGate, accessGateMiddleware } from "./accessGate";

function createTestApp() {
  const app = express();
  app.use(express.json());
  registerAccessGate(app);
  app.use(accessGateMiddleware());
  // A protected test endpoint
  app.get("/api/trpc/test", (_req, res) => {
    res.json({ data: "protected" });
  });
  // A tracking endpoint that should be unprotected
  app.get("/api/track/open", (_req, res) => {
    res.json({ data: "tracking" });
  });
  return app;
}

describe("Access Gate — server-side password enforcement", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  it("rejects incorrect password with 401", async () => {
    const res = await request(app)
      .post("/api/access/login")
      .send({ password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Incorrect");
  });

  it("accepts correct password and sets cookie", async () => {
    const res = await request(app)
      .post("/api/access/login")
      .send({ password: "Fenceline!" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should set the fenceline_access cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain("fenceline_access=");
  });

  it("blocks /api/trpc without access cookie", async () => {
    const res = await request(app).get("/api/trpc/test");
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Access denied");
  });

  it("allows /api/trpc with valid access cookie", async () => {
    // Login first
    const loginRes = await request(app)
      .post("/api/access/login")
      .send({ password: "Fenceline!" });
    const cookies = loginRes.headers["set-cookie"];
    const cookieHeader = cookies[0].split(";")[0]; // "fenceline_access=..."

    // Access protected route with cookie
    const res = await request(app)
      .get("/api/trpc/test")
      .set("Cookie", cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.data).toBe("protected");
  });

  it("allows /api/track/* without access cookie (tracking routes are public)", async () => {
    const res = await request(app).get("/api/track/open");
    expect(res.status).toBe(200);
    expect(res.body.data).toBe("tracking");
  });

  it("GET /api/access/status returns authenticated:false without cookie", async () => {
    const res = await request(app).get("/api/access/status");
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
  });

  it("GET /api/access/status returns authenticated:true with valid cookie", async () => {
    const loginRes = await request(app)
      .post("/api/access/login")
      .send({ password: "Fenceline!" });
    const cookies = loginRes.headers["set-cookie"];
    const cookieHeader = cookies[0].split(";")[0];

    const res = await request(app)
      .get("/api/access/status")
      .set("Cookie", cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
  });

  it("POST /api/access/logout clears the cookie", async () => {
    const res = await request(app).post("/api/access/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const cookies = res.headers["set-cookie"];
    // Cookie should be cleared (expires in the past or empty value)
    expect(cookies[0]).toContain("fenceline_access=");
  });
});
