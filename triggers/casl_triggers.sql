-- ============================================================
-- CASL COMPLIANCE TRIGGERS — REFERENCE COPY
--
-- This file is NOT executed by the application.
--
-- The authoritative definitions live in server/startupChecks.ts,
-- which creates these triggers automatically on startup when the
-- database engine is MySQL or MariaDB.
--
-- This file exists so the trigger logic can be read and reviewed
-- without reading application code, and so it can be applied by
-- hand if ever needed.
--
-- IF YOU CHANGE A TRIGGER, CHANGE IT IN BOTH PLACES.
--
-- Engine note: requires MySQL or MariaDB. TiDB does not support
-- BEFORE triggers with SIGNAL. On TiDB these are not applied and
-- enforcement is application-level only.
-- ============================================================

CREATE TRIGGER consent_events_no_update
BEFORE UPDATE ON consent_events
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'consent_events is append-only';

CREATE TRIGGER consent_events_no_delete
BEFORE DELETE ON consent_events
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'consent_events is append-only';

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
END;
