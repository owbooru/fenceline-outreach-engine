import { useLocation } from "wouter";
import { Search, Filter, Send, Activity } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Dashboard</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Overview of your lead engine activity</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[
          { label: "Contacts Found", value: "247", sub: "Across 14 companies this week", color: "#1a4750" },
          { label: "Verified Emails", value: "218", sub: "88% verification rate", color: "#2d6b6b" },
          { label: "Campaigns Active", value: "2", sub: "Fence Sales AB + National", color: "#5a7d8a" },
          { label: "Response Rate", value: "7.2%", sub: "Above 5% industry average", color: "#7d8a8e" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#e8e8ee] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.06]" style={{ background: stat.color }} />
            <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider">{stat.label}</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1 text-[#1a4750]">{stat.value}</div>
            <div className="text-[12px] text-[#aaa] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Active Campaigns + Hot Leads */}
      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-[#1a4750]">Active Campaigns</h3>
            <span className="badge-green">2 running</span>
          </div>
          <div className="p-3 border border-[#eee] rounded-lg mb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1 h-7 rounded bg-[#2d6b6b]" />
                <div>
                  <div className="text-[13px] font-semibold">Fence Sales — Existing AB</div>
                  <div className="text-[11px] text-[#888]">Rob McMullen · 10/day</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px] text-[#666]">
                <span><strong>46</strong> sent</span>
                <span><strong>38%</strong> opened</span>
                <span><strong>4</strong> replies</span>
              </div>
            </div>
          </div>
          <div className="p-3 border border-[#eee] rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1 h-7 rounded bg-[#5a7d8a]" />
                <div>
                  <div className="text-[13px] font-semibold">Fence Sales — National ON/BC</div>
                  <div className="text-[11px] text-[#888]">Rob McMullen · 8/day</div>
                </div>
              </div>
              <div className="flex gap-3 text-[12px] text-[#666]">
                <span><strong>37</strong>/89</span>
                <span><strong>29%</strong> opened</span>
                <span><strong>2</strong> replies</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-bold text-[#1a4750]">Hot Leads — Needs Follow-Up</h3>
            <span className="badge-green">3 high intent</span>
          </div>
          {[
            { name: "Mark Trevors", company: "AECON", action: "Replied 2h ago", msg: '"Send me pricing for our Hamilton LRT project"' },
            { name: "Jennifer Coldwell", company: "PCL", action: "Clicked 3x", msg: "Opened 3 times, clicked pricing link" },
            { name: "Chris Breault", company: "Graham", action: "Replied 2d ago", msg: '"Interested in fence sales for upcoming project"' },
          ].map((lead) => (
            <div key={lead.name} className="p-2.5 rounded-lg bg-[#f4f7f5] border border-[#c4d8cc] mb-1.5 last:mb-0">
              <div className="flex justify-between items-center">
                <div><span className="text-[13px] font-semibold">{lead.name}</span> <span className="text-[12px] text-[#888]">{lead.company}</span></div>
                <span className="text-[11px] text-[#2d5a4e] font-semibold">🔥 {lead.action}</span>
              </div>
              <div className="text-[12px] text-[#555] mt-0.5">{lead.msg}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-5">
        <h3 className="text-[16px] font-bold text-[#1a4750]">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { icon: Search, label: "Source Leads", desc: "Scrape directories, web, and LinkedIn", path: "/find", color: "#1a4750" },
            { icon: Filter, label: "Manage Leads", desc: "View, filter, and segment contacts", path: "/segment", color: "#3d6b50" },
            { icon: Send, label: "Campaigns", desc: "Build and launch outreach sequences", path: "/campaigns", color: "#8c7355" },
            { icon: Activity, label: "Engagement", desc: "Track opens, clicks, and replies", path: "/tracking", color: "#5a7080" },
          ].map((action) => (
            <div
              key={action.label}
              onClick={() => setLocation(action.path)}
              className="p-5 border border-[#eee] rounded-xl cursor-pointer transition-all hover:border-[#1a4750]/30 hover:bg-[#f8faff]"
            >
              <div className="flex items-center gap-2 mb-2">
                <action.icon className="h-5 w-5" style={{ color: action.color }} />
                <span className="text-[14px] font-semibold">{action.label}</span>
              </div>
              <p className="text-[12px] text-[#888]">{action.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
