import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Templates() {
  const profilesQuery = trpc.senderProfiles.list.useQuery();
  const createProfile = trpc.senderProfiles.create.useMutation({
    onSuccess: () => { profilesQuery.refetch(); setShowAddForm(false); setNewName(""); setNewEmail(""); setNewTitle(""); setNewTone(""); toast.success("Sender profile created"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteProfile = trpc.senderProfiles.delete.useMutation({
    onSuccess: () => { profilesQuery.refetch(); toast.success("Profile removed"); },
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTone, setNewTone] = useState("");

  const addProfile = () => {
    if (!newName || !newEmail) { toast.error("Name and email are required"); return; }
    createProfile.mutate({ senderName: newName, senderEmail: newEmail, senderTitle: newTitle || undefined, tone: newTone || undefined });
  };

  const profiles = profilesQuery.data || [];

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[var(--brand-primary)]">Email Templates</h1>
      <p className="text-[14px] text-[#6b6b6b] mt-1.5">Build personalized outreach templates with dynamic fields</p>
      <div className="p-4 bg-[var(--neutral-surface-1)] border border-[var(--neutral-muted-border)] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Each segment gets its own email template. Dynamic fields like <code className="bg-[var(--brand-primary-tint)] px-1.5 py-0.5 rounded text-[12px] font-mono">{"{{first_name}}"}</code> and <code className="bg-[var(--brand-primary-tint)] px-1.5 py-0.5 rounded text-[12px] font-mono">{"{{company_name}}"}</code> are filled automatically per contact. Every email reads like it was written by hand.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { track: "Existing Customer — Fence Sales", trackLabel: "Existing Customers Track", color: "var(--state-success)", subject: "FenceLine pricing for {{company_name}} fence purchases", body: "Hi {{first_name}}, I wanted to make sure you received FenceLine's pricing specifically for {{company_name}}. We've worked together on rentals, and I wanted to let you know we now offer wholesale fence sales as well — temp fence, chain link, ornamental, and construction hoarding. Happy to send over a quote if you have anything coming up.", vars: ["{{first_name}}", "{{company_name}}", "{{pricing_link}}"] },
          { track: "New Local — Personalized Intro", trackLabel: "New Local Track", color: "#3b82f6", subject: "{{company_name}} + FenceLine — fencing for {{project_reference}}", body: "Hi {{first_name}}, I noticed {{company_name}} has {{project_reference}} underway. Whether you're looking at temporary construction fencing, permanent perimeter fence, or hoarding panels — we supply and install across Alberta. Would it be worth a quick conversation about your fencing needs on that project?", vars: ["{{first_name}}", "{{company_name}}", "{{project_reference}}"] },
          { track: "New National — Ontario/BC", trackLabel: "New National Track", color: "#f59e0b", subject: "Competitive fence pricing for {{region}} projects", body: "Hi {{first_name}}, I know you're managing projects in {{region}}. Our fence pricing is competitive nationally — temp fence, chain link, security fencing, and construction hoarding shipped anywhere in Canada. If you've got projects coming up that need fencing, I'd be happy to put together a quote.", vars: ["{{first_name}}", "{{company_name}}", "{{region}}"] },
        ].map(t => (
          <div key={t.track} className="bg-white rounded-xl border border-[var(--neutral-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-8 rounded" style={{ background: t.color }} />
              <div>
                <div className="text-[14px] font-semibold">{t.track}</div>
                <div className="text-[12px] text-[#6b6b6b] mt-0.5">{t.trackLabel}</div>
              </div>
            </div>
            <div className="p-3 bg-[var(--neutral-bg)] rounded-lg mb-4">
              <div className="text-[11px] font-semibold text-[#6b6b6b] mb-1">Subject</div>
              <div className="text-[13px] font-mono">{t.subject}</div>
            </div>
            <p className="text-[13px] text-[#666] leading-relaxed mb-3">{t.body}</p>
            <div className="flex gap-2 flex-wrap">
              {t.vars.map(v => (
                <span key={v} className="px-2 py-0.5 rounded bg-[var(--brand-primary-tint)] text-[var(--brand-primary)] text-[11px] font-mono">{v}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6 mt-5">
        <h3 className="text-[16px] font-bold text-[var(--brand-primary)] mb-1">Sender Profiles</h3>
        <p className="text-[13px] text-[#6b6b6b] mb-5">Each sender has their own voice and tone — so emails feel personal, not automated</p>
        <div className="grid grid-cols-2 gap-4">
          {profiles.map((p, i) => (
            <div key={p.id} className="p-4 border border-[#eee] rounded-lg relative group">
              <button onClick={() => deleteProfile.mutate({ id: p.id })} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#ccc] hover:text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#e8f0fe] flex items-center justify-center text-[14px] font-bold text-[var(--brand-primary)]">{p.senderName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                <div>
                  <div className="text-[14px] font-semibold">{p.senderName}</div>
                  <div className="text-[12px] text-[#6b6b6b]">{p.senderTitle || ""}{p.senderTitle ? " — " : ""}{p.senderEmail}</div>
                </div>
              </div>
              {p.tone && <div className="text-[13px] text-[#666] mb-2">Tone: {p.tone}</div>}
              {(!p.senderName || !p.senderEmail) && (
                <div className="text-[12px] text-red-500 font-medium mt-2">⚠ Missing name or email — cannot be used to send</div>
              )}
              <div className="mt-3 p-2.5 bg-[var(--neutral-surface-2)] rounded border border-[#eee]">
                <div className="text-[10px] text-[#737373] uppercase font-semibold mb-1">CASL Footer Preview</div>
                <p className="text-[11px] text-[#6b6b6b] italic leading-relaxed">This message was sent by {p.senderName}{p.senderTitle ? `, ${p.senderTitle}` : ""} on behalf of FenceLine Rentals. 9871 279 St #112, Acheson, AB T7X 6J4. <span className="text-[var(--brand-primary)] underline">Unsubscribe</span></p>
              </div>
            </div>
          ))}

          {!showAddForm ? (
            <div onClick={() => setShowAddForm(true)} className="p-4 border border-dashed border-[#ddd] rounded-lg flex items-center justify-center cursor-pointer text-[#737373] hover:border-[#bbb] hover:text-[#6b6b6b] transition-colors">
              <div className="text-center">
                <div className="text-[24px] mb-1">+</div>
                <div className="text-[13px] font-medium">Add Sender Profile</div>
              </div>
            </div>
          ) : (
            <div className="p-4 border border-[var(--brand-primary)] rounded-lg bg-[var(--neutral-surface-4)]">
              <div className="text-[14px] font-semibold mb-3">New Sender Profile</div>
              <div className="space-y-2.5">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Full name — required (e.g., Sarah Johnson)"
                  className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]"
                />
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email — required (e.g., sarah@outreach-fenceline.ca)"
                  className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]"
                />
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Title — optional (e.g., Sales Manager)"
                  className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]"
                />
                <textarea
                  value={newTone}
                  onChange={e => setNewTone(e.target.value)}
                  placeholder="Describe their writing tone (e.g., Professional but warm. Uses data and specifics. Follows up consistently.)"
                  className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px] resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button onClick={addProfile} className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-[13px] font-semibold">Save Profile</button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-white text-[#666] border border-[#ddd] rounded-lg text-[13px] font-semibold">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CASL Compliance */}
      <div className="bg-white rounded-xl border border-[var(--neutral-border)] p-6 mt-5">
        <h3 className="text-[16px] font-bold text-[var(--brand-primary)] mb-1">CASL Compliance</h3>
        <p className="text-[13px] text-[#6b6b6b] mb-4">Every outreach email automatically includes an unsubscribe mechanism as required by Canadian Anti-Spam Legislation</p>
        <div className="p-4 bg-[var(--neutral-surface-3)] border border-[var(--neutral-muted-border-2)] rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="text-[13px] font-semibold text-[var(--brand-primary)]">Auto-appended to every email</span>
          </div>
          <div className="p-3 bg-white rounded border border-[#eee] mt-2">
            <p className="text-[12px] text-[#6b6b6b] italic">This email was sent by FenceLine (outreach-fenceline.ca) regarding fencing services. If you no longer wish to receive these emails, <span className="text-[var(--brand-primary)] underline">click here to unsubscribe</span>. FenceLine, Edmonton, AB, Canada.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3.5 bg-[var(--neutral-bg)] rounded-lg">
            <div className="text-[11px] font-semibold text-[#6b6b6b]">Unsubscribe Link</div>
            <div className="text-[13px] font-semibold mt-1 text-[var(--state-success)]">Auto-included ✓</div>
          </div>
          <div className="p-3.5 bg-[var(--neutral-bg)] rounded-lg">
            <div className="text-[11px] font-semibold text-[#6b6b6b]">Physical Address</div>
            <div className="text-[13px] font-semibold mt-1 text-[var(--state-success)]">Auto-included ✓</div>
          </div>
          <div className="p-3.5 bg-[var(--neutral-bg)] rounded-lg">
            <div className="text-[11px] font-semibold text-[#6b6b6b]">Opt-out Processing</div>
            <div className="text-[13px] font-semibold mt-1 text-[var(--state-success)]">Instant ✓</div>
          </div>
        </div>
        <UnsubscribeList />
      </div>
    </div>
  );
}

function UnsubscribeList() {
  const { data: unsubs } = trpc.unsubscribes.list.useQuery();
  const addUnsub = trpc.unsubscribes.add.useMutation({ onSuccess: () => { toast.success("Email added to unsubscribe list"); } });
  const [newEmail, setNewEmail] = useState("");

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[13px] font-semibold text-[var(--brand-primary)]">Unsubscribe List ({unsubs?.length || 0})</div>
        <div className="flex gap-2">
          <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Add email to block list..." className="px-3 py-1.5 rounded-lg border border-[#ddd] text-[12px] w-56" />
          <button onClick={() => { if (newEmail) { addUnsub.mutate({ email: newEmail, reason: "Manual block" }); setNewEmail(""); } }} className="px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-lg text-[12px] font-semibold">Block</button>
        </div>
      </div>
      {unsubs && unsubs.length > 0 ? (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {(unsubs as any[]).map((u: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-2 bg-[var(--neutral-bg)] rounded text-[12px]">
              <span className="font-mono">{u.email}</span>
              <span className="text-[#6b6b6b]">{u.reason || "Unsubscribed"} · {new Date(u.unsubscribedAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-[#737373] p-3 text-center">No unsubscribes yet. Contacts who opt out will appear here and be excluded from all future sends.</div>
      )}
    </div>
  );
}
