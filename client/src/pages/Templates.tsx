import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";

export default function Templates() {
  const [profiles, setProfiles] = useState<{name: string; initials: string; email: string; role: string; tone: string}[]>([
    { name: "Rob McMullen", initials: "RM", email: "rob@fenceline.ca", role: "Fence Sales", tone: "Friendly, direct, personal. References specific projects by name. Keeps it short and to the point." },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newTone, setNewTone] = useState("");

  // ─── AI draft generator ───────────────────────────────────────────────────
  const [genTrack, setGenTrack] = useState<"existing_customers" | "new_local" | "new_national">("new_local");
  const [genCompany, setGenCompany] = useState("");
  const [genContext, setGenContext] = useState("");
  const [genTone, setGenTone] = useState("");
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [genError, setGenError] = useState("");
  const [copied, setCopied] = useState(false);
  const draftEmail = trpc.ai.draftEmail.useMutation();

  const generateDraft = async () => {
    setGenError("");
    setDraft(null);
    setCopied(false);
    try {
      const r = await draftEmail.mutateAsync({
        track: genTrack,
        company: genCompany.trim() || undefined,
        projectContext: genContext.trim() || undefined,
        tone: genTone.trim() || undefined,
      });
      setDraft(r);
    } catch (e: any) {
      setGenError(e?.message || "Generation failed.");
    }
  };

  const copyDraft = () => {
    if (!draft) return;
    navigator.clipboard?.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addProfile = () => {
    if (!newName || !newEmail) return;
    const initials = newName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    setProfiles(prev => [...prev, { name: newName, initials, email: newEmail, role: newRole, tone: newTone }]);
    setNewName("");
    setNewEmail("");
    setNewRole("");
    setNewTone("");
    setShowAddForm(false);
  };

  const removeProfile = (idx: number) => {
    setProfiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Email Templates</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Build personalized outreach templates with dynamic fields</p>
      <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
        <p className="text-[13px] text-[#444] leading-relaxed">Each segment gets its own email template. Dynamic fields like <code className="bg-[#e8f0f0] px-1.5 py-0.5 rounded text-[12px] font-mono">{"{{first_name}}"}</code> and <code className="bg-[#e8f0f0] px-1.5 py-0.5 rounded text-[12px] font-mono">{"{{company_name}}"}</code> are filled automatically per contact. Every email reads like it was written by hand.</p>
      </div>

      {/* AI Draft Generator */}
      <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-[18px] w-[18px] text-[#1a4750]" />
          <h3 className="text-[16px] font-bold text-[#1a4750]">AI Draft Generator</h3>
        </div>
        <p className="text-[13px] text-[#888] mb-4">Describe the target and let AI write a first-draft outreach email. Edit before sending — it won't invent prices or fake projects.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[12px] font-semibold block mb-1.5">Track</label>
            <select value={genTrack} onChange={e => setGenTrack(e.target.value as any)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-[13px] bg-white">
              <option value="existing_customers">Existing Customer</option>
              <option value="new_local">New Local (Alberta)</option>
              <option value="new_national">New National (ON/BC)</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-semibold block mb-1.5">Company (optional)</label>
            <input value={genCompany} onChange={e => setGenCompany(e.target.value)} placeholder="e.g., PCL Construction" className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-[13px]" />
          </div>
          <div>
            <label className="text-[12px] font-semibold block mb-1.5">Project / context (optional)</label>
            <input value={genContext} onChange={e => setGenContext(e.target.value)} placeholder="e.g., new LRT site in Edmonton" className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-[13px]" />
          </div>
          <div>
            <label className="text-[12px] font-semibold block mb-1.5">Tone (optional)</label>
            <input value={genTone} onChange={e => setGenTone(e.target.value)} placeholder="e.g., friendly and brief" className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-[13px]" />
          </div>
        </div>
        <div className="mt-4">
          <button onClick={generateDraft} disabled={draftEmail.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4750] text-white rounded-lg text-[14px] font-semibold hover:bg-[#2a5a65] transition-colors disabled:opacity-50">
            {draftEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {draftEmail.isPending ? "Generating..." : "Generate with AI"}
          </button>
        </div>
        {genError && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">{genError}</div>
        )}
        {draft && (
          <div className="mt-4 border border-[#e8e8ee] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8f9fb] border-b border-[#eee]">
              <span className="text-[12px] font-semibold text-[#888]">Generated draft</span>
              <button onClick={copyDraft} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1a4750] hover:underline">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="p-4">
              <div className="text-[11px] font-semibold text-[#888] mb-1">Subject</div>
              <div className="text-[14px] font-semibold text-[#1a4750] mb-3">{draft.subject}</div>
              <div className="text-[11px] font-semibold text-[#888] mb-1">Body</div>
              <p className="text-[13px] text-[#444] leading-relaxed whitespace-pre-wrap">{draft.body}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { track: "Existing Customer — Fence Sales", trackLabel: "Existing Customers Track", color: "#10b981", subject: "FenceLine pricing for {{company_name}} fence purchases", body: "Hi {{first_name}}, I wanted to make sure you received FenceLine's pricing specifically for {{company_name}}. We've worked together on rentals, and I wanted to let you know we now offer wholesale fence sales as well — temp fence, chain link, ornamental, and construction hoarding. Happy to send over a quote if you have anything coming up.", vars: ["{{first_name}}", "{{company_name}}", "{{pricing_link}}"] },
          { track: "New Local — Personalized Intro", trackLabel: "New Local Track", color: "#3b82f6", subject: "{{company_name}} + FenceLine — fencing for {{project_reference}}", body: "Hi {{first_name}}, I noticed {{company_name}} has {{project_reference}} underway. Whether you're looking at temporary construction fencing, permanent perimeter fence, or hoarding panels — we supply and install across Alberta. Would it be worth a quick conversation about your fencing needs on that project?", vars: ["{{first_name}}", "{{company_name}}", "{{project_reference}}"] },
          { track: "New National — Ontario/BC", trackLabel: "New National Track", color: "#f59e0b", subject: "Competitive fence pricing for {{region}} projects", body: "Hi {{first_name}}, I know you're managing projects in {{region}}. Our fence pricing is competitive nationally — temp fence, chain link, security fencing, and construction hoarding shipped anywhere in Canada. If you've got projects coming up that need fencing, I'd be happy to put together a quote.", vars: ["{{first_name}}", "{{company_name}}", "{{region}}"] },
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
          {profiles.map((p, i) => (
            <div key={i} className="p-4 border border-[#eee] rounded-lg relative group">
              {i > 0 && (
                <button onClick={() => removeProfile(i)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#ccc] hover:text-red-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#e8f0fe] flex items-center justify-center text-[14px] font-bold text-[#1a4750]">{p.initials}</div>
                <div>
                  <div className="text-[14px] font-semibold">{p.name}</div>
                  <div className="text-[12px] text-[#888]">{p.role} — {p.email}</div>
                </div>
              </div>
              <div className="text-[13px] text-[#666]">Tone: {p.tone}</div>
            </div>
          ))}

          {!showAddForm ? (
            <div onClick={() => setShowAddForm(true)} className="p-4 border border-dashed border-[#ddd] rounded-lg flex items-center justify-center cursor-pointer text-[#aaa] hover:border-[#bbb] hover:text-[#888] transition-colors">
              <div className="text-center">
                <div className="text-[24px] mb-1">+</div>
                <div className="text-[13px] font-medium">Add Sender Profile</div>
              </div>
            </div>
          ) : (
            <div className="p-4 border border-[#1a4750] rounded-lg bg-[#f8fafb]">
              <div className="text-[14px] font-semibold mb-3">New Sender Profile</div>
              <div className="space-y-2.5">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Full name (e.g., Sarah Johnson)"
                  className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]"
                />
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email (e.g., sarah@fenceline.ca)"
                  className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]"
                />
                <input
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder="Role (e.g., Account Manager, Inside Sales)"
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
                  <button onClick={addProfile} className="px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold">Save Profile</button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-white text-[#666] border border-[#ddd] rounded-lg text-[13px] font-semibold">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
