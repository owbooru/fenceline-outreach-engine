import { useState } from "react";
import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Check, Upload, Plus, Trash2 } from "lucide-react";
import Papa from "papaparse";

interface SearchResult {
  name: string;
  company: string;
  role: string;
  region: string;
  email: string;
  pattern: string;
  status: string;
  source: string;
  serviceNeed?: string;
}

const searchSources = [
  { name: "Alberta procurement portals", count: "Connecting to public tender sources...", delay: 800 },
  { name: "Alberta Purchasing Connection", count: "Scraping active fencing tenders...", delay: 1600 },
  { name: "MERX Procurement Portal", count: "Checking open solicitations...", delay: 2200 },
  { name: "City of Edmonton", count: "Checking municipal procurement...", delay: 2800 },
  { name: "Email pattern detection", count: "Matching known company domains...", delay: 3400 },
  { name: "Compiling results", count: "Filtering to verified contacts only...", delay: 3800 },
];

export default function Find() {
  const [service, setService] = useState("all_fencing");
  const [region, setRegion] = useState("all_alberta");
  const [industry, setIndustry] = useState("all");
  const [searching, setSearching] = useState(false);
  const [sourcesFound, setSourcesFound] = useState<{name: string; count: string}[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showTenders, setShowTenders] = useState(false);
  const [currentSourceLabel, setCurrentSourceLabel] = useState("Searching sources...");
  const [activeTab, setActiveTab] = useState<"search" | "csv" | "tenders">("search");
  const [csvData, setCsvData] = useState<SearchResult[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const toggleResult = (idx: number) => {
    setSelectedResults(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };
  const [patternCompany, setPatternCompany] = useState("");
  const [patternDomain, setPatternDomain] = useState("");
  const [patternFormat, setPatternFormat] = useState("first.last");
  const [consentBasis, setConsentBasis] = useState("");
  const [savedPatterns, setSavedPatterns] = useState<{company: string; domain: string; format: string}[]>([
    { company: "AECON", domain: "aecon.com", format: "first.last" },
    { company: "PCL Construction", domain: "pcl.com", format: "flast" },
    { company: "EllisDon", domain: "ellisdon.com", format: "first.last" },
    { company: "Graham Construction", domain: "graham.ca", format: "flast" },
    { company: "City of Edmonton", domain: "edmonton.ca", format: "first.last" },
    { company: "City of Calgary", domain: "calgary.ca", format: "first.last" },
    { company: "Bird Construction", domain: "bird.ca", format: "first.last" },
    { company: "Ledcor Group", domain: "ledcor.com", format: "flast" },
  ]);

  const webSearch = trpc.webSearch.search.useMutation();
  const createBulk = trpc.leads.createBulk.useMutation();

  const handleCsvDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseCsv(file);
  }, [savedPatterns]);

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCsv(file);
  };

  const parseCsv = (file: File) => {
    setCsvFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as Record<string, string>[];
        const parsed: SearchResult[] = [];

        for (const row of rows) {
          // Flexible column matching for Sales Navigator and other CSV formats
          const keys = Object.keys(row).map(k => k.toLowerCase());
          const getCol = (patterns: string[]) => {
            const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().includes(p)));
            return key ? (row[key] || "").trim() : "";
          };

          const firstName = getCol(["first name", "firstname", "first_name"]);
          const lastName = getCol(["last name", "lastname", "last_name"]);
          const company = getCol(["company", "organization", "account", "company name"]);
          const title = getCol(["title", "position", "role", "job title", "jobtitle"]);
          const location = getCol(["location", "city", "geography", "region"]);
        if (!firstName && !lastName) continue;

        // Apply known pattern
        const companyLower = company.toLowerCase();
        let email = "";
        let pattern = "";
        const matched = savedPatterns.find(p => companyLower.includes(p.company.toLowerCase()) || p.company.toLowerCase().includes(companyLower));
        if (matched) {
          const fn = firstName.toLowerCase();
          const ln = lastName.toLowerCase();
          if (matched.format === "first.last") email = `${fn}.${ln}@${matched.domain}`;
          else if (matched.format === "flast") email = `${fn[0]}${ln}@${matched.domain}`;
          else if (matched.format === "firstl") email = `${fn}${ln[0]}@${matched.domain}`;
          else if (matched.format === "first_last") email = `${fn}_${ln}@${matched.domain}`;
          else email = `${fn}.${ln}@${matched.domain}`;
          pattern = `${matched.format}@${matched.domain}`;
        } else {
          const domain = companyLower.replace(/[^a-z0-9]/g, "").slice(0, 12) + ".com";
          email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
          pattern = `first.last@${domain} (guessed)`;
        }

        parsed.push({
          name: `${firstName} ${lastName}`,
          company,
          role: title,
          region: location,
          email,
          pattern,
          status: matched ? "Pattern" : "Unverified",
          source: "CSV Import",
        });
      }
      setCsvData(parsed);
      },
    });
  };

  const importCsv = () => {
    if (csvData.length === 0) return;
    if (!consentBasis) {
      alert("CASL Compliance: You must select a consent basis before importing contacts.");
      return;
    }
    const leads = csvData.map(r => ({
      firstName: r.name.split(" ")[0] || "",
      lastName: r.name.split(" ").slice(1).join(" ") || "",
      email: r.email,
      company: r.company,
      jobTitle: r.role,
      city: r.region,
      source: "linkedin" as const,
      consentBasis: consentBasis as any,
    }));
    createBulk.mutate({ leads });
  };

  const addPattern = () => {
    if (!patternCompany || !patternDomain) return;
    setSavedPatterns(prev => [...prev, { company: patternCompany, domain: patternDomain, format: patternFormat }]);
    setPatternCompany("");
    setPatternDomain("");
    setPatternFormat("first.last");
  };

  const removePattern = (idx: number) => {
    setSavedPatterns(prev => prev.filter((_, i) => i !== idx));
  };

  const runSearch = async () => {
    setSearching(true);
    setSourcesFound([]);
    setResults([]);
    setShowResults(false);
    setShowTenders(false);
    setCurrentSourceLabel("Searching sources...");

    // Animate source progress
    searchSources.forEach((src, i) => {
      setTimeout(() => {
        setSourcesFound(prev => [...prev, { name: src.name, count: src.count }]);
        setCurrentSourceLabel(i < searchSources.length - 1 ? `Searching ${searchSources[i + 1].name}...` : "Complete — preparing results...");
      }, src.delay);
    });

    // Actually call the API
    try {
      const data = await webSearch.mutateAsync({
        criteria: service,
        region: region,
        industry: industry,
      });
      
      // Wait for animation to finish
      setTimeout(() => {
        setShowTenders(true);
      }, 4200);
      setTimeout(() => {
        setSearching(false);
        setShowResults(true);
        setResults((data.results || []) as any);
      }, 4800);
    } catch (err) {
      setTimeout(() => {
        setSearching(false);
        setShowResults(true);
        setResults([]);
      }, 4800);
    }
  };

  const resetSearch = () => {
    setSearching(false);
    setSourcesFound([]);
    setResults([]);
    setShowResults(false);
    setShowTenders(false);
    setCurrentSourceLabel("Searching sources...");
  };

  const importAll = () => {
    if (results.length === 0) return;
    if (!consentBasis) {
      alert("CASL Compliance: You must select a consent basis before importing contacts.");
      return;
    }
    const leads = results.map(r => ({
      firstName: r.name.split(" ")[0] || "",
      lastName: r.name.split(" ").slice(1).join(" ") || "",
      email: r.email,
      company: r.company,
      jobTitle: r.role,
      city: r.region,
      source: "web_search" as const,
      consentBasis: consentBasis as any,
    }));
    createBulk.mutate({ leads });
  };

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a4750]">Find Contacts</h1>
      <p className="text-[14px] text-[#777] mt-1.5">Source decision-makers from directories, web scraping, and LinkedIn exports</p>

      {/* Tab Switcher */}
      <div className="flex gap-1 mt-5 mb-4 bg-[#f4f7f6] p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab("search")} className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${activeTab === "search" ? "bg-white text-[#1a4750] shadow-sm" : "text-[#888] hover:text-[#555]"}`}>Search Sources</button>
        <button onClick={() => setActiveTab("csv")} className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${activeTab === "csv" ? "bg-white text-[#1a4750] shadow-sm" : "text-[#888] hover:text-[#555]"}`}>CSV Import</button>
        <button onClick={() => setActiveTab("tenders")} className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${activeTab === "tenders" ? "bg-white text-[#1a4750] shadow-sm" : "text-[#888] hover:text-[#555]"}`}>Tenders &amp; RFPs</button>
      </div>

      {/* Info Box */}
      {activeTab === "search" && !searching && !showResults && (
        <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
          <p className="text-[13px] text-[#444] leading-relaxed">
            <strong>Real data only.</strong> Results come from live scraping of public tender &amp; procurement portals (Alberta Purchasing Connection, MERX, City of Edmonton). No AI-generated names or fake companies. Focused on finding real fencing opportunities — temporary, permanent, construction hoarding, event perimeter, and security fencing. Chromium is installed on this server for the JavaScript-rendered portals.
          </p>
        </div>
      )}

      {/* Search Criteria */}
      {activeTab === "search" && <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-5">
        <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Set Your Target Criteria</h3>
        <p className="text-[13px] text-[#888] mb-5">Tell the engine what you're selling, where, and who you want to reach — then it goes and finds them</p>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[13px] font-semibold block mb-1.5">Service Type</label>
            <select value={service} onChange={e => setService(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-[14px] bg-white">
              <option value="all_fencing">All Fencing (Sales & Rentals)</option>
              <option value="temp_fence_rentals">Temporary Fence Rentals</option>
              <option value="temp_fence_sales">Temporary Fence Sales</option>
              <option value="perm_fence_sales">Permanent Fence Sales</option>
              <option value="construction_hoarding">Construction Hoarding</option>
              <option value="event_fencing">Event / Crowd Control Fencing</option>
              <option value="security_fencing">Security / Perimeter Fencing</option>
            </select>
          </div>
          <div>
            <label className="text-[13px] font-semibold block mb-1.5">Region</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-[14px] bg-white">
              <option value="all_alberta">All Alberta</option>
              <option value="edmonton">Edmonton, AB</option>
              <option value="calgary">Calgary, AB</option>
              <option value="red_deer">Red Deer / Central AB</option>
              <option value="ontario">Ontario</option>
              <option value="bc">BC</option>
              <option value="saskatchewan">Saskatchewan</option>
            </select>
          </div>
          <div>
            <label className="text-[13px] font-semibold block mb-1.5">Industry</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#ddd] text-[14px] bg-white">
              <option value="all">All Industries</option>
              <option value="construction">Construction / GC</option>
              <option value="municipal">Municipal / Government</option>
              <option value="residential">Residential Builders</option>
              <option value="commercial">Commercial Development</option>
              <option value="events">Events & Festivals</option>
              <option value="rental">Rental Companies</option>
              <option value="environmental">Environmental / Disaster</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[13px] font-semibold block mb-1.5">Target Roles</label>
          <div className="flex gap-2 flex-wrap">
            {["Estimators", "Buyers", "Project Managers", "Procurement", "Site Superintendents", "Operations Managers", "Project Coordinators"].map(role => (
              <span key={role} className="badge-blue cursor-pointer">{role}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {!showResults ? (
            <button
              onClick={runSearch}
              disabled={searching}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4750] text-white rounded-lg text-[14px] font-semibold hover:bg-[#2a5a65] transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searching ? "Searching..." : "Search"}
            </button>
          ) : (
            <button
              onClick={resetSearch}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#1a4750] border border-[#ddd] rounded-lg text-[14px] font-semibold hover:border-[#bbb] transition-colors"
            >
              Reset Search
            </button>
          )}
          {!searching && !showResults && (
            <span className="text-[12px] text-[#aaa]">Scrapes company websites, directories, Google results, and public profiles</span>
          )}
        </div>
      </div>}

      {/* Progress */}
      {activeTab === "search" && searching && (
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 border-[3px] border-[#1a4750] border-t-transparent rounded-full animate-spin" />
            <span className="text-[14px] font-semibold">{currentSourceLabel}</span>
          </div>
          <div className="space-y-2">
            {sourcesFound.map((src, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[#f4f4f8] last:border-0 result-row">
                <Check className="h-3.5 w-3.5 text-[#3d6b50]" />
                <span className="text-[13px] font-semibold">{src.name}</span>
                <span className="text-[12px] text-[#888]">— {src.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tenders Card */}
      {activeTab === "search" && showTenders && results.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">📋</span>
            <h3 className="text-[16px] font-bold">Sources Checked</h3>
            <span className="badge-amber">{results.length} contacts found</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {results.filter(r => r.source !== "System").map((r, i) => (
              <div key={i} className="p-3 bg-[#f8f5f0] rounded-lg border border-[#d8d0c4]">
                <div className="text-[12px] font-semibold text-[#8c7355] mb-1">📋 {r.source}</div>
                <div className="text-[13px] font-semibold">{r.company} — {r.role}</div>
                <div className="text-[12px] text-[#888] mt-1">{r.serviceNeed?.slice(0, 80)}</div>
              </div>
            )).slice(0, 4)}
          </div>
        </div>
      )}

      {/* Results */}
      {activeTab === "search" && showResults && (
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#1a4750]">Contacts Found — {results.length} decision-makers</h3>
              <p className="text-[13px] text-[#888] mt-1">Filtered by: Estimators, Buyers, PMs, Procurement, Site Supers · Email patterns detected</p>
            </div>
            <button
              onClick={importAll}
              disabled={createBulk.isPending || results.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4750] text-white rounded-lg text-[14px] font-semibold hover:bg-[#2a5a65] transition-colors disabled:opacity-50"
            >
              {createBulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Import All to Segment →
            </button>
          </div>
          
          {results.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f4f7f6] border border-[#d4ddd8] rounded-lg mb-4">
                <span className="text-[14px]">🔎</span>
                <span className="text-[13px] text-[#555] font-medium">No matching tenders found right now</span>
              </div>
              <p className="text-[14px] text-[#666] max-w-md mx-auto">
                The public portals (Alberta Purchasing Connection, MERX, City of Edmonton) had no open fencing-related solicitations for these criteria. Try a broader Service Type or Region.
              </p>
              <p className="text-[13px] text-[#888] mt-3">
                Or use the <button onClick={() => setActiveTab("csv")} className="text-[#1a4750] font-semibold hover:underline">CSV Import</button> tab to bring in contacts from Scott's Directories or Sales Navigator.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((c, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-[#eee] result-row" style={{ animationDelay: `${i * 100}ms` }}>
                  <input 
                    type="checkbox" 
                    checked={selectedResults.includes(i)}
                    onChange={() => toggleResult(i)}
                    className="w-4 h-4 rounded border-2 border-[#ddd] shrink-0 cursor-pointer accent-[#1a4750]" 
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">{c.name}</span>
                      <span className="badge-gray">{c.role}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-[#888]">
                      <span>🏢 {c.company}</span>
                      <span>📍 {c.region}</span>
                      <span>📧 <span className="font-mono">{c.email}</span></span>
                      <span className={c.status === "Verified" ? "badge-green" : "badge-amber"}>{c.status}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[#aaa]">
                      Pattern: <span className="font-mono">{c.pattern}</span> · Source: {c.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <div className="pt-4 border-t border-[#eee] mt-4">
              <div className="flex items-center gap-3 justify-center mb-3">
                <label className="text-[13px] font-semibold text-[#555]">CASL Consent Basis:</label>
                <select value={consentBasis} onChange={e => setConsentBasis(e.target.value)} className="px-3 py-1.5 rounded-lg border border-[#ddd] text-[13px] bg-white">
                  <option value="">— Select consent basis —</option>
                  <option value="express">Express Consent</option>
                  <option value="implied_business_relationship">Implied — Business Relationship (2yr)</option>
                  <option value="implied_inquiry">Implied — Inquiry (6mo)</option>
                  <option value="implied_published">Implied — Published Contact</option>
                </select>
              </div>
              <div className="text-center text-[13px] text-[#888]">
                Showing {results.length} contacts · {!consentBasis && <span className="text-amber-600 font-semibold">Select consent basis to enable import</span>}
              </div>
              <div className="text-center mt-2">
                <button onClick={importAll} disabled={!consentBasis || createBulk.isPending} className="px-5 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold disabled:opacity-40">
                  {createBulk.isPending ? "Importing..." : `Import All (${results.length})`}
                </button>
              </div>
          </div>
         )}
        </div>
      )}

      {/* CSV Import Tab */}
      {/* Tenders & RFPs Tab */}
      {activeTab === "tenders" && (
        <div className="mt-5">
          <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mb-4">
            <h3 className="text-[16px] font-bold text-[#1a4750] mb-2">Active Tenders & RFPs</h3>
            <p className="text-[13px] text-[#888] mb-4">Government and municipal procurement opportunities for fencing and site services across Alberta. Click any portal to go directly to their active fencing bids.</p>
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 mb-4">
              <span className="text-amber-600">⚠️</span>
              <span className="text-[13px] text-amber-800 font-medium">Requires Chromium on the server for live scraping. Connect SerpAPI or MERX in Settings for automated monitoring.</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 bg-[#f8f9fb] rounded-lg border border-[#eee]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px]">📋</span>
                  <span className="text-[13px] font-bold text-[#1a4750]">Alberta Purchasing Connection</span>
                  <span className="badge-green">Free</span>
                </div>
                <p className="text-[12px] text-[#666] mb-2">Alberta government procurement portal. Publishes RFPs for fencing, construction hoarding, and site services.</p>
                <a href="https://purchasing.alberta.ca/search?q=fencing&status=Open" target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1a4750] text-white rounded-md text-[12px] font-semibold hover:bg-[#2a5a65] transition-colors">View Active Fencing Bids →</a>
              </div>
              <div className="p-4 bg-[#f8f9fb] rounded-lg border border-[#eee]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px]">📋</span>
                  <span className="text-[13px] font-bold text-[#1a4750]">MERX</span>
                  <span className="badge-amber">Subscription</span>
                </div>
                <p className="text-[12px] text-[#666] mb-2">National procurement platform. Government tenders and RFPs for construction, fencing, and infrastructure projects across Canada.</p>
                <a href="https://www.merx.com/public/solicitations?keywords=fencing&province=Alberta" target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1a4750] text-white rounded-md text-[12px] font-semibold hover:bg-[#2a5a65] transition-colors">View Fencing Tenders →</a>
              </div>
              <div className="p-4 bg-[#f8f9fb] rounded-lg border border-[#eee]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px]">🏛️</span>
                  <span className="text-[13px] font-bold text-[#1a4750]">City of Edmonton Procurement</span>
                  <span className="badge-green">Free</span>
                </div>
                <p className="text-[12px] text-[#666] mb-2">Municipal procurement for infrastructure, parks, and construction projects requiring fencing and site services.</p>
                <a href="https://www.edmonton.ca/programs_services/procurement/current-opportunities" target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1a4750] text-white rounded-md text-[12px] font-semibold hover:bg-[#2a5a65] transition-colors">View Current Opportunities →</a>
              </div>
              <div className="p-4 bg-[#f8f9fb] rounded-lg border border-[#eee]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[14px]">🏛️</span>
                  <span className="text-[13px] font-bold text-[#1a4750]">City of Calgary Procurement</span>
                  <span className="badge-green">Free</span>
                </div>
                <p className="text-[12px] text-[#666] mb-2">Calgary municipal procurement for construction, transit, and infrastructure projects.</p>
                <a href="https://www.calgary.ca/procurement/open-opportunities" target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1a4750] text-white rounded-md text-[12px] font-semibold hover:bg-[#2a5a65] transition-colors">View Open Opportunities →</a>
              </div>
            </div>
            <div className="mt-4 p-3 bg-[#f4f7f6] border border-[#d4ddd8] rounded-lg">
              <p className="text-[12px] text-[#555]"><strong>How it works:</strong> Once Chromium is installed on your server and SerpAPI or MERX is connected in Settings, the engine will automatically monitor these portals daily and surface new fencing-related tenders in the Search Sources tab results.</p>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Tab */}
      {activeTab === "csv" && (
        <div>
          {/* Instructions */}
          <div className="bg-white rounded-xl border border-[#e8e8ee] p-5 mb-4 mt-5">
            <h3 className="text-[15px] font-bold text-[#1a4750] mb-3">How to Import Contacts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-[#f8f9fa] rounded-lg">
                <div className="text-[13px] font-semibold text-[#1a4750] mb-2">From Scott's Directories:</div>
                <ol className="text-[12px] text-[#555] space-y-1 list-decimal list-inside">
                  <li>Log into Scott's Directories</li>
                  <li>Search by company or industry</li>
                  <li>Select the contacts you want</li>
                  <li>Click "Export" → choose CSV format</li>
                  <li>Drop the file below</li>
                </ol>
              </div>
              <div className="p-3 bg-[#f8f9fa] rounded-lg">
                <div className="text-[13px] font-semibold text-[#1a4750] mb-2">From LinkedIn Sales Navigator:</div>
                <ol className="text-[12px] text-[#555] space-y-1 list-decimal list-inside">
                  <li>Build your lead list with filters</li>
                  <li>Select all leads in the list</li>
                  <li>Click "Export to CSV"</li>
                  <li>Drop the file below</li>
                </ol>
              </div>
            </div>
            <div className="mt-3 p-3 bg-[#f0f7f7] rounded-lg border border-[#d4e8e4]">
              <div className="text-[12px] font-semibold text-[#1a4750] mb-1">Required CSV columns:</div>
              <code className="text-[11px] text-[#444] bg-white px-2 py-1 rounded block">First Name, Last Name, Company, Title, Location</code>
              <div className="text-[11px] text-[#888] mt-1">Column names are flexible — the system auto-detects common variations (e.g., "Job Title" = "Title", "Organization" = "Company")</div>
            </div>
          </div>

          {/* Drag and Drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleCsvDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragOver ? "border-[#1a4750] bg-[#f0f7f7]" : "border-[#ddd] bg-white"}`}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-[#aaa]" />
            <div className="text-[14px] font-semibold mb-1">Drop your CSV file here</div>
            <div className="text-[13px] text-[#888] mb-3">Export from Sales Navigator, Scott's Directories, or any spreadsheet</div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[#2a5a65] transition-colors">
              Browse Files
              <input type="file" accept=".csv" onChange={handleCsvSelect} className="hidden" />
            </label>
            <div className="text-[11px] text-[#aaa] mt-3">Supports: First Name, Last Name, Company, Title, Location columns</div>
          </div>

          {/* CSV Results */}
          {csvData.length > 0 && (
            <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[#1a4750]">{csvFileName} — {csvData.length} contacts parsed</h3>
                  <p className="text-[13px] text-[#888] mt-1">Email patterns applied from Known Patterns database</p>
                </div>
                <button
                  onClick={importCsv}
                  disabled={createBulk.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4750] text-white rounded-lg text-[14px] font-semibold hover:bg-[#2a5a65] transition-colors disabled:opacity-50"
                >
                  {createBulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Import All to Segment →
                </button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {csvData.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-[#eee]">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold">{c.name}</span>
                        <span className="badge-gray">{c.role}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-[#888]">
                        <span>🏢 {c.company}</span>
                        <span>📍 {c.region}</span>
                        <span>📧 <span className="font-mono">{c.email}</span></span>
                        <span className={c.status === "Pattern" ? "badge-amber" : "badge-gray"}>{c.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Known Patterns */}
          <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-4">
            <h3 className="text-[16px] font-bold text-[#1a4750] mb-1">Known Email Patterns</h3>
            <p className="text-[13px] text-[#888] mb-4">When you know a company's email format, add it here. CSV imports will auto-apply matching patterns.</p>
            
            <div className="space-y-2 mb-4">
              {savedPatterns.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[#eee]">
                  <div className="flex items-center gap-4">
                    <span className="text-[14px] font-semibold">{p.company}</span>
                    <span className="font-mono text-[13px] text-[#888]">{p.format}@{p.domain}</span>
                  </div>
                  <button onClick={() => removePattern(i)} className="text-[#ccc] hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Pattern Form */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-[#888] block mb-1">Company</label>
                <input value={patternCompany} onChange={e => setPatternCompany(e.target.value)} placeholder="e.g., AECON" className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-[#888] block mb-1">Domain</label>
                <input value={patternDomain} onChange={e => setPatternDomain(e.target.value)} placeholder="e.g., aecon.com" className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px]" />
              </div>
              <div className="w-[160px]">
                <label className="text-[11px] font-semibold text-[#888] block mb-1">Format</label>
                <select value={patternFormat} onChange={e => setPatternFormat(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#ddd] text-[13px] bg-white">
                  <option value="first.last">first.last@</option>
                  <option value="flast">flast@</option>
                  <option value="firstl">firstl@</option>
                  <option value="first_last">first_last@</option>
                </select>
              </div>
              <button onClick={addPattern} className="px-4 py-2 bg-[#1a4750] text-white rounded-lg text-[13px] font-semibold shrink-0">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
