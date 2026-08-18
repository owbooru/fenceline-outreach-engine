/**
 * Startup Checks — Environment validation, trigger auto-apply, and compliance state.
 *
 * Runs before the server accepts requests. Ensures:
 * 1. All required env vars are set (exits non-zero if not)
 * 2. Compliance triggers are present in the database (creates them if MySQL/MariaDB)
 * 3. Exposes compliance state for the health endpoint
 */
import { sql } from "drizzle-orm";
import { getDb } from "./db";

// ─── Compliance state (read by health endpoint) ─────────────────────────────
export interface ComplianceState {
  databaseEngine: string;
  databaseConnected: boolean;
  triggersPresent: boolean;
  senderIdentificationConfigured: boolean;
  enforcementLevel: "database" | "application";
}

let _complianceState: ComplianceState = {
  databaseEngine: "unknown",
  databaseConnected: false,
  triggersPresent: false,
  senderIdentificationConfigured: false,
  enforcementLevel: "application",
};

export function getComplianceState(): ComplianceState {
  return { ..._complianceState };
}

// ─── Required env vars ──────────────────────────────────────────────────────

interface RequiredVar {
  name: string;
  description: string;
}

const REQUIRED_VARS: RequiredVar[] = [
  { name: "DATABASE_URL", description: "MySQL/MariaDB connection string for the application database" },
  { name: "JWT_SECRET", description: "Secret key for signing session cookies (minimum 32 characters)" },
  { name: "APP_ACCESS_PASSWORD", description: "Shared password for platform access (enforced server-side)" },
  { name: "CASL_SENDER_NAME", description: "Name of the person sending on behalf of the business (CASL s.6(2)(b))" },
  { name: "CASL_BUSINESS_NAME", description: "Legal name of the business sending the message (CASL s.6(2)(b))" },
  { name: "CASL_MAILING_ADDRESS", description: "Mailing address of the sender (CASL s.6(2)(c))" },
  { name: "CASL_CONTACT_EMAIL", description: "Contact email address for the sender (CASL s.6(2)(c))" },
];

const CONTACT_METHOD_VARS = [
  { name: "CASL_CONTACT_PHONE", description: "Contact phone number (CASL requires at least one contact method beyond email)" },
  { name: "CASL_CONTACT_WEB", description: "Contact web address (CASL requires at least one contact method beyond email)" },
];

/**
 * Validates all required environment variables are set.
 * Returns an array of error messages. Empty array = all good.
 */
export function validateEnvironment(): string[] {
  const errors: string[] = [];

  for (const v of REQUIRED_VARS) {
    const value = process.env[v.name];
    if (!value || value.trim() === "") {
      errors.push(`  ${v.name} — ${v.description}`);
    }
  }

  // At least one of CASL_CONTACT_PHONE or CASL_CONTACT_WEB must be set
  const hasPhone = process.env.CASL_CONTACT_PHONE && process.env.CASL_CONTACT_PHONE.trim() !== "";
  const hasWeb = process.env.CASL_CONTACT_WEB && process.env.CASL_CONTACT_WEB.trim() !== "";
  if (!hasPhone && !hasWeb) {
    errors.push(`  CASL_CONTACT_PHONE or CASL_CONTACT_WEB — At least one must be set. CASL requires a working contact method beyond email.`);
  }

  return errors;
}

/**
 * Run the full startup check sequence. Call before server.listen().
 * Exits process with code 1 if env validation fails.
 */
