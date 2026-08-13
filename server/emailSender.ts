import nodemailer from "nodemailer";
import { getDb } from "./db";
import { engagementEvents, campaignLeads, leads, campaigns, sequenceSteps } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as db from "./db";

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
  // Replace href links with tracked versions
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    const tracked = `${baseUrl}/api/track/click?lid=${leadId}&cid=${campaignId}&sid=${stepId}&url=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });
}

// ─── CASL Footer ─────────────────────────────────────────────────────────────
export function addCaslFooter(html: string, leadId: number): string {
  const baseUrl = process.env.APP_URL || "https://fenceline.geekcertified.com";
  const footer = `
<br/><hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
<p style="font-size:11px;color:#999;line-height:1.4">
This email was sent by FenceLine regarding fencing services.
If you no longer wish to receive these emails, <a href="${baseUrl}/api/track/unsubscribe?lid=${leadId}" style="color:#666">click here to unsubscribe</a>.
<br/>FenceLine, Edmonton, AB, Canada.
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
}): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter();
  const config = getEmailConfig();
  if (!transport || !config) {
    return { success: false, error: "Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment." };
  }

  // Check unsubscribe list
  const unsub = await db.isUnsubscribed(options.to);
  if (unsub) {
    return { success: false, error: "Contact is unsubscribed" };
  }

  // Add tracking and CASL footer
  let html = options.html;
  html = wrapLinksForTracking(html, options.leadId, options.campaignId, options.stepId);
  html = addTrackingPixel(html, options.leadId, options.campaignId, options.stepId);
  html = addCaslFooter(html, options.leadId);

  try {
    await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    // Record engagement event
    await db.createEngagementEvent({
      leadId: options.leadId,
      campaignId: options.campaignId,
      stepId: options.stepId,
      eventType: "sent",
    });

    // Log activity
    await db.logActivity("email_sent", `Email sent to ${options.to} (Campaign #${options.campaignId})`, {
      leadId: options.leadId,
      campaignId: options.campaignId,
      stepId: options.stepId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send" };
  }
}

// ─── Send Campaign (Human Pace) ─────────────────────────────────────────────
// This queues emails with randomized delays (3-8 minutes between each)
let sendingQueue: Array<{ leadId: number; campaignId: number; stepId: number; to: string; subject: string; html: string }> = [];
let isSending = false;

function getRandomDelay(): number {
  // 3-8 minutes in milliseconds
  return (Math.floor(Math.random() * 5) + 3) * 60 * 1000;
}

async function processQueue() {
  if (isSending || sendingQueue.length === 0) return;
  isSending = true;

  while (sendingQueue.length > 0) {
    const item = sendingQueue.shift()!;
    await sendEmail(item);

    // Wait random 3-8 minutes before next email
    if (sendingQueue.length > 0) {
      const delay = getRandomDelay();
      console.log(`[EmailSender] Next email in ${Math.round(delay / 60000)} minutes (${sendingQueue.length} remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  isSending = false;
}

export function queueEmail(item: { leadId: number; campaignId: number; stepId: number; to: string; subject: string; html: string }) {
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

  // Get campaign and step
  const [campaign] = await database.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  const [step] = await database.select().from(sequenceSteps).where(eq(sequenceSteps.id, stepId)).limit(1);
  if (!campaign || !step) return { queued: 0, skipped: 0, errors: ["Campaign or step not found"] };

  // Get enrolled leads
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

    // Check unsubscribe
    const unsub = await db.isUnsubscribed(lead.email);
    if (unsub) {
      skipped++;
      continue;
    }

    // Personalize
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
    });
    queued++;
  }

  await db.logActivity("campaign_sending", `Queued ${queued} emails for Campaign "${campaign.name}" (Step ${step.stepOrder})`, {
    campaignId, stepId, queued, skipped,
  });

  return { queued, skipped, errors };
}

