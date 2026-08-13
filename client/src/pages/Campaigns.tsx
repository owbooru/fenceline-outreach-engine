import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Campaigns() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [track, setTrack] = useState("existing_customers");
  const [description, setDescription] = useState("");

  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery();
  const createCampaign = trpc.campaigns.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setName(""); setDescription(""); } });
  const updateCampaign = trpc.campaigns.update.useMutation({ onSuccess: () => refetch() });

  const handleCreate = () => {
    if (!name) return;
    createCampaign.mutate({ name, track: track as "existing_customers" | "new_local" | "new_national", description, sendingDomain: "outreach-fenceline.ca" });
  };

  const toggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    updateCampaign.mutate({ id, data: { status: newStatus as "active" | "paused" } });
  };

  const trackColors: Record<string, string> = { existing_customers: "#10b981", new_local: "#3b82f6", new_national: "#f59e0b" };
  const trackLabels: Record<string, string> = { existing_customers: "Existing Customers", new_local: "New Local", new_national: "New National" };

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Campaigns</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Launch and manage outreach sequences</p>
      <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Campaigns combine a segment, a template, and a sender profile into a scheduled outreach sequence. Emails are sent at human pace through an isolated outreach domain — your primary fenceline.ca is never used and never at risk.</p>
      </div>

      {/* Protection Card */}
      <div className="border-2 border-[#3d6b50] bg-[#f4f7f5] rounded-xl p-6 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3d6b50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          <div>
            <h3 className="text-[18px] font-bold">Sender Reputation Protection</h3>
            <p className="text-[13px] text-[#2d5a4e] mt-0.5">Your domain stays clean — outreach never touches your primary email infrastructure</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-white rounded-lg border border-[#e8e8ee]">
            <div className="text-[14px] font-semibold mb-2">Sending Domain</div>
            <div className="p-2.5 bg-[#f8f9fb] rounded-md mb-2"><span className="font-mono text-[13px]">outreach-fenceline.ca</span> <span className="badge-green">Warmed</span></div>
            <p className="text-[12px] text-[#888]">SPF, DKIM, and DMARC configured. Warm-up runs 14 days before outreach.</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-[#e8e8ee]">
            <div className="text-[14px] font-semibold mb-2">Primary Domain</div>
            <div className="p-2.5 bg-[#f8f9fb] rounded-md mb-2"><span className="font-mono text-[13px]">fenceline.ca</span> <span className="badge-blue">Protected</span></div>
            <p className="text-[12px] text-[#888]">Never used for outreach. Business communications fully isolated.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3.5 bg-white rounded-lg border border-[#e8e8ee]"><div className="text-[13px] font-semibold mb-1">Human-Pace Sending</div><div className="text-[12px] text-[#888]">3-8 minute randomized delays between each email.</div></div>
          <div className="p-3.5 bg-white rounded-lg border border-[#e8e8ee]"><div className="text-[13px] font-semibold mb-1">CASL Compliance</div><div className="text-[12px] text-[#888]">Auto unsubscribe links, consent tracking per contact.</div></div>
          <div className="p-3.5 bg-white rounded-lg border border-[#e8e8ee]"><div className="text-[13px] font-semibold mb-1">Volume Controls</div><div className="text-[12px] text-[#888]">20 emails/day per sender, scale to 50 after warm-up.</div></div>
        </div>
      </div>

      {/* Active Campaigns */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#1a4750]">Campaigns</h3>
            <p className="text-[13px] text-[#888]">{campaigns?.length || 0} campaign{(campaigns?.length || 0) !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4750] text-white rounded-lg text-[14px] font-semibold hover:bg-[#2a5a65] transition-colors">+ New Campaign</button>
        </div>

        {/* New Campaign Form */}
        {showForm && (
          <div className="p-5 border border-[#1a4750] rounded-xl bg-[#f8fafb] mb-4">
            <div className="text-[14px] font-semibold mb-3">Create New Campaign</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-semibold text-[#888] block mb-1">Campaign Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Fence Sales — Edmonton GCs" className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#888] block mb-1">Track</label>
                <select value={track} onChange={e => setTrack(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px] bg-white">
                  <option value="existing_customers">Existing Customers</option>
                  <option value="new_local">New Local</option>
                  <option value="new_national">New National</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[11px] font-semibold text-[#888] block mb-1">Description (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Targeting estimators at Alberta GCs for temp fence sales" className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={createCampaign.isPending || !name} className="px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50">
                {createCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}Create Campaign
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white text-[#666] border border-[#ddd] rounded-lg text-[13px] font-semibold">Cancel</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#1a4750]" /></div>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="text-center py-12 text-[#aaa]">
            <p className="text-[14px]">No campaigns created yet. Click "+ New Campaign" to start your first outreach sequence.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c: any) => (
              <div key={c.id} className="p-4 border border-[#e8e8ee] rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded" style={{ background: trackColors[c.track] || "#888" }} />
                    <div>
                      <div className="text-[15px] font-semibold">{c.name}</div>
                      <div className="text-[13px] text-[#888] mt-0.5">Track: {trackLabels[c.track] || c.track} · Domain: {c.sendingDomain || "outreach-fenceline.ca"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={c.status === "active" ? "badge-green" : c.status === "paused" ? "badge-amber" : "badge-gray"}>{c.status}</span>
                    <button onClick={() => toggleStatus(c.id, c.status)} className="px-3 py-1.5 text-[12px] font-semibold border border-[#ddd] rounded-lg hover:border-[#bbb] transition-colors">
                      {c.status === "active" ? "Pause" : "Activate"}
                    </button>
                  </div>
                </div>
                {c.description && <div className="text-[13px] text-[#888] mt-2 ml-4">{c.description}</div>}
                <div className="flex gap-6 mt-3 ml-4">
                  <div><div className="text-[11px] font-semibold text-[#888]">Sent</div><div className="text-[16px] font-bold">{c.sentCount || 0}</div></div>
                  <div><div className="text-[11px] font-semibold text-[#888]">Opened</div><div className="text-[16px] font-bold">{c.sentCount > 0 ? `${Math.round(((c.openCount || 0) / c.sentCount) * 100)}%` : "—"}</div></div>
                  <div><div className="text-[11px] font-semibold text-[#888]">Replied</div><div className="text-[16px] font-bold">{c.replyCount || 0}</div></div>
                  <div><div className="text-[11px] font-semibold text-[#888]">Bounced</div><div className="text-[16px] font-bold">{c.bounceCount || 0}</div></div>
                  <div><div className="text-[11px] font-semibold text-[#888]">Pace</div><div className="text-[16px] font-bold">10/day</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