export async function runStartupChecks(): Promise<void> {
  console.log("[Startup] Running pre-flight checks...");

  // ─── Step 1: Environment validation ────────────────────────────────────
  const envErrors = validateEnvironment();
  if (envErrors.length > 0) {
    console.error("\n[Startup] ❌ FATAL: Required environment variables are missing or empty.\n");
    console.error("The following must be set in .env or the process environment:\n");
    for (const err of envErrors) {
      console.error(err);
    }
    console.error("\nThe application cannot start without these. See DEPLOY.md for details.\n");
    process.exit(1);
  }
  console.log("[Startup] ✓ All required environment variables present.");

  // Record sender identification state
  _complianceState.senderIdentificationConfigured = true;

  // ─── Step 2: Database connection and trigger auto-apply ────────────────
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Startup] ⚠ Database connection not available. Triggers cannot be verified.");
      _complianceState.databaseConnected = false;
      return;
    }
    _complianceState.databaseConnected = true;

    // Detect engine
    const versionResult = await db.execute(sql`SELECT VERSION() AS ver`);
    const versionRow = (versionResult as any)[0]?.[0] || (versionResult as any).rows?.[0];
    const versionString: string = versionRow?.ver || versionRow?.["VERSION()"] || "unknown";
    _complianceState.databaseEngine = versionString;

    const isTiDB = versionString.toLowerCase().includes("tidb");
    const isMySQL = !isTiDB; // MariaDB or MySQL

    if (isTiDB) {
      console.warn(`[Startup] ⚠ Database engine: ${versionString} (TiDB detected)`);
      console.warn("[Startup] ⚠ TiDB does not support BEFORE triggers with SIGNAL.");
      console.warn("[Startup] ⚠ Database-level enforcement is UNAVAILABLE on this engine.");
      console.warn("[Startup] ⚠ The append-only guarantee on consent_events is application-level only.");
      _complianceState.triggersPresent = false;
      _complianceState.enforcementLevel = "application";
      return;
    }

    console.log(`[Startup] Database engine: ${versionString}`);

    // Check which triggers exist
    const triggersResult = await db.execute(
      sql`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME IN ('consent_events_no_update', 'consent_events_no_delete', 'leads_bounce_suppress')`
    );
    const existingTriggers = new Set<string>();
    const rows = (triggersResult as any)[0] || (triggersResult as any).rows || [];
    for (const row of rows) {
      const name = row?.TRIGGER_NAME || row?.trigger_name;
      if (name) existingTriggers.add(name);
    }

    const requiredTriggers = ["consent_events_no_update", "consent_events_no_delete", "leads_bounce_suppress"];
    const missing = requiredTriggers.filter(t => !existingTriggers.has(t));

    if (missing.length === 0) {
      console.log("[Startup] ✓ All 3 compliance triggers present in database.");
      _complianceState.triggersPresent = true;
      _complianceState.enforcementLevel = "database";
      return;
    }

    console.log(`[Startup] Creating missing triggers: ${missing.join(", ")}...`);

    // Create missing triggers idempotently
    if (missing.includes("consent_events_no_update")) {
      await db.execute(sql.raw(`
        CREATE TRIGGER consent_events_no_update
        BEFORE UPDATE ON consent_events
        FOR EACH ROW
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'consent_events is append-only'
      `));
    }

    if (missing.includes("consent_events_no_delete")) {
      await db.execute(sql.raw(`
        CREATE TRIGGER consent_events_no_delete
        BEFORE DELETE ON consent_events
        FOR EACH ROW
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'consent_events is append-only'
      `));
    }

    if (missing.includes("leads_bounce_suppress")) {
      await db.execute(sql.raw(`
        CREATE TRIGGER leads_bounce_suppress
        AFTER UPDATE ON leads
        FOR EACH ROW
        BEGIN
          IF NEW.verificationStatus = 'bounced'
             AND OLD.verificationStatus <> 'bounced'
             AND NEW.email IS NOT NULL THEN
            INSERT IGNORE INTO unsubscribes (email, leadId, reason, unsubscribedAt)
            VALUES (LOWER(NEW.email), NEW.id, 'hard bounce', NOW());
          END IF;
        END
      `));
    }

    console.log("[Startup] ✓ Compliance triggers created successfully.");
    _complianceState.triggersPresent = true;
    _complianceState.enforcementLevel = "database";

  } catch (error) {
    console.warn(`[Startup] ⚠ Trigger auto-apply failed: ${error}`);
    console.warn("[Startup] ⚠ Compliance enforcement remains application-level only.");
    _complianceState.triggersPresent = false;
    _complianceState.enforcementLevel = "application";
  }
}
