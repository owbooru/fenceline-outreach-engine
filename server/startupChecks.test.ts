import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnvironment } from "./startupChecks";
import express from "express";
import request from "supertest";

describe("Startup Checks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set all required vars to valid values
    process.env.DATABASE_URL = "mysql://test:test@localhost:3306/test";
    process.env.JWT_SECRET = "test-secret-minimum-32-chars-long-here";
    process.env.APP_ACCESS_PASSWORD = "Fenceline!";
    process.env.CASL_SENDER_NAME = "Rob McMullen";
    process.env.CASL_BUSINESS_NAME = "FenceLine Rentals";
    process.env.CASL_MAILING_ADDRESS = "9871 279 St #112, Acheson, AB T7X 6J4";
    process.env.CASL_CONTACT_EMAIL = "info@fenceline.ca";
    process.env.CASL_CONTACT_PHONE = "(780) 720-6300";
    process.env.CASL_CONTACT_WEB = "https://fenceline.ca";
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it("passes when all required variables are set", () => {
    const errors = validateEnvironment();
    expect(errors).toHaveLength(0);
  });

  it("fails when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    const errors = validateEnvironment();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes("DATABASE_URL"))).toBe(true);
  });

  it("fails when CASL_SENDER_NAME is missing", () => {
    delete process.env.CASL_SENDER_NAME;
    const errors = validateEnvironment();
    expect(errors.some(e => e.includes("CASL_SENDER_NAME"))).toBe(true);
  });

  it("fails when CASL_BUSINESS_NAME is empty string", () => {
    process.env.CASL_BUSINESS_NAME = "";
    const errors = validateEnvironment();
    expect(errors.some(e => e.includes("CASL_BUSINESS_NAME"))).toBe(true);
  });

  it("fails when both CASL_CONTACT_PHONE and CASL_CONTACT_WEB are missing", () => {
    delete process.env.CASL_CONTACT_PHONE;
    delete process.env.CASL_CONTACT_WEB;
    const errors = validateEnvironment();
    expect(errors.some(e => e.includes("CASL_CONTACT_PHONE or CASL_CONTACT_WEB"))).toBe(true);
  });

  it("passes when only CASL_CONTACT_PHONE is set (no web)", () => {
    delete process.env.CASL_CONTACT_WEB;
    const errors = validateEnvironment();
    expect(errors).toHaveLength(0);
  });

  it("passes when only CASL_CONTACT_WEB is set (no phone)", () => {
    delete process.env.CASL_CONTACT_PHONE;
    const errors = validateEnvironment();
    expect(errors).toHaveLength(0);
  });

  it("reports multiple missing variables at once", () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.CASL_SENDER_NAME;
    const errors = validateEnvironment();
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Health endpoint", () => {
  it("does not expose secret values", async () => {
    // Import after env is set
    const { getComplianceState } = await import("./startupChecks");
    const app = express();
    app.get("/api/health", (_req, res) => {
      const state = getComplianceState();
      res.json({
        status: "ok",
        database: { engine: state.databaseEngine, connected: state.databaseConnected },
        compliance: {
          triggersPresent: state.triggersPresent,
          senderIdentificationConfigured: state.senderIdentificationConfigured,
          enforcementLevel: state.enforcementLevel,
        },
      });
    });

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);

    // Must not contain any secret/credential values
    expect(body).not.toContain("Fenceline!");
    expect(body).not.toContain("mysql://");
    expect(body).not.toContain("test-secret");
    expect(body).not.toContain("Rob McMullen");
    expect(body).not.toContain("info@fenceline.ca");
    expect(body).not.toContain("780");

    // Must contain expected structure
    expect(res.body.status).toBe("ok");
    expect(res.body.compliance).toHaveProperty("enforcementLevel");
    expect(res.body.compliance).toHaveProperty("triggersPresent");
    expect(res.body.compliance).toHaveProperty("senderIdentificationConfigured");
    expect(res.body.database).toHaveProperty("engine");
    expect(res.body.database).toHaveProperty("connected");
  });

  it("reports enforcementLevel correctly based on state", async () => {
    const { getComplianceState } = await import("./startupChecks");
    const state = getComplianceState();
    // In test environment (TiDB or no DB), enforcement should be "application"
    expect(["database", "application"]).toContain(state.enforcementLevel);
    if (state.triggersPresent) {
      expect(state.enforcementLevel).toBe("database");
    } else {
      expect(state.enforcementLevel).toBe("application");
    }
  });
});
