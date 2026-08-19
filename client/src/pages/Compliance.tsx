import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Compliance() {
  const { data: events, isLoading } = trpc.consent.events.useQuery({ limit: 200 });

  const formatDate = (d: any) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  };

  const eventTypeBadge = (type: string) => {
    switch (type) {
      case "granted": return <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Granted</span>;
      case "withdrawn": return <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Withdrawn</span>;
      case "expired": return <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Expired</span>;
      case "bounced": return <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Bounced</span>;
      case "imported": return <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Imported</span>;
      default: return <span className="badge-gray">{type}</span>;
    }
  };

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[var(--brand-primary)]">CASL Compliance Log</h1>
      <p className="text-[14px] text-[#6b6b6b] mt-1.5">Read-only audit trail of all consent events. This log is append-only and cannot be modified.</p>

      <div className="p-4 bg-[var(--neutral-surface-1)] border border-[var(--neutral-muted-border)] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#555] leading-relaxed">
          Under CASL (Canada's Anti-Spam Legislation), every commercial electronic message requires valid consent. This log records every consent change — grants, withdrawals, expirations, bounces, and imports. It serves as your compliance audit trail.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[16px] font-bold text-[var(--brand-primary)]">Consent Events</h3>
          <span className="text-[12px] text-[#6b6b6b]">{events?.length || 0} events recorded</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-12 text-[#737373]">
            <p className="text-[14px]">No consent events recorded yet. Events will appear here as contacts are imported and consent is tracked.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#eee]">
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Event</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Consent Basis</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Source</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#737373] uppercase tracking-wider">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event: any) => (
                <tr key={event.id} className="border-b border-[var(--neutral-surface-2)]">
                  <td className="py-3 px-4 text-[13px] text-[#555]">{formatDate(event.recordedAt)}</td>
                  <td className="py-3 px-4">{eventTypeBadge(event.eventType)}</td>
                  <td className="py-3 px-4 text-[13px] font-mono">{event.email}</td>
                  <td className="py-3 px-4 text-[13px]">{event.consentBasis ? event.consentBasis.replace(/_/g, " ") : "—"}</td>
                  <td className="py-3 px-4 text-[13px] text-[#6b6b6b]">{event.source || "—"}</td>
                  <td className="py-3 px-4 text-[13px] text-[#6b6b6b]">{event.recordedBy || "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

