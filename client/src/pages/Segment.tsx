export default function Segment() {
  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Segment Contacts</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Organize contacts by company type, region, and relationship status</p>
      <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Contacts imported from the Find page are automatically sorted into segments using rules you define. Existing customers are matched against your uploaded customer list so they never receive a cold introduction. New contacts are split by geography — local Alberta vs. national.</p>
      </div>
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mb-5">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Segment Rules</h3>
        <p className="text-[13px] text-[#888] mb-5">Contacts are automatically categorized based on these rules</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: "Existing Customers", color: "#2d6b6b", desc: "Contacts from companies already in your customer list", rule: "Match against uploaded customer list" },
            { name: "New Local Prospects", color: "#1a4750", desc: "New contacts within Alberta — Edmonton, Calgary, Red Deer", rule: "Not in customer list + Alberta region" },
            { name: "New National Prospects", color: "#5a7d8a", desc: "New contacts outside Alberta — Ontario, BC, Saskatchewan", rule: "Not in customer list + outside Alberta" },
          ].map(seg => (
            <div key={seg.name} className="bg-white rounded-xl border border-[#e8e8ee] p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                <span className="text-[14px] font-semibold">{seg.name}</span>
              </div>
              <p className="text-[13px] text-[#888] leading-relaxed mb-3">{seg.desc}</p>
              <div className="p-3 bg-[#f8f9fb] rounded-lg text-[12px] text-[#666]">Rule: {seg.rule}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#1a4750]">Contact List</h3>
            <p className="text-[13px] text-[#888]">Contacts will appear here after importing from Find</p>
          </div>
        </div>
        <div className="text-center py-12 text-[#aaa]">
          <p className="text-[14px]">No contacts imported yet. Go to Find to source contacts.</p>
        </div>
      </div>
    </div>
  );
}
