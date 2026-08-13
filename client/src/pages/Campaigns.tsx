export default function Campaigns() {
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
          <div className="p-3.5 bg-white rounded-lg border border-[#e8e8ee]"><div className="text-[13px] font-semibold mb-1">Human-Pace Sending</div><div className="text-[12px] text-[#888]">3-8 minute randomized delays.</div></div>
          <div className="p-3.5 bg-white rounded-lg border border-[#e8e8ee]"><div className="text-[13px] font-semibold mb-1">CASL Compliance</div><div className="text-[12px] text-[#888]">Auto unsubscribe links, consent tracking.</div></div>
          <div className="p-3.5 bg-white rounded-lg border border-[#e8e8ee]"><div className="text-[13px] font-semibold mb-1">Volume Controls</div><div className="text-[12px] text-[#888]">20 emails/day, scale to 50 after warm-up.</div></div>
        </div>
      </div>
      {/* Active Campaigns */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
        <div className="flex justify-between items-center mb-4">
          <div><h3 className="text-[16px] font-bold text-[#1a4750]">Active Campaigns</h3><p className="text-[13px] text-[#888]">Campaigns will appear here once created</p></div>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4750] text-white rounded-lg text-[14px] font-semibold">+ New Campaign</button>
        </div>
        <div className="text-center py-12 text-[#aaa]">
          <p className="text-[14px]">No campaigns created yet. Import contacts from Find, then create a campaign to start outreach.</p>
        </div>
      </div>
    </div>
  );
}
