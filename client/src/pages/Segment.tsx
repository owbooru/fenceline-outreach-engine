import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type SegmentFilter = "all" | "new_local" | "new_national" | "existing" | "unverified";

export default function Segment() {
  const [filter, setFilter] = useState<SegmentFilter>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const { data: leadsData, isLoading } = trpc.leads.list.useQuery({});

  const leads = leadsData || [];

  // Segment logic: existing = segment is "existing_customer", new_local = Alberta + not existing, new_national = outside Alberta + not existing
  const albertaCities = ["edmonton", "calgary", "red deer", "lethbridge", "medicine hat", "grande prairie", "fort mcmurray", "airdrie", "spruce grove", "st. albert", "sherwood park", "strathcona", "sturgeon", "parkland"];

  const segmented = leads.map(lead => {
    const city = (lead.city || "").toLowerCase();
    const segment = lead.segment as string;
    const isExisting = segment === "existing_customer";
    const isAlberta = albertaCities.some(c => city.includes(c)) || city.includes("alberta") || city.includes(", ab");
    const computedSegment = isExisting ? "existing" : isAlberta ? "new_local" : "new_national";
    const isVerified = lead.email && !lead.email.includes("pattern");
    return { ...lead, computedSegment, isVerified };
  });

  const counts = {
    all: segmented.length,
    new_local: segmented.filter(l => l.computedSegment === "new_local").length,
    new_national: segmented.filter(l => l.computedSegment === "new_national").length,
    existing: segmented.filter(l => l.computedSegment === "existing").length,
    unverified: segmented.filter(l => !l.isVerified).length,
  };

  const filtered = filter === "all" ? segmented
    : filter === "unverified" ? segmented.filter(l => !l.isVerified)
    : segmented.filter(l => l.computedSegment === filter);

  const segmentBadge = (seg: string) => {
    if (seg === "existing") return <span className="badge-green">Existing</span>;
    if (seg === "new_local") return <span className="badge-blue">New Local</span>;
    return <span className="badge-amber">New National</span>;
  };

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[var(--brand-primary)]">Segment Contacts</h1>
      <p className="text-[14px] text-[#6b6b6b] mt-1.5">Organize contacts by company type, region, and relationship status</p>
      <div className="p-4 bg-[var(--neutral-surface-1)] border border-[var(--neutral-muted-border)] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Contacts imported from the Find page are automatically sorted into segments using rules you define. Existing customers are matched against your uploaded customer list so they never receive a cold introduction. New contacts are split by geography — local Alberta vs. national.</p>
      </div>

      {/* Segment Rules */}
      <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6 mb-5">
        <h3 className="text-[16px] font-bold text-[var(--brand-primary)] mb-1">Segment Rules</h3>
        <p className="text-[13px] text-[#6b6b6b] mb-5">Contacts are automatically categorized based on these rules</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
              <span className="text-[14px] font-semibold">Existing Customers</span>
            </div>
            <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-3">Contacts from companies already in your customer list</p>
            <div className="p-3 bg-[var(--neutral-bg)] rounded-lg text-[12px] text-[#666]">Rule: Match against uploaded customer list</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
              <span className="text-[14px] font-semibold">New Local Prospects</span>
            </div>
            <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-3">New contacts within Alberta — Edmonton, Calgary, Red Deer</p>
            <div className="p-3 bg-[var(--neutral-bg)] rounded-lg text-[12px] text-[#666]">Rule: Not in customer list + Alberta region</div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
              <span className="text-[14px] font-semibold">New National Prospects</span>
            </div>
            <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-3">New contacts outside Alberta — Ontario, BC, Saskatchewan</p>
            <div className="p-3 bg-[var(--neutral-bg)] rounded-lg text-[12px] text-[#666]">Rule: Not in customer list + outside Alberta</div>
          </div>
        </div>
      </div>

      {/* Contact List */}
      <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--brand-primary)]">Contact List</h3>
            <p className="text-[13px] text-[#6b6b6b]">{counts.all} contacts across imported companies</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFilterPanel(!showFilterPanel)} className={`px-4 py-2 bg-white text-[var(--brand-primary)] border rounded-lg text-[13px] font-semibold ${showFilterPanel ? "border-[var(--brand-primary)]" : "border-[#ddd]"}`}>Filter</button>
            <button onClick={() => {
              if (filtered.length === 0) { toast.info("No contacts to export"); return; }
              const headers = ["First Name", "Last Name", "Email", "Company", "Job Title", "City", "Segment", "Source"];
              const rows = filtered.map(l => [l.firstName || "", l.lastName || "", l.email || "", l.company || "", l.jobTitle || "", l.city || "", l.computedSegment, l.source || ""]);
              const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(","))].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `fenceline-contacts-${filter}.csv`; a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${filtered.length} contacts`);
            }} className="px-4 py-2 bg-white text-[var(--brand-primary)] border border-[#ddd] rounded-lg text-[13px] font-semibold">Export</button>
          </div>
        </div>

        {/* Filter badges */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "all", label: `All (${counts.all})` },
            { key: "new_local", label: `New Local (${counts.new_local})` },
            { key: "new_national", label: `New National (${counts.new_national})` },
            { key: "existing", label: `Existing (${counts.existing})` },
            { key: "unverified", label: `Unverified (${counts.unverified})` },
          ] as { key: SegmentFilter; label: string }[]).map(f => (
            <span
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`cursor-pointer ${filter === f.key ? "badge-blue" : "badge-gray"}`}
            >
              {f.label}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#737373]">
            <p className="text-[14px]">{counts.all === 0 ? "No contacts imported yet. Go to Find to source contacts." : "No contacts match this filter."}</p>
          </div>
        ) : (
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#eee]">
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Contact</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Company</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Region</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Email Status</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Segment</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Consent</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((lead, i) => (
                  <tr key={i} className="border-b border-[var(--neutral-surface-2)]">
                    <td className="py-3 px-4 text-[14px] font-semibold">{lead.firstName} {lead.lastName}</td>
                    <td className="py-3 px-4 text-[14px]">{lead.company}</td>
                    <td className="py-3 px-4 text-[14px]">{lead.jobTitle}</td>
                    <td className="py-3 px-4 text-[14px]">{lead.city}</td>
                    <td className="py-3 px-4">{lead.isVerified ? <span className="badge-green">Verified</span> : <span className="badge-amber">Pattern</span>}</td>
                    <td className="py-3 px-4">{segmentBadge(lead.computedSegment)}</td>
                    <td className="py-3 px-4">
                      {(lead as any).consentBasis === "none" || !(lead as any).consentBasis ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">No Consent</span>
                      ) : (lead as any).consentExpiresAt && new Date((lead as any).consentExpiresAt) < new Date() ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Expired</span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                          {((lead as any).consentBasis || "").replace(/_/g, " ").replace(/implied /,"Impl. ")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[14px] text-[#6b6b6b]">{lead.source || "Web Scrape"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 20 && (
              <div className="text-center pt-3 text-[13px] text-[#6b6b6b]">Showing 20 of {filtered.length} contacts</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
