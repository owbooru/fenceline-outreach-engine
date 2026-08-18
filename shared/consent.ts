/**
 * CASL Consent Expiry Calculator
 * Shared helper for consistent consent expiry calculation.
 */

export type ConsentBasis = "express" | "implied_business_relationship" | "implied_inquiry" | "implied_published" | "none";

/**
 * Calculate the consent expiry date based on CASL rules.
 * @param basis - The consent basis type
 * @param obtainedAt - When consent was obtained
 * @returns The expiry date, or null if no expiry applies
 */
export function calculateConsentExpiry(basis: ConsentBasis, obtainedAt: Date): Date | null {
  switch (basis) {
    case "express":
      // Express consent does not expire
      return null;
    case "implied_business_relationship":
      // 2 years from consent obtained date
      const twoYears = new Date(obtainedAt);
      twoYears.setFullYear(twoYears.getFullYear() + 2);
      return twoYears;
    case "implied_inquiry":
      // 6 months from consent obtained date
      const sixMonths = new Date(obtainedAt);
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      return sixMonths;
    case "implied_published":
      // No fixed expiry, but message must be relevant to recipient's role
      return null;
    case "none":
      // Not sendable — expiry is irrelevant
      return null;
    default:
      return null;
  }
}

/**
 * Check if consent has expired.
 * Returns true if consent is expired or basis is "none".
 */
export function isConsentExpired(basis: ConsentBasis, expiresAt: Date | null): boolean {
  if (basis === "none") return true;
  if (expiresAt === null) return false; // express or implied_published — no expiry
  return new Date() > expiresAt;
}

/**
 * Check if a lead is sendable based on CASL consent rules.
 * Does NOT check unsubscribe or bounce status — those are separate checks.
 */
export function isConsentValid(basis: ConsentBasis, expiresAt: Date | null): boolean {
  if (basis === "none") return false;
  return !isConsentExpired(basis, expiresAt);
}

