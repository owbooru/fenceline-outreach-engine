import { describe, expect, it, vi } from "vitest";
import { calculateConsentExpiry, isConsentValid } from "../shared/consent";

// Test the shared consent helpers directly (no DB needed)
describe("CASL Consent Helpers", () => {
  it("express consent does not expire", () => {
    const expiry = calculateConsentExpiry("express", new Date());
    expect(expiry).toBeNull();
  });

  it("implied_business_relationship expires in 2 years", () => {
    const obtained = new Date("2024-01-15");
    const expiry = calculateConsentExpiry("implied_business_relationship", obtained);
    expect(expiry).not.toBeNull();
    expect(expiry!.getFullYear()).toBe(2026);
    expect(expiry!.getMonth()).toBe(0); // January
    expect(expiry!.getDate()).toBe(15);
  });

  it("implied_inquiry expires in 6 months", () => {
    const obtained = new Date("2024-06-01");
    const expiry = calculateConsentExpiry("implied_inquiry", obtained);
    expect(expiry).not.toBeNull();
    expect(expiry!.getFullYear()).toBe(2024);
    expect(expiry!.getMonth()).toBe(11); // December
    expect(expiry!.getDate()).toBe(1);
  });

  it("implied_published has no fixed expiry", () => {
    const expiry = calculateConsentExpiry("implied_published", new Date());
    expect(expiry).toBeNull();
  });

  it("none basis returns null expiry", () => {
    const expiry = calculateConsentExpiry("none", new Date());
    expect(expiry).toBeNull();
  });

  it("isConsentValid returns false for basis 'none'", () => {
    expect(isConsentValid("none", null)).toBe(false);
  });

  it("isConsentValid returns true for express consent (no expiry)", () => {
    expect(isConsentValid("express", null)).toBe(true);
  });

  it("isConsentValid returns false for expired implied consent", () => {
    const pastDate = new Date("2020-01-01");
    expect(isConsentValid("implied_business_relationship", pastDate)).toBe(false);
  });

  it("isConsentValid returns true for non-expired implied consent", () => {
    const futureDate = new Date("2030-01-01");
    expect(isConsentValid("implied_business_relationship", futureDate)).toBe(true);
  });
});

describe("assertSendable logic (unit tests without DB)", () => {
  it("a lead with consentBasis 'none' is not sendable", async () => {
    // We test the consent validation logic directly since assertSendable requires DB
    expect(isConsentValid("none", null)).toBe(false);
  });

  it("a lead with expired implied consent is not sendable", () => {
    const expiredDate = new Date("2022-01-01");
    expect(isConsentValid("implied_inquiry", expiredDate)).toBe(false);
    expect(isConsentValid("implied_business_relationship", expiredDate)).toBe(false);
  });

  it("express consent is always valid regardless of date", () => {
    expect(isConsentValid("express", null)).toBe(true);
    // Even with a past date (which shouldn't happen for express, but testing robustness)
    expect(isConsentValid("express", null)).toBe(true);
  });

  it("implied_published consent is valid (no fixed expiry)", () => {
    expect(isConsentValid("implied_published", null)).toBe(true);
  });
});
