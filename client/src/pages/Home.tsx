import { useLocation } from "wouter";
import { Search, Filter, Send, Activity, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, setLocation] = useLocation();
  const leadsQuery = trpc.leads.list.useQuery({});
  const campaignsQuery = trpc.campaigns.list.useQuery();
  const activityQuery = trpc.activity.list.useQuery({});
  const totalLeads = leadsQuery.data?.length || 0;
  const totalCampaigns = campaignsQuery.data?.length || 0;
  const activeCampaigns = campaignsQuery.data?.filter((c: any) => c.status === "active").length || 0;

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[var(--brand-primary)]">Dashboard</h1>
      <p className="text-[14px] text-[#6b6b6b] mt-1.5">Overview of your lead engine activity</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[
          { label: "Contacts Found", value: String(totalLeads), sub: totalLeads > 0 ? "In your database" : "Import contacts from Find page", color: "var(--brand-primary)" },
          { label: "Verified Emails", value: "0", sub: "Connect Hunter.io in Settings to verify", color: "var(--brand-primary)" },
          { label: "Campaigns Active", value: String(activeCampaigns), sub: totalCampaigns > 0 ? `${totalCampaigns} total campaigns` : "Create your first campaign", color: "var(--brand-primary)" },
          { label: "Response Rate", value: "—", sub: "Will show once emails are sent", color: "#7d8a8e" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[var(--neutral-border)] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.06]" style={{ background: stat.color }} />
            <div className="text-[11px] font-bold text-[#737373] uppercase tracking-wider">{stat.label}</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1 text-[var(--brand-primary)]">{stat.value}</div>
            <div className="text-[12px] text-[#737373] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Active Campaigns + Hot Leads */}
      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-[var(--brand-primary)]">Active Campaigns</h3>
            <span className="badge-green">{activeCampaigns} running</span>
          </div>
          {activeCampaigns === 0 ? (
            <div className="text-center py-6 text-[#6b6b6b]">
              <p className="text-[13px]">No active campaigns yet.</p>
              <button onClick={() => setLocation("/campaigns")} className="text-[13px] text-[var(--brand-primary)] font-semibold mt-2 hover:underline">Create your first campaign →</button>
            </div>
          ) : (
            campaignsQuery.data?.filter((c: any) => c.status === "active").map((campaign: any) => (
              <div key={campaign.id} className="p-3 border border-[#eee] rounded-lg mb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-7 rounded bg-[var(--brand-primary)]" />
                    <div>
                      <div className="text-[13px] font-semibold">{campaign.name}</div>
                      <div className="text-[11px] text-[#6b6b6b]">{campaign.track}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-[var(--brand-primary)]">Recent Leads</h3>
            <span className="badge-green">{totalLeads} total</span>
          </div>
          {totalLeads === 0 ? (
            <div className="text-center py-6 text-[#6b6b6b]">
              <p className="text-[13px]">No leads imported yet.</p>
              <button onClick={() => setLocation("/find")} className="text-[13px] text-[var(--brand-primary)] font-semibold mt-2 hover:underline">Find your first leads →</button>
            </div>
          ) : (
            leadsQuery.data?.slice(0, 3).map((lead: any) => (
              <div key={lead.id} className="p-2.5 rounded-lg bg-[var(--neutral-surface-3)] border border-[var(--neutral-muted-border-2)] mb-1.5 last:mb-0">
                <div className="flex justify-between items-center">
                  <div><span className="text-[13px] font-semibold">{lead.firstName} {lead.lastName}</span> <span className="text-[12px] text-[#6b6b6b]">{lead.company}</span></div>
                  <span className="text-[11px] text-[var(--brand-primary)] font-semibold">{lead.segment || "New"}</span>
                </div>
                <div className="text-[12px] text-[#555] mt-0.5">{lead.email || "No email"} · {lead.role || ""}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6 mt-5">
        <h3 className="text-[16px] font-bold text-[var(--brand-primary)]">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { icon: Search, label: "Source Leads", desc: "Scrape directories, web, and LinkedIn", path: "/find", color: "var(--brand-primary)" },
            { icon: Filter, label: "Manage Leads", desc: "View, filter, and segment contacts", path: "/segment", color: "var(--brand-accent)" },
            { icon: Send, label: "Campaigns", desc: "Build and launch outreach sequences", path: "/campaigns", color: "var(--brand-accent-hover)" },
            { icon: Activity, label: "Engagement", desc: "Track opens, clicks, and replies", path: "/tracking", color: "#5a7080" },
          ].map((action) => (
            <div
              key={action.label}
              onClick={() => setLocation(action.path)}
              className="p-5 border border-[#eee] rounded-xl cursor-pointer transition-all hover:border-[var(--brand-primary)]/30 hover:bg-[#f8faff]"
            >
              <div className="flex items-center gap-2 mb-2">
                <action.icon className="h-5 w-5" style={{ color: action.color }} />
                <span className="text-[14px] font-semibold">{action.label}</span>
              </div>
              <p className="text-[12px] text-[#6b6b6b]">{action.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6 mt-5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
            <h3 className="text-[16px] font-bold text-[var(--brand-primary)]">Activity Log</h3>
          </div>
          <span className="text-[12px] text-[#6b6b6b]">Last 20 events</span>
        </div>
        {!activityQuery.data || activityQuery.data.length === 0 ? (
          <div className="text-center py-6 text-[#6b6b6b]">
            <p className="text-[13px]">No activity yet. Import leads or create campaigns to see events here.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(activityQuery.data as any[]).slice(0, 20).map((entry: any, i: number) => {
              const actionIcons: Record<string, string> = {
                leads_imported: "📥",
                campaign_created: "🚀",
                campaign_activated: "▶️",
                campaign_paused: "⏸️",
                unsubscribe: "🚫",
                email_sent: "✉️",
                lead_updated: "✏️",
              };
              return (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--neutral-bg)] transition-colors">
                  <span className="text-[16px] mt-0.5">{actionIcons[entry.action] || "📋"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#333]">{entry.description}</div>
                    <div className="text-[11px] text-[#737373] mt-0.5">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
