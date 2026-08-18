/**
 * Send-path regression test.
 *
 * Purpose: Prove that the real send path (sendEmail) cannot deliver an email
 * without assertSendable() having passed. This catches the exact failure that
 * occurred previously: a send path existing that bypasses the compliance gate.
 *
 * Strategy: We mock nodemailer so no real email is sent, but we exercise the
 * actual sendEmail() function. We verify:
 * 1. A lead with consentBasis="none" is BLOCKED (assertSendable rejects it).
 * 2. A lead with valid consent PASSES assertSendable and reaches sendMail.
 * 3. If assertSendable is removed/bypassed, the "none" consent lead would
 *    reach sendMail — which this test catches as a failure.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock nodemailer before importing emailSender
const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-123" });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: mockSendMail }),
  },
}));

// Mock the database layer
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: () => ({ from: mockFrom }),
    insert: () => ({ values: mockValues }),
  }),
  createEngagementEvent: vi.fn().mockResolvedValue(undefined),
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Set up SMTP env vars so getEmailConfig() returns a valid config
process.env.SMTP_HOST = "smtp.test.local";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "test@test.local";
process.env.SMTP_PASS = "testpass";
process.env.SMTP_FROM_NAME = "Test Sender";
process.env.SMTP_FROM_EMAIL = "test@test.local";
process.env.APP_URL = "http://localhost:3000";
process.env.CASL_SENDER_NAME = "Test Sender";
process.env.CASL_BUSINESS_NAME = "Test Co";
process.env.CASL_MAILING_ADDRESS = "123 Test St";
process.env.CASL_CONTACT_EMAIL = "test@test.local";
process.env.CASL_CONTACT_PHONE = "555-0000";

// Now import the real sendEmail
import { sendEmail } from "./emailSender";

describe("Send path regression: assertSendable gate", () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockValues.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("BLOCKS send when lead has consentBasis='none' — assertSendable rejects", async () => {
    // Lead with no consent
    const leadNoConsent = {
      id: 1,
      email: "blocked@example.com",
      firstName: "Test",
      lastName: "User",
      company: "TestCo",
      consentBasis: "none",
      consentExpiresAt: null,
      verificationStatus: "pending",
    };

    // DB returns this lead when looked up
    mockLimit.mockResolvedValue([leadNoConsent]);

    const result = await sendEmail({
      to: "blocked@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      leadId: 1,
      campaignId: 1,
      stepId: 1,
      sender: { profileId: 1, senderName: "Test Sender", senderEmail: "test@test.local", senderTitle: null },
    });

    // The send must be blocked
    expect(result.success).toBe(false);
    expect(result.error).toContain("[CASL]");
    expect(result.error).toContain("consent");

    // sendMail must NOT have been called — the gate stopped it
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("BLOCKS send when lead has expired implied consent", async () => {
    const leadExpired = {
      id: 2,
      email: "expired@example.com",
      firstName: "Expired",
      lastName: "Lead",
      company: "OldCo",
      consentBasis: "implied_business_relationship",
      consentExpiresAt: new Date("2020-01-01"), // long expired
      verificationStatus: "verified",
    };

    mockLimit.mockResolvedValue([leadExpired]);

    const result = await sendEmail({
      to: "expired@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      leadId: 2,
      campaignId: 1,
      stepId: 1,
      sender: { profileId: 1, senderName: "Test Sender", senderEmail: "test@test.local", senderTitle: null },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("[CASL]");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("BLOCKS send when lead has verificationStatus='bounced'", async () => {
    const leadBounced = {
      id: 3,
      email: "bounced@example.com",
      firstName: "Bounced",
      lastName: "Lead",
      company: "BounceCo",
      consentBasis: "express",
      consentExpiresAt: null,
      verificationStatus: "bounced",
    };

    mockLimit.mockResolvedValue([leadBounced]);

    const result = await sendEmail({
      to: "bounced@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      leadId: 3,
      campaignId: 1,
      stepId: 1,
      sender: { profileId: 1, senderName: "Test Sender", senderEmail: "test@test.local", senderTitle: null },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("[CASL]");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("ALLOWS send when lead has valid express consent and reaches sendMail", async () => {
    const leadValid = {
      id: 4,
      email: "valid@example.com",
      firstName: "Valid",
      lastName: "Lead",
      company: "GoodCo",
      consentBasis: "express",
      consentExpiresAt: null,
      verificationStatus: "verified",
    };

    // First call: lead lookup in sendEmail
    // Second call: unsubscribe check in assertSendable (returns empty = not unsubscribed)
    mockLimit
      .mockResolvedValueOnce([leadValid])  // lead lookup
      .mockResolvedValueOnce([]);           // unsubscribe check (none found)

    const result = await sendEmail({
      to: "valid@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      leadId: 4,
      campaignId: 1,
      stepId: 1,
      sender: { profileId: null, senderName: "Test Sender", senderEmail: "test@test.local", senderTitle: null },
    });

    // The send must succeed — assertSendable passed, sendMail was called
    expect(result.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "valid@example.com",
        subject: "Test",
      })
    );
  });

  it("BLOCKS send when lead is on unsubscribe list", async () => {
    const leadUnsub = {
      id: 5,
      email: "unsub@example.com",
      firstName: "Unsub",
      lastName: "Lead",
      company: "UnsubCo",
      consentBasis: "express",
      consentExpiresAt: null,
      verificationStatus: "verified",
    };

    // First call: lead lookup
    // Second call: unsubscribe check (found = blocked)
    mockLimit
      .mockResolvedValueOnce([leadUnsub])
      .mockResolvedValueOnce([{ id: 1, email: "unsub@example.com" }]);

    const result = await sendEmail({
      to: "unsub@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      leadId: 5,
      campaignId: 1,
      stepId: 1,
      sender: { profileId: 1, senderName: "Test Sender", senderEmail: "test@test.local", senderTitle: null },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("[CASL]");
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
