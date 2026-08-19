/**
 * Trigger Drift Test
 *
 * Ensures the trigger definitions in server/startupChecks.ts (the authoritative
 * source used by the application at startup) match the reference SQL file at
 * triggers/casl_triggers.sql.
 *
 * If this test fails, the SQL file and the startup code have diverged.
 * Fix whichever is behind and update both.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TRIGGER_NAMES, TRIGGER_DEFINITIONS } from "./startupChecks";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalise SQL for comparison: collapse whitespace, lowercase, trim,
 * remove trailing semicolons. We compare logic, not formatting.
 */
function normaliseSQL(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, "")       // strip single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
    .replace(/\s+/g, " ")            // collapse whitespace
    .replace(/;\s*$/, "")            // remove trailing semicolons
    .trim()
    .toLowerCase();
}

/**
 * Extract individual CREATE TRIGGER statements from the SQL file.
 * Returns a map of trigger name → normalised SQL body.
 */
function extractTriggersFromFile(content: string): Map<string, string> {
  const triggers = new Map<string, string>();

  // Split on CREATE TRIGGER (case-insensitive)
  const parts = content.split(/(?=CREATE\s+TRIGGER\s)/i);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.toLowerCase().startsWith("create trigger")) continue;

    // Extract trigger name (second word after CREATE TRIGGER)
    const nameMatch = trimmed.match(/CREATE\s+TRIGGER\s+(\S+)/i);
    if (!nameMatch) continue;

    const name = nameMatch[1].toLowerCase();
    triggers.set(name, normaliseSQL(trimmed));
  }

  return triggers;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Trigger drift: startupChecks.ts vs triggers/casl_triggers.sql", () => {
  const sqlFilePath = resolve(__dirname, "../triggers/casl_triggers.sql");
  const fileContent = readFileSync(sqlFilePath, "utf-8");
  const fileTriggersMap = extractTriggersFromFile(fileContent);

  const codeTriggersMap = new Map<string, string>();
  for (const [name, definition] of Object.entries(TRIGGER_DEFINITIONS)) {
    codeTriggersMap.set(name.toLowerCase(), normaliseSQL(definition));
  }

  it("SQL file contains all triggers defined in startup code", () => {
    for (const name of Object.values(TRIGGER_NAMES)) {
      expect(
        fileTriggersMap.has(name),
        `Trigger "${name}" exists in server/startupChecks.ts but is MISSING from triggers/casl_triggers.sql. The SQL file and the startup code have diverged.`
      ).toBe(true);
    }
  });

  it("startup code contains all triggers defined in SQL file", () => {
    for (const name of fileTriggersMap.keys()) {
      expect(
        codeTriggersMap.has(name),
        `Trigger "${name}" exists in triggers/casl_triggers.sql but is MISSING from server/startupChecks.ts. The SQL file and the startup code have diverged.`
      ).toBe(true);
    }
  });

  it("consent_events_no_update body matches between file and code", () => {
    const name = TRIGGER_NAMES.CONSENT_NO_UPDATE;
    const fromFile = fileTriggersMap.get(name);
    const fromCode = codeTriggersMap.get(name);
    expect(
      fromFile,
      `Trigger "${name}" not found in SQL file`
    ).toBeDefined();
    expect(
      fromCode,
      `Trigger "${name}" not found in startup code`
    ).toBeDefined();
    expect(
      fromFile,
      `Trigger "${name}" BODY DIFFERS between triggers/casl_triggers.sql and server/startupChecks.ts. Update both to match.`
    ).toBe(fromCode);
  });

  it("consent_events_no_delete body matches between file and code", () => {
    const name = TRIGGER_NAMES.CONSENT_NO_DELETE;
    const fromFile = fileTriggersMap.get(name);
    const fromCode = codeTriggersMap.get(name);
    expect(
      fromFile,
      `Trigger "${name}" not found in SQL file`
    ).toBeDefined();
    expect(
      fromCode,
      `Trigger "${name}" not found in startup code`
    ).toBeDefined();
    expect(
      fromFile,
      `Trigger "${name}" BODY DIFFERS between triggers/casl_triggers.sql and server/startupChecks.ts. Update both to match.`
    ).toBe(fromCode);
  });

  it("leads_bounce_suppress body matches between file and code", () => {
    const name = TRIGGER_NAMES.BOUNCE_SUPPRESS;
    const fromFile = fileTriggersMap.get(name);
    const fromCode = codeTriggersMap.get(name);
    expect(
      fromFile,
      `Trigger "${name}" not found in SQL file`
    ).toBeDefined();
    expect(
      fromCode,
      `Trigger "${name}" not found in startup code`
    ).toBeDefined();
    expect(
      fromFile,
      `Trigger "${name}" BODY DIFFERS between triggers/casl_triggers.sql and server/startupChecks.ts. Update both to match.`
    ).toBe(fromCode);
  });
});
