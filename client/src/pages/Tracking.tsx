export default function Tracking() {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Engagement Tracking</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Monitor opens, clicks, replies, and bounces across all campaigns</p>
      <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Every email is tracked. Contacts who open multiple times, click your pricing link, or reply are flagged as hot leads for immediate follow-up. Bounced addresses are automatically removed so your sender reputation stays clean.</p>
      </div>
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mb-5">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Bounce Management</h3>
        <p className="text-[13px] text-[#888] mb-4">Invalid addresses are automatically removed to protect your sender reputation</p>
        <div className="p-3.5 bg-[#f4f7f5] border border-[#c4d8cc] rounded-lg flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3d6b50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-[13px] text-[#2d5a4e] font-medium">Automatic bounce removal is active — bounced addresses are excluded from all future sends</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3.5 bg-[#f8f9fb] rounded-lg"><div className="text-[11px] font-semibold text-[#888]">Hard Bounces</div><div className="text-[18px] font-bold mt-1">2</div><div className="text-[12px] text-[#888] mt-0.5">Removed permanently</div></div>
          <div className="p-3.5 bg-[#f8f9fb] rounded-lg"><div className="text-[11px] font-semibold text-[#888]">Soft Bounces</div><div className="text-[18px] font-bold mt-1">0</div><div className="text-[12px] text-[#888] mt-0.5">Retried up to 3 times</div></div>
          <div className="p-3.5 bg-[#f8f9fb] rounded-lg"><div className="text-[11px] font-semibold text-[#888]">Deliverability Score</div><div className="text-[18px] font-bold mt-1 text-[#10b981]">97.6%</div><div className="text-[12px] text-[#888] mt-0.5">Above 95% target</div></div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Emails Sent", value: "83", sub: "Across 2 active campaigns" },
          { label: "Open Rate", value: "34%", sub: "Above 20-25% industry avg" },
          { label: "Reply Rate", value: "7.2%", sub: "6 replies received" },
          { label: "Bounce Rate", value: "2.4%", sub: "Under 3% target" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#e8e8ee] p-5">
            <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider">{s.label}</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1 text-[#1a4750]">{s.value}</div>
            <div className="text-[12px] text-[#aaa] mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Hot Leads</h3>
        <p className="text-[13px] text-[#888] mb-4">Contacts who opened, clicked, or replied — flagged for immediate follow-up</p>
        <table className="w-full">
          <thead><tr className="border-b border-[#eee]">
            <th className="text-left py-3 px-4 text-[11px] font-bold text-[#999] uppercase tracking-wider">Contact</th>
            <th className="text-left py-3 px-4 text-[11px] font-bold text-[#999] uppercase tracking-wider">Company</th>
            <th className="text-left py-3 px-4 text-[11px] font-bold text-[#999] uppercase tracking-wider">Action</th>
            <th className="text-left py-3 px-4 text-[11px] font-bold text-[#999] uppercase tracking-wider">When</th>
            <th className="text-left py-3 px-4 text-[11px] font-bold text-[#999] uppercase tracking-wider">Intent</th>
          </tr></thead>
          <tbody>
            {[
              { name: "Mark Trevors", company: "AECON", action: 'Replied — "Send me pricing for our Hamilton LRT project"', when: "2 hours ago", intent: "High" },
              { name: "Jennifer Coldwell", company: "PCL Construction", action: "Opened 3x, clicked pricing link", when: "4 hours ago", intent: "High" },
              { name: "David Park", company: "EllisDon", action: 'Replied — "Forwarded to our procurement lead"', when: "Yesterday", intent: "Medium" },
              { name: "Chris Breault", company: "Graham Construction", action: 'Replied — "Interested in fence sales"', when: "2 days ago", intent: "High" },
            ].map(l => (
              <tr key={l.name} className="border-b border-[#f4f4f8]">
                <td className="py-3.5 px-4 text-[14px] font-semibold">{l.name}</td>
                <td className="py-3.5 px-4 text-[14px]">{l.company}</td>
                <td className="py-3.5 px-4 text-[14px]">{l.action}</td>
                <td className="py-3.5 px-4 text-[14px]">{l.when}</td>
                <td className="py-3.5 px-4"><span className={l.intent === "High" ? "badge-green" : "badge-amber"}>🔥 {l.intent}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
