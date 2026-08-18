import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, CheckCircle, AlertCircle, UserPlus, ChevronDown, ChevronUp, Mail, Clock, CheckCircle2, X, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

/** Per-campaign CASL sendable count indicator */
function SendableCount({ campaignId }: { campaignId: number }) {
  const query = (trpc as any).consent?.sendableCount?.useQuery?.({ campaignId }) || { data: null, isLoading: false };
  if (query.isLoading || !query.data) return null;
  const { total, sendable, excluded, reasons } = query.data;
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-2 mt-3 ml-4 px-3 py-2 bg-[#f8f9fb] rounded-lg border border-[#e8e8ee]">
      <ShieldAlert className="h-4 w-4 text-[#1a4750] shrink-0" />
      <span className="text-[12px] text-[#555]">
        <strong className="text-[#1a4750]">{sendable}</strong> of {total} enrolled leads are sendable
        {excluded > 0 && (
          <span className="text-red-600 font-semibold"> ({excluded} excluded: {reasons.join(", ")})</span>
        )}
      </span>
    </div>
  );
}

export default function Campaigns() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [track, setTrack] = useState("existing_customers");
  const [description, setDescription] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewTrack, setPreviewTrack] = useState("new_local");
  const [sendingCampaignId, setSendingCampaignId] = useState<number | null>(null);
  const [enrollCampaignId, setEnrollCampaignId] = useState<number | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null);
  const [resendLeadId, setResendLeadId] = useState<number | null>(null);
  const [resendEmail, setResendEmail] = useState("");

  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery();
  const { data: allLeads } = trpc.leads.list.useQuery({});
  const { data: enrolledLeads } = trpc.campaigns.getLeads.useQuery(
    { campaignId: expandedCampaignId! },
    { enabled: !!expandedCampaignId }
  );
  const createCampaign = trpc.campaigns.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setName(""); setDescription(""); } });
  const updateCampaign = trpc.campaigns.update.useMutation({ onSuccess: () => refetch() });
  const enrollLeads = trpc.campaigns.enrollLeads.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Enrolled ${data.enrolled} leads in campaign`);
      setEnrollCampaignId(null);
      setSelectedLeadIds([]);
      refetch();
    },
    onError: (err: any) => toast.error(`Enroll failed: ${err.message}`),
  });
  const unenrollLead = trpc.campaigns.unenrollLead.useMutation({
    onSuccess: () => { toast.success("Lead removed from campaign"); refetch(); },
    onError: (err: any) => toast.error(`Remove failed: ${err.message}`),
  });
  const updateLead = trpc.leads.update.useMutation({
    onSuccess: () => { toast.success("Email updated — lead re-queued for sending"); setResendLeadId(null); setResendEmail(""); },
    onError: (err: any) => toast.error(`Update failed: ${err.message}`),
  });
  const emailStatus = (trpc as any).email?.status?.useQuery?.() || { data: null };

  const handleRemoveFromCampaign = (campaignLeadId: number) => {
    if (confirm("Remove this lead from the campaign?")) {
      unenrollLead.mutate({ id: campaignLeadId });
    }
  };

  const handleResend = (leadId: number) => {
    if (!resendEmail) return;
    updateLead.mutate({ id: leadId, data: { email: resendEmail } });
  };
  const sendStep = (trpc as any).email?.sendStep?.useMutation?.({
    onSuccess: (data: any) => {
      toast.success(`Queued ${data.queued} emails for sending (${data.skipped} skipped). Sending at human pace — 3-8 min between each.`);
      setSendingCampaignId(null);
      refetch();
    },
    onError: (err: any) => {
      toast.error(`Send failed: ${err.message}`);
      setSendingCampaignId(null);
    }
  }) || { mutate: () => toast.error("Email sending not available"), isPending: false };

  const handleSend = (campaignId: number) => {
    // For POC, send step 1 of the campaign
    setSendingCampaignId(campaignId);
    sendStep.mutate({ campaignId, stepId: 1 });
  };

  const handleEnroll = () => {
    if (!enrollCampaignId || selectedLeadIds.length === 0) return;
    enrollLeads.mutate({ campaignId: enrollCampaignId, leadIds: selectedLeadIds });
  };

  const toggleLeadSelection = (id: number) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllLeads = () => {
    if (!allLeads) return;
    if (selectedLeadIds.length === allLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(allLeads.map((l: any) => l.id));
    }
  };

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

      {/* Email Status Indicator */}
      <div className={`p-4 rounded-xl mt-5 mb-5 border ${emailStatus.data?.configured ? "bg-[#f4f7f6] border-[#d4ddd8]" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center gap-2 mb-1">
          {emailStatus.data?.configured ? (
            <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-[13px] font-semibold text-green-800">Email sending configured</span></>
          ) : (
            <><AlertCircle className="h-4 w-4 text-amber-600" /><span className="text-[13px] font-semibold text-amber-800">Email sending not configured</span></>
          )}
          {emailStatus.data?.isSending && <span className="badge-green ml-2">Sending in progress ({emailStatus.data.queued} queued)</span>}
        </div>
        <p className="text-[13px] text-[#444] leading-relaxed">Campaigns combine a segment, a template, and a sender profile into a scheduled outreach sequence. Emails are sent at human pace through an isolated outreach domain — your primary fenceline.ca is never used and never at risk.</p>
        {!emailStatus.data?.configured && <p className="text-[12px] text-amber-700 mt-1">Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables on the server to enable sending.</p>}
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
                      <div className="text-[13px] text-[#888] mt-0.5">Track: {trackLabels[c.track] || c.track} · Domain: {c.sendingDomain || "outreach-fenceline.ca"} · <span className="font-semibold text-[#555]">{c.enrolledCount || 0} enrolled</span>{(c.sentCount || 0) > 0 && <span className="text-green-600"> ({c.sentCount} contacted)</span>}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={c.status === "active" ? "badge-green" : c.status === "paused" ? "badge-amber" : "badge-gray"}>{c.status}</span>
                    <button onClick={() => toggleStatus(c.id, c.status)} className="px-3 py-1.5 text-[12px] font-semibold border border-[#ddd] rounded-lg hover:border-[#bbb] transition-colors">
                      {c.status === "active" ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => { setEnrollCampaignId(c.id); setSelectedLeadIds([]); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold border border-[#1a4750] text-[#1a4750] rounded-lg hover:bg-[#f4f7f6] transition-colors"
                    >
                      <UserPlus className="h-3 w-3" />
                      Enroll Leads
                    </button>
                    <button
                      onClick={() => handleSend(c.id)}
                      disabled={!emailStatus.data?.configured || sendingCampaignId === c.id || c.status !== "active"}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold bg-[#1a4750] text-white rounded-lg hover:bg-[#2a5a65] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sendingCampaignId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Send
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
                {/* CASL Pre-send excluded count — always visible on each campaign card */}
                <SendableCount campaignId={c.id} />
                <button onClick={() => setExpandedCampaignId(expandedCampaignId === c.id ? null : c.id)} className="flex items-center gap-1 mt-3 ml-4 text-[12px] font-semibold text-[#1a4750] hover:text-[#2a5a65] transition-colors">
                  {expandedCampaignId === c.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  View Enrolled Leads
                </button>
                {expandedCampaignId === c.id && (
                  <div className="mt-3 ml-4 border border-[#eee] rounded-lg overflow-hidden">
                    <div className="bg-[#f8f9fb] px-4 py-2 border-b border-[#eee] flex justify-between items-center">
                      <span className="text-[11px] font-bold text-[#888] uppercase">Enrolled Contacts</span>
                      <div className="flex gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Contacted</span>
                        <span className="flex items-center gap-1 text-amber-600"><Clock className="h-3 w-3" /> Pending</span>
                        <span className="flex items-center gap-1 text-blue-600"><Mail className="h-3 w-3" /> Queued</span>
                      </div>
                    </div>
                    {!enrolledLeads || enrolledLeads.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-[#aaa]">No leads enrolled yet. Click "Enroll Leads" to add contacts.</div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {enrolledLeads.map((el: any) => {
                          const lead = allLeads?.find((l: any) => l.id === el.leadId);
                          const statusIcon = el.lastSentAt ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : el.status === "active" ? <Clock className="h-3.5 w-3.5 text-amber-500" /> : <Mail className="h-3.5 w-3.5 text-blue-500" />;
                          const statusLabel = el.lastSentAt ? "Contacted" : el.status === "active" ? "Pending" : "Queued";
                          const statusColor = el.lastSentAt ? "text-green-700 bg-green-50" : el.status === "active" ? "text-amber-700 bg-amber-50" : "text-blue-700 bg-blue-50";
                          return (
                            <div key={el.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[#f4f4f4] last:border-b-0 hover:bg-[#fafafa]">
                              <div className="flex items-center gap-3">
                                {statusIcon}
                                <div>
                                  <div className="text-[13px] font-semibold">{lead ? `${lead.firstName} ${lead.lastName}` : `Lead #${el.leadId}`}</div>
                                  <div className="text-[11px] text-[#888]">{lead?.company || "Unknown"} · {lead?.email || "No email"}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
                                {el.lastSentAt && <span className="text-[10px] text-[#aaa]">{new Date(el.lastSentAt).toLocaleDateString()}</span>}
                                {el.status === "bounced" && (
                                  <button onClick={() => { setResendLeadId(el.leadId); setResendEmail(lead?.email || ""); }} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                                    <RefreshCw className="h-2.5 w-2.5" /> Resend
                                  </button>
                                )}
                                <button onClick={() => handleRemoveFromCampaign(el.id)} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors">
                                  <X className="h-2.5 w-2.5" /> Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Preview */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-5">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Email Preview</h3>
        <p className="text-[13px] text-[#888] mb-4">See exactly what the personalized email will look like before it goes out</p>
        <div className="flex gap-3 mb-4">
          {["existing_customers", "new_local", "new_national"].map(t => (
            <button key={t} onClick={() => { setPreviewTrack(t); setShowPreview(true); }} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${previewTrack === t && showPreview ? "bg-[#1a4750] text-white" : "bg-[#f4f7f6] text-[#444] hover:bg-[#e8f0f0]"}`}>
              {t === "existing_customers" ? "Existing Customer" : t === "new_local" ? "New Local" : "New National"}
            </button>
          ))}
        </div>
        {showPreview && (
          <div className="border border-[#e8e8ee] rounded-xl overflow-hidden">
            <div className="bg-[#f8f9fb] px-5 py-3 border-b border-[#e8e8ee] flex justify-between items-center">
              <div className="text-[13px] font-semibold text-[#666]">Preview — {previewTrack === "existing_customers" ? "Existing Customer" : previewTrack === "new_local" ? "New Local" : "New National"} Track</div>
              <div className="text-[11px] text-[#aaa]">Personalized for: Sarah Chen, PCL Construction</div>
            </div>
            <div className="p-5">
              <div className="mb-3">
                <span className="text-[11px] font-semibold text-[#888]">From:</span>
                <span className="text-[13px] ml-2">Rob McMullen &lt;rob@outreach-fenceline.ca&gt;</span>
              </div>
              <div className="mb-3">
                <span className="text-[11px] font-semibold text-[#888]">To:</span>
                <span className="text-[13px] ml-2">sarah.chen@pcl.com</span>
              </div>
              <div className="mb-4">
                <span className="text-[11px] font-semibold text-[#888]">Subject:</span>
                <span className="text-[13px] ml-2 font-semibold">
                  {previewTrack === "existing_customers" ? "FenceLine pricing for PCL Construction fence purchases" : previewTrack === "new_local" ? "PCL Construction + FenceLine — fencing for your projects" : "Competitive fence pricing for Alberta projects"}
                </span>
              </div>
              <div className="border-t border-[#eee] pt-4">
                <div className="text-[13px] text-[#444] leading-relaxed whitespace-pre-line">
                  {previewTrack === "existing_customers"
                    ? "Hi Sarah,\n\nI wanted to make sure you received FenceLine's pricing specifically for PCL Construction. We've worked together on rentals, and I wanted to let you know we now offer wholesale fence sales as well — temp fence, chain link, ornamental, and construction hoarding.\n\nHappy to send over a quote if you have anything coming up.\n\nCheers,\nRob McMullen\nFenceLine | Fence Sales"
                    : previewTrack === "new_local"
                    ? "Hi Sarah,\n\nI noticed PCL Construction has projects underway in Edmonton. Whether you're looking at temporary construction fencing, permanent perimeter fence, or hoarding panels — we supply and install across Alberta.\n\nWould it be worth a quick conversation about your fencing needs?\n\nCheers,\nRob McMullen\nFenceLine | Fence Sales"
                    : "Hi Sarah,\n\nI know you're managing projects in Alberta. Our fence pricing is competitive nationally — temp fence, chain link, security fencing, and construction hoarding shipped anywhere in Canada.\n\nIf you've got projects coming up that need fencing, I'd be happy to put together a quote.\n\nCheers,\nRob McMullen\nFenceLine | Fence Sales"}
                </div>
                <div className="mt-4 pt-3 border-t border-[#eee]">
                  <p className="text-[11px] text-[#aaa] italic">This email was sent by FenceLine (outreach-fenceline.ca) regarding fencing services. If you no longer wish to receive these emails, <span className="underline">click here to unsubscribe</span>. FenceLine, Edmonton, AB, Canada.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enroll Leads Modal */}
      {enrollCampaignId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-[#eee]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[16px] font-bold text-[#1a4750]">Enroll Leads in Campaign</h3>
                  <p className="text-[12px] text-[#888] mt-1">Select contacts to add to this outreach sequence</p>
                </div>
                <button onClick={() => setEnrollCampaignId(null)} className="text-[#888] hover:text-[#333] text-[20px]">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {!allLeads || allLeads.length === 0 ? (
                <div className="text-center py-8 text-[#888]">
                  <p className="text-[14px]">No leads in database yet.</p>
                  <p className="text-[12px] mt-1">Import contacts from the Find page first.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" checked={selectedLeadIds.length === allLeads.length} onChange={selectAllLeads} className="w-4 h-4 accent-[#1a4750]" />
                    <span className="text-[13px] font-semibold">Select All ({allLeads.length} contacts)</span>
                    {selectedLeadIds.length > 0 && <span className="badge-green">{selectedLeadIds.length} selected</span>}
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {allLeads.map((lead: any) => (
                      <label key={lead.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[#eee] hover:border-[#ccc] cursor-pointer transition-colors">
                        <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} className="w-4 h-4 accent-[#1a4750]" />
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold">{lead.firstName} {lead.lastName}</div>
                          <div className="text-[11px] text-[#888]">{lead.company} · {lead.email || "No email"}</div>
                        </div>
                        <span className="text-[11px] text-[#aaa]">{lead.segment || "new"}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-[#eee] flex justify-end gap-2">
              <button onClick={() => setEnrollCampaignId(null)} className="px-4 py-2 text-[13px] font-semibold border border-[#ddd] rounded-lg">Cancel</button>
              <button onClick={handleEnroll} disabled={selectedLeadIds.length === 0 || enrollLeads.isPending} className="inline-flex items-center gap-1 px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50">
                {enrollLeads.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                Enroll {selectedLeadIds.length} Lead{selectedLeadIds.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Modal */}
      {resendLeadId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5">
            <h3 className="text-[16px] font-bold text-[#1a4750] mb-2">Update Email & Resend</h3>
            <p className="text-[12px] text-[#888] mb-3">The previous email bounced. Update the address and the lead will be re-queued for sending.</p>
            <input value={resendEmail} onChange={e => setResendEmail(e.target.value)} placeholder="new.email@company.com" className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px] mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setResendLeadId(null)} className="px-4 py-2 text-[13px] font-semibold border border-[#ddd] rounded-lg">Cancel</button>
              <button onClick={() => handleResend(resendLeadId)} disabled={!resendEmail || updateLead.isPending} className="px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50">
                {updateLead.isPending ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}Update & Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
