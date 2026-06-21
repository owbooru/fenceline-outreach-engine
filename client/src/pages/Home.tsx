import { useState } from "react";
import { Zap, Search, Filter, FileText, Send, Activity, LayoutDashboard, Shield } from "lucide-react";

const steps = [
  {
    title: "Set your target criteria",
    body: (
      <div>
        <div className="flex gap-2 flex-wrap mb-2">
          {[
            { label: "Service", value: "Fence Sales" },
            { label: "Region", value: "All Alberta" },
            { label: "Industry", value: "GCs, Municipalities, Home Builders" },
            { label: "Roles", value: "Estimators, Buyers, PMs" },
          ].map((item) => (
            <div key={item.label} className="px-3 py-2 bg-white rounded-lg border border-[#ddd] text-[13px]">
              <span className="text-[12px] text-[#888] font-semibold">{item.label}:</span>{" "}
              <span>{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-[#666] mt-2">Tell the engine what you're selling, where, and who you want to reach — then it goes and finds them for you</p>
      </div>
    ),
  },
  {
    title: "Engine scrapes directories, websites, and the web",
    body: (
      <div>
        <div className="flex gap-2 flex-wrap mb-2">
          <span className="badge-blue">Scott's Directories: 14 companies, 380+ contacts</span>
          <span className="badge-blue">Web scrape: 9 company sites with team pages</span>
          <span className="badge-blue">Apollo.io: 290 verified contacts</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="badge-green">AECON (47)</span>
          <span className="badge-green">PCL (38)</span>
          <span className="badge-green">EllisDon (31)</span>
          <span className="badge-green">Graham (24)</span>
          <span className="badge-green">Clark Builders (19)</span>
          <span className="badge-green">+9 more companies</span>
        </div>
        <p className="text-[13px] text-[#666] mt-2">No page-by-page clicking through 20 names at a time. The engine finds every matching company and contact across all sources in seconds.</p>
      </div>
    ),
  },
  {
    title: "Finds active tenders and projects in the area",
    body: (
      <div>
        <div className="flex gap-2 flex-wrap mb-2">
          <span className="badge-amber">3 active RFPs for site services (MERX)</span>
          <span className="badge-amber">7 new building permits issued this week</span>
          <span className="badge-amber">2 demolition permits (new builds coming)</span>
        </div>
        <div className="p-3 bg-white rounded-lg border border-[#ddd] mt-2">
          <div className="text-[12px] font-semibold text-[#888] mb-1">Example tender found</div>
          <div className="text-[13px] text-[#444] leading-relaxed">
            <strong>City of Edmonton — Temporary Fencing for LRT Valley Line West</strong><br />
            RFP posted June 16 · Closes July 4 · Est. 2,400 linear feet · Contact: Procurement Office
          </div>
        </div>
        <p className="text-[13px] text-[#666] mt-2">The engine monitors MERX, Alberta Purchasing Connection, and municipal procurement portals daily. You know about projects before your competitors do.</p>
      </div>
    ),
  },
  {
    title: "Filters by target roles across all companies",
    body: (
      <div>
        <div className="flex gap-2 flex-wrap">
          <span className="badge-green">Estimators (52)</span>
          <span className="badge-green">Buyers (28)</span>
          <span className="badge-green">Project Managers (41)</span>
          <span className="badge-green">Procurement (19)</span>
          <span className="badge-green">Project Coordinators (23)</span>
          <span className="badge-green">Site Supers (15)</span>
        </div>
        <p className="text-[13px] text-[#666] mt-2">670+ raw contacts narrowed to 178 decision-makers across 14 companies — only the people who actually make purchasing decisions</p>
      </div>
    ),
  },
  {
    title: "Detects email patterns per company",
    body: (
      <div>
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3 py-2 bg-white rounded-lg border border-[#ddd]">
            <span className="font-mono text-[12px]">first.last@aecon.com</span>{" "}
            <span className="badge-green text-[10px]">92%</span>
          </div>
          <div className="px-3 py-2 bg-white rounded-lg border border-[#ddd]">
            <span className="font-mono text-[12px]">flast@pcl.com</span>{" "}
            <span className="badge-green text-[10px]">89%</span>
          </div>
          <div className="px-3 py-2 bg-white rounded-lg border border-[#ddd]">
            <span className="font-mono text-[12px]">first.last@ellisdon.com</span>{" "}
            <span className="badge-green text-[10px]">94%</span>
          </div>
          <div className="px-3 py-2 bg-white rounded-lg border border-[#ddd]">
            <span className="font-mono text-[12px]">firstl@graham.ca</span>{" "}
            <span className="badge-amber text-[10px]">78%</span>
          </div>
        </div>
        <p className="text-[13px] text-[#666] mt-2">This is the work you're doing by hand right now — figuring out that "95% of AECON is firstname.lastname." The engine detects and verifies patterns for every company automatically.</p>
      </div>
    ),
  },
  {
    title: "Segments against your customer list",
    body: (
      <div>
        <div className="flex gap-3">
          <div className="px-5 py-2.5 bg-[#e6f9f0] rounded-lg text-center">
            <div className="text-[22px] font-extrabold text-[#0d7a3e]">46</div>
            <div className="text-[11px] text-[#0d7a3e] font-semibold">Existing Customers</div>
          </div>
          <div className="px-5 py-2.5 bg-[#e8f0fe] rounded-lg text-center">
            <div className="text-[22px] font-extrabold text-[#1a56db]">97</div>
            <div className="text-[11px] text-[#1a56db] font-semibold">New Local (AB)</div>
          </div>
          <div className="px-5 py-2.5 bg-[#fff8e6] rounded-lg text-center">
            <div className="text-[22px] font-extrabold text-[#b5850a]">35</div>
            <div className="text-[11px] text-[#b5850a] font-semibold">New National</div>
          </div>
        </div>
        <p className="text-[13px] text-[#666] mt-2">Each group gets a different message — existing customers hear about fence sales, new local prospects get an introduction, national contacts get competitive shipping pricing</p>
      </div>
    ),
  },
  {
    title: "Generates personalized emails per contact",
    body: (
      <div>
        <div className="p-3 bg-white rounded-lg border border-[#ddd] mb-2">
          <div className="text-[11px] text-[#888] font-semibold mb-1">Preview — Existing Customer Template → Sarah Mitchell, AECON</div>
          <div className="text-[13px] text-[#444] leading-relaxed">
            <strong>Subject:</strong> FenceLine pricing for AECON fence purchases<br />
            Hi Sarah, I wanted to make sure you received FenceLine's pricing specifically for AECON. We've worked together on rentals and I wanted to let you know we now offer wholesale fence sales as well...
          </div>
        </div>
        <div className="p-3 bg-white rounded-lg border border-[#ddd]">
          <div className="text-[11px] text-[#888] font-semibold mb-1">Preview — New National Template → David Park, EllisDon</div>
          <div className="text-[13px] text-[#444] leading-relaxed">
            <strong>Subject:</strong> Competitive fence pricing for Ontario projects<br />
            Hi David, I know EllisDon has the Hamilton LRT expansion underway. Our pricing is competitive nationally — when fence comes into the country through Vancouver...
          </div>
        </div>
        <p className="text-[13px] text-[#666] mt-2">178 personalized emails generated automatically — each one with the contact's name, company, and the right template for their segment. Same feel as writing them by hand.</p>
      </div>
    ),
  },
  {
    title: "Sends at human pace — tracks everything",
    body: (
      <div>
        <div className="flex gap-3 flex-wrap mb-4">
          {[
            { label: "Total Queued", value: "178 emails" },
            { label: "Daily Send Rate", value: "8-10 per sender" },
            { label: "Spacing", value: "3-8 min between" },
            { label: "Completion", value: "~18 business days" },
          ].map((item) => (
            <div key={item.label} className="px-4 py-2.5 bg-white rounded-lg border border-[#bbf7d0]">
              <div className="text-[11px] font-semibold text-[#888]">{item.label}</div>
              <div className="text-[17px] font-extrabold">{item.value}</div>
            </div>
          ))}
        </div>
        <p className="text-[14px] text-[#166534] font-semibold leading-relaxed">
          From criteria to 178 personalized emails — found, verified, segmented, written, and queued — without entering a single company name. Opens, clicks, and replies are tracked in real time. Hot leads get flagged for immediate follow-up.
        </p>
        <p className="text-[13px] text-[#166534] mt-2 leading-relaxed">
          All sends go through the isolated outreach domain — your primary fenceline.ca reputation is never at risk.
        </p>
      </div>
    ),
  },
];

export default function Home() {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = not started
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);

  const startExample = () => {
    setCurrentStep(0);
    setVisibleSteps([0]);
  };

  const advanceStep = (stepIdx: number) => {
    if (stepIdx <= currentStep) return;
    if (stepIdx > visibleSteps.length) return;
    setCurrentStep(stepIdx);
    if (!visibleSteps.includes(stepIdx)) {
      setVisibleSteps([...visibleSteps, stepIdx]);
    }
  };

  const resetExample = () => {
    setCurrentStep(-1);
    setVisibleSteps([]);
  };

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight">Dashboard</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Overview of your lead engine activity</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[
          { label: "Contacts Found", value: "247", sub: "Across 14 companies this week", color: "#3b82f6" },
          { label: "Verified Emails", value: "218", sub: "88% verification rate", color: "#10b981" },
          { label: "Campaigns Active", value: "2", sub: "Fence Sales AB + National", color: "#f59e0b" },
          { label: "Response Rate", value: "7.2%", sub: "Above 5% industry average", color: "#8b5cf6" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#e8e8ee] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.06]" style={{ background: stat.color }} />
            <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider">{stat.label}</div>
            <div className="text-[32px] font-extrabold tracking-tight mt-1">{stat.value}</div>
            <div className="text-[12px] text-[#aaa] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Interactive Walkthrough */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-[16px] font-bold">See It In Action — Live Example</h3>
            <p className="text-[13px] text-[#888] mt-1">Click through each step to see how the engine automates your current process</p>
          </div>
          {currentStep === -1 ? (
            <button onClick={startExample} className="px-5 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-[14px] font-semibold hover:bg-[#2a2a4e] transition-colors">
              Start Example
            </button>
          ) : (
            <button onClick={resetExample} className="px-5 py-2.5 bg-white text-[#1a1a2e] border border-[#ddd] rounded-lg text-[14px] font-semibold hover:border-[#bbb] transition-colors">
              Reset Demo
            </button>
          )}
        </div>

        {currentStep === -1 ? (
          <div className="text-center py-8 text-[#aaa]">
            <Zap className="h-9 w-9 mx-auto mb-3 text-[#ccc]" />
            <p className="text-[14px]">Click "Start Example" to walk through a real scenario</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => {
              if (!visibleSteps.includes(idx)) return null;
              const isCurrent = idx === currentStep;
              const isFinal = idx === 7 && currentStep === 7;
              return (
                <div
                  key={idx}
                  onClick={() => advanceStep(idx + 1)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isFinal
                      ? "border-[#10b981] bg-[#f0fdf4] cursor-default"
                      : isCurrent
                      ? "border-[#3b82f6] bg-[#e8f0fe] cursor-pointer"
                      : "border-[#eee] bg-[#f8f9fb] cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 ${
                      isFinal ? "bg-[#10b981]" : "bg-[#3b82f6]"
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="text-[14px] font-semibold">{step.title}</span>
                    {idx < currentStep && <span className="text-[#10b981] font-extrabold ml-2">✓</span>}
                  </div>
                  <div className="ml-[38px]">
                    {step.body}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How It Works + Getting Started */}
      <div className="grid grid-cols-2 gap-5 mt-5">
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
          <h3 className="text-[16px] font-bold mb-1">Getting Started</h3>
          <p className="text-[13px] text-[#888] mb-5">Complete these steps to activate your lead engine</p>
          {[
            "Connect at least one data source",
            "Define your target segments",
            "Create an email template",
            "Launch your first campaign",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f4f4f8] last:border-0">
              <div className="w-6 h-6 rounded-full border-2 border-[#ddd] flex items-center justify-center text-[12px] font-bold text-[#ccc] shrink-0">
                {i + 1}
              </div>
              <span className="text-[14px] text-[#444]">{item}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6">
          <h3 className="text-[16px] font-bold mb-1">How It Works</h3>
          <p className="text-[13px] text-[#888] mb-5">Your outreach process, automated</p>
          {[
            { icon: Search, title: "Find", desc: "Source contacts from directories, web scraping, LinkedIn exports" },
            { icon: Filter, title: "Segment", desc: "Categorize by company type, region, existing vs. new" },
            { icon: FileText, title: "Template", desc: "Build personalized emails with dynamic fields" },
            { icon: Send, title: "Reach", desc: "Send at human pace with engagement tracking" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-[#f4f4f8] last:border-0">
              <item.icon className="h-[18px] w-[18px] text-[#3b82f6] shrink-0 mt-0.5" />
              <div>
                <div className="text-[14px] font-semibold">{item.title}</div>
                <div className="text-[13px] text-[#888] mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
