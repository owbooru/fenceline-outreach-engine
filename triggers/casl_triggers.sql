-- CASL Compliance Triggers
-- consent_events must be append-only (no UPDATE, no DELETE)
-- leads bounce auto-suppress: when verificationStatus changes to 'bounced', insert into unsubscribes

-- Note: TiDB (used in Manus hosting) does not support BEFORE triggers with SIGNAL.
-- These triggers are for MySQL/MariaDB deployment on the VPS.
-- On TiDB, enforcement is application-level via assertSendable() in server/caslCompliance.ts.

--> statement-breakpoint
CREATE TRIGGER consent_events_no_update
BEFORE UPDATE ON consent_events
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'consent_events is append-only';

--> statement-breakpoint
CREATE TRIGGER consent_events_no_delete
BEFORE DELETE ON consent_events
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'consent_events is append-only';

--> statement-breakpoint
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
