import { Express, Request, Response } from "express";
import * as db from "./db";

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export function registerTrackingRoutes(app: Express) {
  // ─── Open Tracking Pixel ─────────────────────────────────────────────────
  app.get("/api/track/open", async (req: Request, res: Response) => {
    const leadId = parseInt(req.query.lid as string);
    const campaignId = parseInt(req.query.cid as string);
    const stepId = parseInt(req.query.sid as string);

    if (leadId && campaignId) {
      try {
        await db.createEngagementEvent({
          leadId,
          campaignId,
          stepId: stepId || undefined,
          eventType: "opened",
        });
        // Update lead engagement score
        const lead = await db.getLeadById(leadId);
        if (lead) {
          await db.updateLead(leadId, { engagementScore: (lead.engagementScore || 0) + 1 });
        }
      } catch (e) {
        console.error("[Tracking] Open pixel error:", e);
      }
    }

    res.set("Content-Type", "image/gif");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.send(PIXEL);
  });

  // ─── Click Tracking ──────────────────────────────────────────────────────
  app.get("/api/track/click", async (req: Request, res: Response) => {
    const leadId = parseInt(req.query.lid as string);
    const campaignId = parseInt(req.query.cid as string);
    const stepId = parseInt(req.query.sid as string);
    const url = req.query.url as string;

    if (leadId && campaignId) {
      try {
        await db.createEngagementEvent({
          leadId,
          campaignId,
          stepId: stepId || undefined,
          eventType: "clicked",
          metadata: { url },
        });
        // Update lead engagement score (clicks worth more)
        const lead = await db.getLeadById(leadId);
        if (lead) {
          await db.updateLead(leadId, {
            engagementScore: (lead.engagementScore || 0) + 3,
            status: lead.status === "new" ? "warm" : lead.status,
          });
        }
      } catch (e) {
        console.error("[Tracking] Click error:", e);
      }
    }

    // Redirect to actual URL
    if (url) {
      res.redirect(302, url);
    } else {
      res.status(400).send("Missing URL");
    }
  });

  // ─── Unsubscribe ─────────────────────────────────────────────────────────
  app.get("/api/track/unsubscribe", async (req: Request, res: Response) => {
    const leadId = parseInt(req.query.lid as string);

    if (leadId) {
      try {
        const lead = await db.getLeadById(leadId);
        if (lead && lead.email) {
          await db.addUnsubscribe(lead.email, leadId, "One-click unsubscribe");
          await db.createEngagementEvent({
            leadId,
            eventType: "unsubscribed",
          });
          await db.updateLead(leadId, { status: "archived" });
        }
      } catch (e) {
        console.error("[Tracking] Unsubscribe error:", e);
      }
    }

    res.send(`
      <html>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px">
          <h2>You've been unsubscribed</h2>
          <p>You will no longer receive emails from FenceLine outreach.</p>
          <p style="color:#888;font-size:13px">If this was a mistake, please contact us directly.</p>
        </body>
      </html>
    `);
  });
}

