export default function Templates() {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Email Templates</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Build personalized outreach templates with dynamic fields</p>
      <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Each segment gets its own email template. Dynamic fields like <code className="bg-[#e8f0f0] px-1.5 py-0.5 rounded text-[12px] font-mono">{"{{first_name}}"}</code> and <code className="bg-[#e8f0f0] px-1.5 py-0.5 rounded text-[12px] font-mono">{"{{company_name}}"}</code> are filled automatically per contact. Every email reads like it was written by hand.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { track: "Existing Customer — Fence Sales", trackLabel: "Existing Customers Track", color: "#10b981", subject: "FenceLine pricing for {{company_name}} fence purchases", body: "Hi {{first_name}}, I wanted to make sure you received FenceLine's pricing specifically for {{company_name}}. We've worked together on rentals, and I wanted to let you know we now offer wholesale fence sales as well...", vars: ["{{first_name}}", "{{company_name}}", "{{pricing_link}}"] },
          { track: "New Local — Personalized Intro", trackLabel: "New Local Track", color: "#3b82f6", subject: "{{company_name}} + FenceLine — site services", body: "Hi {{first_name}}, I noticed {{company_name}} has {{project_reference}} underway. Whether you're looking at temporary fencing, portable sanitation, or waste bins...", vars: ["{{first_name}}", "{{company_name}}", "{{project_reference}}"] },
          { track: "New National — Ontario/BC", trackLabel: "New National Track", color: "#f59e0b", subject: "Competitive fence pricing for {{region}} projects", body: "Hi {{first_name}}, I know you're managing projects in {{region}}. Our pricing is competitive nationally — when fence comes through Vancouver...", vars: ["{{first_name}}", "{{company_name}}", "{{region}}"] },
        ].map(t => (
          <div key={t.track} className="bg-white rounded-xl border border-[#e8e8ee] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-8 rounded" style={{ background: t.color }} />
              <div>
                <div className="text-[14px] font-semibold">{t.track}</div>
                <div className="text-[12px] text-[#888] mt-0.5">{t.trackLabel}</div>
              </div>
            </div>
            <div className="p-3 bg-[#f8f9fb] rounded-lg mb-4">
              <div className="text-[11px] font-semibold text-[#888] mb-1">Subject</div>
              <div className="text-[13px] font-mono">{t.subject}</div>
            </div>
            <p className="text-[13px] text-[#666] leading-relaxed mb-3">{t.body}</p>
            <div className="flex gap-2 flex-wrap">
              {t.vars.map(v => (
                <span key={v} className="px-2 py-0.5 rounded bg-[#e8f0f0] text-[#1a4750] text-[11px] font-mono">{v}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-5">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Sender Profiles</h3>
        <p className="text-[13px] text-[#888] mb-5">Each sender has their own voice and tone — so emails feel personal, not automated</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-[#eee] rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#e8f0fe] flex items-center justify-center text-[14px] font-bold text-[#1a4750]">RM</div>
              <div>
                <div className="text-[14px] font-semibold">Rob McMullen</div>
                <div className="text-[12px] text-[#888]">Fence Sales — rob@fenceline.ca</div>
              </div>
            </div>
            <div className="text-[13px] text-[#666]">Tone: Friendly, direct, personal. References specific projects by name. Keeps it short and to the point.</div>
          </div>
          <div className="p-4 border border-dashed border-[#ddd] rounded-lg flex items-center justify-center cursor-pointer text-[#aaa]">
            <div className="text-center">
              <div className="text-[24px] mb-1">+</div>
              <div className="text-[13px] font-medium">Add Sender Profile</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
