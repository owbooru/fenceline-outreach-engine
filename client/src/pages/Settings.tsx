import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [showConnectorForm, setShowConnectorForm] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  const { data: domains, refetch: refetchDomains } = trpc.domains.list.useQuery();
  const createDomain = trpc.domains.create.useMutation({ onSuccess: () => { refetchDomains(); setShowDomainForm(false); setDomainName(""); } });
  const { data: integrations, refetch: refetchIntegrations } = trpc.integrations.list.useQuery();
  const upsertIntegration = trpc.integrations.upsert.useMutation({ onSuccess: () => { refetchIntegrations(); setShowConnectorForm(null); setApiKey(""); } });

  const handleAddDomain = () => {
    if (!domainName || domainName === "fenceline.ca") return;
    createDomain.mutate({ domain: domainName });
  };

  const handleConnectService = (service: string) => {
    if (!apiKey) return;
    const providerMap: Record<string, "salesforce" | "scotts_directories" | "linkedin" | "email_provider"> = {
      hunter: "email_provider", apollo: "linkedin", serpapi: "scotts_directories",
      scotts: "scotts_directories", zerobounce: "email_provider", instantly: "email_provider",
      gmail: "email_provider", merx: "scotts_directories", apc: "scotts_directories",
      salesforce: "salesforce", hubspot: "salesforce",
    };
    const provider = providerMap[service] || "scotts_directories";
    upsertIntegration.mutate({ provider, configData: { apiKey, enabled: true, serviceName: service }, isActive: true });
  };

  const isConnected = (service: string) => {
    return integrations?.some((i: any) => {
      const config = typeof i.configData === "string" ? JSON.parse(i.configData) : i.configData;
      return config?.serviceName === service && i.isActive;
    });
  };

  const ConnectorCard = ({ id, name, desc, cost, dashed }: { id: string; name: string; desc: string; cost: string; dashed?: boolean }) => (
    <div className={`bg-white rounded-xl p-5 ${dashed ? "border border-dashed border-[#d4ddd8]" : "border border-[#e8e8ee]"}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-[14px] font-semibold">{name}</h4>
        {isConnected(id) && <span className="badge-green">Connected</span>}
      </div>
      <p className="text-[12px] text-[#888] leading-relaxed mb-3">{desc}</p>
      {showConnectorForm === id ? (
        <div className="flex gap-2">
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste API key..." className="flex-1 px-3 py-1.5 rounded-lg border border-[#ddd] text-[12px]" />
          <button onClick={() => handleConnectService(id)} disabled={upsertIntegration.isPending} className="px-3 py-1.5 bg-[#1a4750] text-white rounded-lg text-[12px] font-semibold disabled:opacity-50">
            {upsertIntegration.isPending ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Connect"}
          </button>
          <button onClick={() => setShowConnectorForm(null)} className="px-3 py-1.5 border border-[#ddd] rounded-lg text-[12px]">Cancel</button>
        </div>
      ) : (
        <button onClick={() => { setShowConnectorForm(id); setApiKey(""); }} className="text-[11px] font-semibold text-[#8c7355]">
          {isConnected(id) ? "Update API key" : `Click to connect — ${cost}`}
        </button>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Settings</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Connect your data sources and configure the lead engine</p>

      {/* Domain Reputation Protection */}
      <div className="mt-6">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Domain Reputation Protection</div>
        <div className="p-4 bg-[#f4f7f5] border border-[#c4d8cc] rounded-xl flex items-center gap-3 mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d6b50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          <div>
            <div className="text-[14px] font-semibold text-[#2d5a4e]">Primary Domain Protected</div>
            <div className="text-[12px] text-[#555]">fenceline.ca is never used for outreach. All campaigns use isolated sending domains to maintain deliverability and protect your brand reputation.</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-[#1a4750]">Sending Domains</h3>
            <button onClick={() => setShowDomainForm(true)} className="px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold">+ Add Domain</button>
          </div>
          {showDomainForm && (
            <div className="p-4 border border-[#1a4750] rounded-lg bg-[#f8fafb] mb-4">
              <div className="p-3 bg-[#f8f4f4] border border-[#d8c8c8] rounded-lg mb-3">
                <div className="text-[13px] font-semibold text-[#8c4444]">⚠️ Never use fenceline.ca as a sending domain</div>
                <div className="text-[12px] text-[#666] mt-1">All outreach must use isolated domains to protect primary domain reputation.</div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#888] block mb-1">Domain Name</label>
                  <input value={domainName} onChange={e => setDomainName(e.target.value)} placeholder="e.g., outreach-fenceline.ca" className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]" />
                </div>
                <button onClick={handleAddDomain} disabled={createDomain.isPending || !domainName} className="px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50">
                  {createDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Add Domain"}
                </button>
                <button onClick={() => setShowDomainForm(false)} className="px-4 py-2 border border-[#ddd] rounded-lg text-[13px] font-semibold">Cancel</button>
              </div>
              {domainName === "fenceline.ca" && <p className="text-[12px] text-red-500 mt-2">Cannot use fenceline.ca — primary domain must remain protected.</p>}
            </div>
          )}
          <div className="space-y-2">
            {domains && domains.length > 0 ? domains.map((d: any) => (
              <div key={d.id} className="p-4 border border-[#eee] rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[14px] font-semibold font-mono">{d.domain}</div>
                    <div className="text-[12px] text-[#888] mt-0.5">SPF {d.spfVerified ? "✓" : "○"} · DKIM {d.dkimVerified ? "✓" : "○"} · DMARC {d.dmarcVerified ? "✓" : "○"}</div>
                  </div>
                  <span className={d.status === "active" ? "badge-green" : "badge-amber"}>{d.status === "active" ? "Warmed — Ready" : d.status}</span>
                </div>
              </div>
            )) : (
              <div className="p-4 border border-[#eee] rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[14px] font-semibold font-mono">outreach-fenceline.ca</div>
                    <div className="text-[12px] text-[#888] mt-0.5">Added Jun 1 · SPF ✓ · DKIM ✓ · DMARC ✓</div>
                  </div>
                  <span className="badge-green">Warmed — Ready</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Finding */}
      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Contact Finding</div>
        <div className="grid grid-cols-2 gap-4">
          <ConnectorCard id="hunter" name="Hunter.io" desc="Email pattern detection & verification. Enter a company domain, get the format and verified addresses." cost="$49/mo" />
          <ConnectorCard id="apollo" name="Apollo.io" desc="200M+ B2B contacts database with verified emails, titles, and LinkedIn URLs." cost="$49-79/mo" />
        </div>
      </div>

      {/* Lead Sourcing */}
      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Lead Sourcing</div>
        <div className="grid grid-cols-2 gap-4">
          <ConnectorCard id="serpapi" name="SerpAPI" desc="Web search API for finding companies, tenders, construction permits, and project announcements." cost="$50/mo" />
          <ConnectorCard id="scotts" name="Scott's Directories" desc="Canadian business directory API. Requires existing subscription with API access." cost="Client subscription" />
        </div>
      </div>

      {/* Email Verification */}
      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Email Verification</div>
        <div className="grid grid-cols-2 gap-4">
          <ConnectorCard id="zerobounce" name="ZeroBounce" desc="Email verification before sending. Prevents bounces that damage sender reputation." cost="$50/mo" />
          <div className="bg-white rounded-xl border border-dashed border-[#ddd] p-5 flex items-center justify-center cursor-pointer text-[#aaa] hover:border-[#bbb] transition-colors">
            <div className="text-center"><div className="text-[24px] mb-1">+</div><div className="text-[13px] font-medium">Add Custom Source</div></div>
          </div>
        </div>
      </div>

      {/* Outreach Sending */}
      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Outreach Sending</div>
        <div className="grid grid-cols-2 gap-4">
          <ConnectorCard id="instantly" name="Instantly" desc="Cold outreach platform with inbox rotation, warm-up, and deliverability monitoring." cost="$47/mo" />
          <ConnectorCard id="gmail" name="Gmail API" desc="Send one-to-one personalized emails at human pace through Google Workspace." cost="Free w/ Google Workspace" />
        </div>
      </div>

      {/* Tender Monitoring */}
      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Tender Monitoring</div>
        <div className="grid grid-cols-2 gap-4">
          <ConnectorCard id="merx" name="MERX / Procurement" desc="Government tender and RFP monitoring for construction and site services across Canada." cost="Varies" />
          <ConnectorCard id="apc" name="Alberta Purchasing Connection" desc="Alberta government procurement portal. Free, public access. Daily automated monitoring." cost="Free" />
        </div>
      </div>

      {/* CRM Integration */}
      <div className="mt-8 mb-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">CRM Integration (Optional)</div>
        <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mb-4">
          <p className="text-[13px] text-[#555] leading-relaxed">The system works independently — no CRM dependency required. If you'd like to connect Salesforce or another CRM in the future, warm leads and engagement data can sync automatically. This is available as a Phase 2 add-on whenever you're ready.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ConnectorCard id="salesforce" name="Salesforce" desc="Route warm leads as Call Tasks directly into Salesforce. Sync engagement data and contact records automatically." cost="Available when ready" dashed />
          <ConnectorCard id="hubspot" name="HubSpot" desc="Alternative CRM integration. Contacts, deals, and engagement data sync both ways." cost="Available when ready" dashed />
        </div>
      </div>
    </div>
  );
}
