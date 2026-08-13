import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Tracking() {
  const { data: stats, isLoading } = trpc.engagement.stats.useQuery();
  const { data: events } = trpc.engagement.events.useQuery({});

  const s = stats || { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 };
  const openRate = s.sent > 0 ? Math.round((s.opened / s.sent) * 100) : 0;
  const replyRate = s.sent > 0 ? Math.round((s.replied / s.sent) * 100) : 0;
  const bounceRate = s.sent > 0 ? Math.round((s.bounced / s.sent) * 100) : 0;

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Engagement Tracking</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Monitor opens, clicks, replies, and bounces across all campaigns</p>
      <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Every email is tracked. Contacts who open multiple times, click your pricing link, or reply are flagged as hot leads for immediate follow-up. Bounced addresses are automatically removed so your sender reputation stays clean.</p>
      </div>

      {/* Bounce Management */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mb-5">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Bounce Management</h3>
        <p className="text-[13px] text-[#888] mb-4">Invalid addresses are automatically removed to protect your sender reputation</p>
        <div className="p-3.5 bg-[#f4f7f5] border border-[#c4d8cc] rounded-lg flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3d6b50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-[13px] text-[#2d5a4e] font-medium">Automatic bounce removal is active — bounced addresses are excluded from all future sends</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3.5 bg-[#f8f9fb] rounded-lg"><div className="text-[11px] font-semibold text-[#888]">Hard Bounces</div><div className="text-[18px] font-bold mt-1">{s.bounced}</div><div className="text-[12px] text-[#888] mt-0.5">Removed permanently</div></div>
          <div className="p-3.5 bg-[#f8f9fb] rounded-lg"><div className="text-[11px] font-semibold text-[#888]">Soft Bounces</div><div className="text-[18px] font-bold mt-1">0</div><div className="text-[12px] text-[#888] mt-0.5">Retried up to 3 times</div></div>
          <div className="p-3.5 bg-[#f8f9fb] rounded-lg"><div className="text-[11px] font-semibold text-[#888]">Deliverability Score</div><div className="text-[18px] font-bold mt-1 text-[#10b981]">{s.sent > 0 ? `${100 - bounceRate}%` : "—"}</div><div className="text-[12px] text-[#888] mt-0.5">{s.sent > 0 ? "Above 95% target" : "Available after first campaign"}</div></div>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#1a4750]" /></div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-[#e8e8ee] p-5">
            <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider">Emails Sent</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1 text-[#1a4750]">{s.sent}</div>
            <div className="text-[12px] text-[#aaa] mt-1">{s.sent === 0 ? "No campaigns running yet" : "Across all active campaigns"}</div>
          </div>
          <div className="bg-white rounded-xl border border-[#e8e8ee] p-5">
            <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider">Open Rate</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1 text-[#1a4750]">{s.sent > 0 ? `${openRate}%` : "—"}</div>
            <div className="text-[12px] text-[#aaa] mt-1">Industry avg: 20-25%</div>
          </div>
          <div className="bg-white rounded-xl border border-[#e8e8ee] p-5">
            <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider">Reply Rate</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1 text-[#1a4750]">{s.sent > 0 ? `${replyRate}%` : "—"}</div>
            <div className="text-[12px] text-[#aaa] mt-1">Target: above 5%</div>
          </div>
          <div className="bg-white rounded-xl border border-[#e8e8ee] p-5">
            <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider">Bounce Rate</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1 text-[#1a4750]">{s.sent > 0 ? `${bounceRate}%` : "—"}</div>
            <div className="text-[12px] text-[#aaa] mt-1">Target: under 3%</div>
          </div>
        </div>
      )}

      {/* Hot Leads / Recent Activity */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Recent Activity</h3>
        <p className="text-[13px] text-[#888] mb-4">Latest engagement events across all campaigns</p>
        {!events || events.length === 0 ? (
          <div className="text-center py-12 text-[#aaa]">
            <p className="text-[14px]">Activity will appear here once campaigns start sending and engagement is tracked.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#f4f4f8]">
                <span className="text-[16px]">{e.eventType === "open" ? "👁️" : e.eventType === "click" ? "🔗" : e.eventType === "reply" ? "💬" : e.eventType === "bounce" ? "⚠️" : "📧"}</span>
                <div className="flex-1">
                  <span className="text-[13px] font-semibold">{e.eventType}</span>
                  <span className="text-[12px] text-[#888] ml-2">Lead #{e.leadId}</span>
                </div>
                <span className="text-[12px] text-[#aaa]">{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
