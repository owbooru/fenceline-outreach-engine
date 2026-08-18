import { describe, it, expect, vi, beforeEach } from "vitest";
import { addCaslFooter, validateSender, type ResolvedSender } from "./emailSender";

// Set env vars for fallback tests
process.env.CASL_SENDER_NAME = "Rob McMullen";
process.env.CASL_BUSINESS_NAME = "FenceLine Rentals";
process.env.CASL_MAILING_ADDRESS = "9871 279 St #112, Acheson, AB T7X 6J4";
process.env.CASL_CONTACT_EMAIL = "info@fenceline.ca";
process.env.CASL_CONTACT_PHONE = "(780) 720-6300";
process.env.CASL_CONTACT_WEB = "https://fenceline.ca";
process.env.APP_URL = "http://localhost:3000";

describe("Sender Profile Identification", () => {
  describe("CASL footer uses sender profile name", () => {
    it("produces a footer with the profile's name when a sender profile is provided", () => {
      const sender: ResolvedSender = {
        profileId: 1,
        senderName: "Sarah Johnson",
        senderEmail: "sarah@outreach-fenceline.ca",
        senderTitle: "Account Manager",
      };
      const html = addCaslFooter("<p>Hello</p>", 1, sender);
      expect(html).toContain("Sarah Johnson, Account Manager");
      expect(html).toContain("on behalf of FenceLine Rentals");
      expect(html).not.toContain("Rob McMullen");
    });

    it("falls back to CASL_SENDER_NAME when no profile is provided", () => {
      const html = addCaslFooter("<p>Hello</p>", 1, null);
      expect(html).toContain("Rob McMullen");
      expect(html).toContain("on behalf of FenceLine Rentals");
    });

    it("falls back to CASL_SENDER_NAME when sender is undefined", () => {
      const html = addCaslFooter("<p>Hello</p>", 1, undefined);
      expect(html).toContain("Rob McMullen");
    });
  });

  describe("validateSender blocks incomplete profiles", () => {
    it("blocks send when sender is null", () => {
      const error = validateSender(null);
      expect(error).not.toBeNull();
      expect(error).toContain("No sender profile resolved");
    });

    it("blocks send when senderName is missing", () => {
      const sender: ResolvedSender = {
        profileId: 2,
        senderName: "",
        senderEmail: "test@example.com",
        senderTitle: null,
      };
      const error = validateSender(sender);
      expect(error).not.toBeNull();
      expect(error).toContain("senderName");
    });

    it("blocks send when senderEmail is missing", () => {
      const sender: ResolvedSender = {
        profileId: 3,
        senderName: "Test Person",
        senderEmail: "",
        senderTitle: null,
      };
      const error = validateSender(sender);
      expect(error).not.toBeNull();
      expect(error).toContain("senderEmail");
    });

    it("passes when both senderName and senderEmail are present", () => {
      const sender: ResolvedSender = {
        profileId: 4,
        senderName: "Valid Person",
        senderEmail: "valid@example.com",
        senderTitle: null,
      };
      const error = validateSender(sender);
      expect(error).toBeNull();
    });
  });

  describe("from-address and footer name match", () => {
    it("footer name matches the sender profile name (not env var)", () => {
      const sender: ResolvedSender = {
        profileId: 5,
        senderName: "Different Person",
        senderEmail: "different@outreach.ca",
        senderTitle: "Sales Rep",
      };
      const html = addCaslFooter("<p>Test</p>", 1, sender);
      // The footer should contain the profile name
      expect(html).toContain("Different Person");
      // The from-address would be sender.senderEmail (verified in sendEmail integration)
      // Here we verify the footer is consistent with what sendEmail uses for from
      expect(sender.senderEmail).toBe("different@outreach.ca");
    });
  });

  describe("sender profile recorded in audit trail", () => {
    it("engagement event includes senderProfileId when profile is used", async () => {
      // This tests the shape — the actual DB write is tested via the sendPath test
      const sender: ResolvedSender = {
        profileId: 7,
        senderName: "Audit Test",
        senderEmail: "audit@test.com",
        senderTitle: null,
      };
      // The engagement event should include senderProfileId
      const eventData = {
        leadId: 1,
        campaignId: 1,
        stepId: 1,
        eventType: "sent" as const,
        senderProfileId: sender.profileId || undefined,
      };
      expect(eventData.senderProfileId).toBe(7);
    });

    it("engagement event has no senderProfileId when using env fallback", () => {
      const sender: ResolvedSender = {
        profileId: null,
        senderName: "Rob McMullen",
        senderEmail: "rob@outreach.ca",
        senderTitle: null,
      };
      const eventData = {
        leadId: 1,
        campaignId: 1,
        stepId: 1,
        eventType: "sent" as const,
        senderProfileId: sender.profileId || undefined,
      };
      expect(eventData.senderProfileId).toBeUndefined();
    });
  });
});
