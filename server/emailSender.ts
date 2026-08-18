import nodemailer from "nodemailer";
import { getDb } from "./db";
import { engagementEvents, campaignLeads, leads, campaigns, sequenceSteps, senderProfiles } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as db from "./db";
import { assertSendable } from "./caslCompliance";
import { leads as leadsTable } from "../drizzle/schema";

// ─── Sender Profile Resolution ──────────────────────────────────────────────
export interface ResolvedSender {
  profileId: number | null;
  senderName: string;
  senderEmail: string;
  senderTitle: string | null;
}

/**
 * Resolve the sender for a given campaign. If the campaign has a senderProfileId,
 * load that profile. Otherwise fall back to env vars.
 */
export async function resolveSender(campaignId: number): Promise<ResolvedSender | null> {
  const database = await getDb();
  if (!database) return null;

  const [campaign] = await database.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return null;

  const profileId = campaign.senderProfileId;
  if (profileId) {
    const [profile] = await database.select().from(senderProfiles).where(eq(senderProfiles.id, profileId)).limit(1);
    if (profile && profile.senderName && profile.senderEmail) {
      return {
        profileId: profile.id,
        senderName: profile.senderName,
        senderEmail: profile.senderEmail,
        senderTitle: profile.senderTitle || null,
      };
    }
    // Profile attached but incomplete — this is a failure, not a fallback
    return null;
  }

  // No profile assigned — block the send
  return null;
}

/**
 * Validate that a resolved sender has the required fields.
 */
export function validateSender(sender: ResolvedSender | null): string | null {
  if (!sender) return "No sender profile resolved — cannot determine who is sending.";
  if (!sender.senderName || sender.senderName.trim() === "") return "Sender profile missing senderName.";
  if (!sender.senderEmail || sender.senderEmail.trim() === "") return "Sender profile missing senderEmail.";
  return null;
}

// ─── Email Configuration ─────────────────────────────────────────────────────
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromName: string;
  fromEmail: string;
}

let transporter: nodemailer.Transporter | null = null;

export function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || "Rob McMullen";
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || "";

  if (!host || !user || !pass) return null;

  return { host, port, secure: port === 465, auth: { user, pass }, fromName, fromEmail };
}

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const config = getEmailConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  return transporter;
}

// ─── Personalization ─────────────────────────────────────────────────────────
export function personalizeTemplate(template: string, lead: any): string {
  return template
    .replace(/\{\{first_name\}\}/g, lead.firstName || "")
    .replace(/\{\{last_name\}\}/g, lead.lastName || "")
    .replace(/\{\{company_name\}\}/g, lead.company || "")
    .replace(/\{\{company\}\}/g, lead.company || "")
    .replace(/\{\{job_title\}\}/g, lead.jobTitle || "")
    .replace(/\{\{city\}\}/g, lead.city || "")
    .replace(/\{\{region\}\}/g, lead.province || "Alberta")
    .replace(/\{\{project_reference\}\}/g, "current projects")
    .replace(/\{\{pricing_link\}\}/g, "#");
}

// ─── Tracking ────────────────────────────────────────────────────────────────
export function addTrackingPixel(html: string, leadId: number, campaignId: number, stepId: number): string {
  const baseUrl = process.env.APP_URL || "https://fenceline.geekcertified.com";
  const pixel = `<img src="${baseUrl}/api/track/open?lid=${leadId}&cid=${campaignId}&sid=${stepId}" width="1" height="1" style="display:none" />`;
  return html + pixel;
}

