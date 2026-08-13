export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Settings</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Connect your data sources and configure the lead engine</p>

      {/* Future Service Expansion */}
      <div className="mt-6">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Service Categories</div>
        <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mb-4">
          <p className="text-[13px] text-[#444] leading-relaxed">Currently focused on <strong>fencing</strong> (temporary, permanent, hoarding, event, security). Additional service lines can be enabled for future outreach campaigns when ready.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-lg border border-[#e8e8ee]">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold">Fencing (All Types)</div>
              <span className="badge-green">Active</span>
            </div>
            <div className="text-[12px] text-[#888] mt-1">Temp fence, perm fence, hoarding, event, security</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-dashed border-[#ddd] opacity-60">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold text-[#999]">Portable Toilets</div>
              <span className="badge-gray">Phase 2</span>
            </div>
            <div className="text-[12px] text-[#aaa] mt-1">LittleJohns brand · Enable when ready to expand</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-dashed border-[#ddd] opacity-60">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold text-[#999]">Waste Bins / Dumpsters</div>
              <span className="badge-gray">Phase 2</span>
            </div>
            <div className="text-[12px] text-[#aaa] mt-1">Construction waste removal · Enable when ready</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-dashed border-[#ddd] opacity-60">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold text-[#999]">Walkways & Handwash</div>
              <span className="badge-gray">Phase 2</span>
            </div>
            <div className="text-[12px] text-[#aaa] mt-1">Pedestrian walkways, handwash stations · Enable when ready</div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Domain Reputation Protection</div>
        <div className="p-4 bg-[#f4f7f5] border border-[#c4d8cc] rounded-xl flex items-center gap-3 mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d6b50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          <div>
            <div className="text-[14px] font-semibold text-[#2d5a4e]">Primary Domain Protected</div>
            <div className="text-[12px] text-[#555]">fenceline.ca is never used for outreach. All campaigns use isolated sending domains.</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-[#1a4750]">Sending Domains</h3>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[14px] font-semibold">+ Add Domain</button>
          </div>
          <div className="p-4 border border-[#eee] rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[14px] font-semibold font-mono">outreach-fenceline.ca</div>
                <div className="text-[12px] text-[#888] mt-0.5">Added Jun 1 · SPF ✓ · DKIM ✓ · DMARC ✓</div>
              </div>
              <span className="badge-green">Warmed — Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Contact Finding</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: "Hunter.io", desc: "Email pattern detection & verification. Enter a company domain, get the format and verified addresses.", cost: "$49/mo" },
            { name: "Apollo.io", desc: "200M+ B2B contacts database with verified emails, titles, and LinkedIn URLs.", cost: "$49-79/mo" },
          ].map(c => (
            <div key={c.name} className="bg-white rounded-xl border border-[#e8e8ee] p-5">
              <h4 className="text-[14px] font-semibold mb-1">{c.name}</h4>
              <p className="text-[12px] text-[#888] leading-relaxed mb-3">{c.desc}</p>
              <div className="text-[11px] font-semibold text-[#8c7355]">Click to connect — {c.cost}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">Lead Sourcing</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: "SerpAPI", desc: "Web search API for finding companies, tenders, construction permits, and project announcements.", cost: "$50/mo" },
            { name: "Scott's Directories", desc: "Canadian business directory API. Requires existing subscription with API access.", cost: "Client subscription" },
          ].map(c => (
            <div key={c.name} className="bg-white rounded-xl border border-[#e8e8ee] p-5">
              <h4 className="text-[14px] font-semibold mb-1">{c.name}</h4>
              <p className="text-[12px] text-[#888] leading-relaxed mb-3">{c.desc}</p>
              <div className="text-[11px] font-semibold text-[#8c7355]">Click to connect — {c.cost}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-3">CRM Integration (Optional)</div>
        <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mb-4">
          <p className="text-[13px] text-[#555] leading-relaxed">The system works independently — no CRM dependency required. If you'd like to connect Salesforce or another CRM in the future, warm leads and engagement data can sync automatically. This is available as a Phase 2 add-on whenever you're ready.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: "Salesforce", desc: "Route warm leads as Call Tasks directly into Salesforce. Sync engagement data and contact records automatically." },
            { name: "HubSpot", desc: "Alternative CRM integration. Contacts, deals, and engagement data sync both ways." },
          ].map(c => (
            <div key={c.name} className="bg-white rounded-xl border border-dashed border-[#d4ddd8] p-5">
              <h4 className="text-[14px] font-semibold mb-1">{c.name}</h4>
              <p className="text-[12px] text-[#888] leading-relaxed mb-3">{c.desc}</p>
              <div className="text-[11px] font-semibold text-[#8c7355]">Available when ready — not required to start</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
