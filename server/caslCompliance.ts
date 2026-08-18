/**
 * CASL Compliance Layer
 * Central compliance gate for all send paths.
 * Every send must pass through assertSendable() before delivery.
 */

import { getDb } from "./db";
import { leads, unsubscribes, consentEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { isConsentValid, type ConsentBasis } from "../shared/consent";

export interface SendableCheckResult {
  sendable: boolean;
  reason?: string;
}

/**
 * Assert that a lead is sendable under CASL rules.
 * Throws if the lead cannot be sent to. Call this in EVERY send path.
 *
 * Checks (all must pass):
 * 1. consentBasis is not "none"
 * 2. consentExpiresAt is NULL or in the future
 * 3. verificationStatus is not "bounced" or "invalid"
 * 4. Email is not present in unsubscribes
 *
 * If the database is unavailable, this function THROWS (fail-closed).
 */
export async function assertSendable(lead: {
  id: number;
  email: string | null;
  consentBasis: string;
  consentExpiresAt: Date | null;
  verificationStatus: string | null;
}): Promise<void> {
  // Fail-closed: if we can't check, we don't send
  const db = await getDb();
  if (!db) {
    throw new Error("[CASL] Database unavailable — compliance check cannot run. Send blocked.");
  }

  // Check 0: Must have an email
  if (!lead.email) {
    throw new Error(`[CASL] Lead #${lead.id}: No email address. Send blocked.`);
  }

  // Check 1: consentBasis must not be "none"
  if (lead.consentBasis === "none") {
    throw new Error(`[CASL] Lead #${lead.id}: consentBasis is "none" — no consent obtained. Send blocked.`);
  }

  // Check 2: Consent must not be expired
  if (!isConsentValid(lead.consentBasis as ConsentBasis, lead.consentExpiresAt)) {
    throw new Error(`[CASL] Lead #${lead.id}: Consent expired (basis: ${lead.consentBasis}, expires: ${lead.consentExpiresAt}). Send blocked.`);
  }

  // Check 3: verificationStatus must not be "bounced" or "invalid"
  if (lead.verificationStatus === "bounced" || lead.verificationStatus === "invalid") {
    throw new Error(`[CASL] Lead #${lead.id}: verificationStatus is "${lead.verificationStatus}". Send blocked.`);
  }

  // Check 4: Email must not be in unsubscribes (this now throws if DB is unavailable)
  const [unsub] = await db.select().from(unsubscribes).where(eq(unsubscribes.email, lead.email.toLowerCase())).limit(1);
  if (unsub) {
    throw new Error(`[CASL] Lead #${lead.id}: Email "${lead.email}" is unsubscribed. Send blocked.`);
  }
}

/**
 * Check sendability without throwing — returns a result object.
 * Use this for UI display (e.g., showing which leads will be excluded from a campaign).
 */
export async function checkSendable(lead: {
  id: number;
  email: string | null;
  consentBasis: string;
  consentExpiresAt: Date | null;
  verificationStatus: string | null;
}): Promise<SendableCheckResult> {
  try {
    await assertSendable(lead);
    return { sendable: true };
  } catch (err: any) {
    return { sendable: false, reason: err.message };
  }
}

/**
 * Record a consent event in the append-only audit trail.
 */
export async function recordConsentEvent(event: {
  leadId: number;
  email: string;
  eventType: "granted" | "withdrawn" | "expired" | "bounced" | "imported";
  consentBasis?: ConsentBasis;
  source?: string;
  evidence?: string;
  recordedBy?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("[CASL] Database unavailable — cannot record consent event.");

  await db.insert(consentEvents).values({
    leadId: event.leadId,
    email: event.email,
    eventType: event.eventType,
    consentBasis: event.consentBasis || null,
    source: event.source || null,
    evidence: event.evidence || null,
    recordedBy: event.recordedBy || null,
  });
}