export function wrapLinksForTracking(html: string, leadId: number, campaignId: number, stepId: number): string {
  const baseUrl = process.env.APP_URL || "https://fenceline.geekcertified.com";
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    const tracked = `${baseUrl}/api/track/click?lid=${leadId}&cid=${campaignId}&sid=${stepId}&url=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });
}

// ─── CASL Footer ─────────────────────────────────────────────────────────────
export function addCaslFooter(html: string, leadId: number, sender?: ResolvedSender | null): string {
  const baseUrl = process.env.APP_URL || "https://fenceline.geekcertified.com";
  const senderName = sender?.senderName || process.env.CASL_SENDER_NAME || "FenceLine";
  const senderTitle = sender?.senderTitle || "";
  const businessName = process.env.CASL_BUSINESS_NAME || "FenceLine Rentals Ltd.";
  const mailingAddress = process.env.CASL_MAILING_ADDRESS || "Edmonton, AB, Canada";
  const contactPhone = process.env.CASL_CONTACT_PHONE || "";
  const contactEmail = process.env.CASL_CONTACT_EMAIL || "";
  const contactWeb = process.env.CASL_CONTACT_WEB || "https://fenceline.ca";

  const contactLine = [
    contactPhone ? `Phone: ${contactPhone}` : "",
    contactEmail ? `Email: ${contactEmail}` : "",
    contactWeb ? `Web: <a href="${contactWeb}" style="color:#666">${contactWeb}</a>` : "",
  ].filter(Boolean).join(" | ");

  const senderLine = senderTitle
    ? `${senderName}, ${senderTitle}`
    : senderName;

  const footer = `
<br/><hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
<p style="font-size:11px;color:#999;line-height:1.4">
This message was sent by ${senderLine} on behalf of ${businessName}.
<br/>${mailingAddress}
<br/>${contactLine}
<br/>If you no longer wish to receive these emails, <a href="${baseUrl}/api/track/unsubscribe?lid=${leadId}" style="color:#666">click here to unsubscribe</a>.
This unsubscribe link will remain active for at least 60 days.
</p>`;
  return html + footer;
}

// ─── Send Single Email ───────────────────────────────────────────────────────
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  leadId: number;
  campaignId: number;
  stepId: number;
  sender?: ResolvedSender | null;
}): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter();
  const config = getEmailConfig();
  if (!transport || !config) {
    return { success: false, error: "Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment." };
  }

  // Resolve sender — from options or by campaign lookup
  const sender = options.sender || await resolveSender(options.campaignId);
  const senderError = validateSender(sender);
  if (senderError) {
    return { success: false, error: `[CASL] ${senderError}` };
  }

  // CASL compliance gate — assertSendable checks consent, expiry, bounce, and unsubscribe
  const database = await getDb();
  if (!database) {
    return { success: false, error: "[CASL] Database unavailable — send blocked (fail-closed)." };
  }
  const [lead] = await database.select().from(leadsTable).where(eq(leadsTable.id, options.leadId)).limit(1);
  if (!lead) {
    return { success: false, error: `Lead #${options.leadId} not found.` };
  }
  try {
    await assertSendable(lead);
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  // Add tracking and CASL footer (using resolved sender for footer)
  let html = options.html;
  html = wrapLinksForTracking(html, options.leadId, options.campaignId, options.stepId);
  html = addTrackingPixel(html, options.leadId, options.campaignId, options.stepId);
  html = addCaslFooter(html, options.leadId, sender);

  // From-address and footer name come from the same sender
  const fromName = sender!.senderName;
  const fromEmail = sender!.senderEmail;

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    // Record engagement event with sender profile ID
    await db.createEngagementEvent({
      leadId: options.leadId,
      campaignId: options.campaignId,
      stepId: options.stepId,
      eventType: "sent",
      senderProfileId: sender!.profileId || undefined,
    });

    // Log activity
    await db.logActivity("email_sent", `Email sent to ${options.to} by ${fromName} (Campaign #${options.campaignId})`, {
      leadId: options.leadId,
      campaignId: options.campaignId,
      stepId: options.stepId,
      senderProfileId: sender!.profileId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send" };
  }
}

// ─── Send Campaign (Human Pace) ─────────────────────────────────────────────
let sendingQueue: Array<{ leadId: number; campaignId: number; stepId: number; to: string; subject: string; html: string; sender?: ResolvedSender | null }> = [];
let isSending = false;

// ─── Business Hours Check (Mon-Fri 8am-5pm MST) ─────────────────────────────
function isBusinessHours(): boolean {
  const now = new Date();
  const mstOffset = -7;
  const utcHours = now.getUTCHours();
  const mstHours = (utcHours + mstOffset + 24) % 24;
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  if (mstHours < 8 || mstHours >= 17) return false;
  return true;
}

function getTimeUntilNextBusinessHour(): number {
  const now = new Date();
  const mstOffset = -7;
  const utcHours = now.getUTCHours();
  const mstHours = (utcHours + mstOffset + 24) % 24;
  const day = now.getUTCDay();

  let hoursToWait = 0;
  if (day === 6) {
    hoursToWait = (24 - mstHours) + 24 + 8;
  } else if (day === 0) {
    hoursToWait = (24 - mstHours) + 8;
  } else if (mstHours >= 17) {
    if (day === 5) {
      hoursToWait = (24 - mstHours) + 48 + 8;
    } else {
      hoursToWait = (24 - mstHours) + 8;
    }
  } else if (mstHours < 8) {
    hoursToWait = 8 - mstHours;
  }
  return hoursToWait * 60 * 60 * 1000;
}

function getRandomDelay(): number {
  return (Math.floor(Math.random() * 5) + 3) * 60 * 1000;
}

async function processQueue() {
  if (isSending || sendingQueue.length === 0) return;
  isSending = true;

  while (sendingQueue.length > 0) {
    if (!isBusinessHours()) {
      const waitTime = getTimeUntilNextBusinessHour();
      console.log(`[EmailSender] Outside business hours. Pausing queue for ${Math.round(waitTime / 3600000)} hours.`);
      setTimeout(() => processQueue(), waitTime);
      isSending = false;
      return;
    }

    const item = sendingQueue.shift()!;
    await sendEmail(item);

    if (sendingQueue.length > 0) {
      const delay = getRandomDelay();
      console.log(`[EmailSender] Next email in ${Math.round(delay / 60000)} minutes (${sendingQueue.length} remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  isSending = false;
}

export function queueEmail(item: { leadId: number; campaignId: number; stepId: number; to: string; subject: string; html: string; sender?: ResolvedSender | null }) {
  sendingQueue.push(item);
  if (!isSending) processQueue();
}

export function getQueueStatus() {
  return { queued: sendingQueue.length, isSending };
}

// ─── Send Campaign Step to All Enrolled Leads ────────────────────────────────
export async function sendCampaignStep(campaignId: number, stepId: number): Promise<{ queued: number; skipped: number; errors: string[] }> {
  const database = await getDb();
  if (!database) return { queued: 0, skipped: 0, errors: ["Database not available"] };

  const [campaign] = await database.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  const [step] = await database.select().from(sequenceSteps).where(eq(sequenceSteps.id, stepId)).limit(1);
  if (!campaign || !step) return { queued: 0, skipped: 0, errors: ["Campaign or step not found"] };

  // Resolve sender once for the whole campaign
  const sender = await resolveSender(campaignId);
  const senderError = validateSender(sender);
  if (senderError) {
    return { queued: 0, skipped: 0, errors: [`[CASL] ${senderError}`] };
  }

  const enrolled = await database.select().from(campaignLeads).where(
    and(eq(campaignLeads.campaignId, campaignId), eq(campaignLeads.status, "active"))
  );

  let queued = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const enrollment of enrolled) {
    const [lead] = await database.select().from(leads).where(eq(leads.id, enrollment.leadId)).limit(1);
    if (!lead || !lead.email) {
      skipped++;
      continue;
    }

    try {
      await assertSendable(lead);
    } catch (err: any) {
      console.log(`[EmailSender] Skipping lead #${lead.id}: ${err.message}`);
      skipped++;
      continue;
    }

    const subject = personalizeTemplate(step.subject || "", lead);
    const bodyText = personalizeTemplate(step.body || "", lead);
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333">${bodyText.replace(/\n/g, "<br/>")}</div>`;

    queueEmail({
      leadId: lead.id,
      campaignId,
      stepId,
      to: lead.email,
      subject,
      html,
      sender,
    });
    queued++;
  }

  await db.logActivity("campaign_sending", `Queued ${queued} emails for Campaign "${campaign.name}" (Step ${step.stepOrder})`, {
    campaignId, stepId, queued, skipped,
  });

  return { queued, skipped, errors };
}
