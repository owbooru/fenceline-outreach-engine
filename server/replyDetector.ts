import nodemailer from "nodemailer";
import { getDb } from "./db";
import { engagementEvents, campaignLeads, leads } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as db from "./db";

// Reply detection checks the SMTP inbox for replies to outreach emails
// and auto-pauses the sequence + marks lead as hot

export async function checkForReplies(): Promise<{ repliesFound: number }> {
  const imapHost = process.env.IMAP_HOST;
  const imapUser = process.env.IMAP_USER || process.env.SMTP_USER;
  const imapPass = process.env.IMAP_PASS || process.env.SMTP_PASS;

  if (!imapHost || !imapUser || !imapPass) {
    console.log("[ReplyDetector] IMAP not configured, skipping reply check");
    return { repliesFound: 0 };
  }

  // For Gmail, replies can be detected via IMAP
  // This is a simplified version — in production, use Gmail API watch/push notifications
  try {
    // For now, log that reply detection is configured but needs IMAP library
    console.log("[ReplyDetector] Reply detection configured. Checking inbox...");
    // TODO: Implement full IMAP polling with `imapflow` package when ready
    // For the POC, replies are manually recorded via the engagement.record API
    return { repliesFound: 0 };
  } catch (err) {
    console.error("[ReplyDetector] Error checking replies:", err);
    return { repliesFound: 0 };
  }
}

// Mark a lead as replied — auto-pause their campaign sequence and flag as hot
export async function handleReply(leadId: number, campaignId?: number): Promise<void> {
  const database = await getDb();
  if (!database) return;

  // Record the reply event
  await db.createEngagementEvent({
    leadId,
    campaignId,
    eventType: "replied",
  });

  // Update lead status to hot
  await db.updateLead(leadId, {
    status: "hot",
    engagementScore: 100, // Max score for a reply
  });

  // Pause their campaign enrollment
  if (campaignId) {
    const enrollments = await database.select().from(campaignLeads).where(
      and(eq(campaignLeads.leadId, leadId), eq(campaignLeads.campaignId, campaignId))
    );
    for (const enrollment of enrollments) {
      await database.update(campaignLeads)
        .set({ status: "completed" })
        .where(eq(campaignLeads.id, enrollment.id));
    }
  }

  // Get lead info for logging
  const lead = await db.getLeadById(leadId);
  await db.logActivity("reply_received", `${lead?.firstName} ${lead?.lastName} (${lead?.company}) replied — sequence paused, marked as hot lead`, {
    leadId, campaignId,
  });
}
