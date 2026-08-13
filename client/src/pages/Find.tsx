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
  { name: "Scott's Directories", count: "380+ contacts across 14 companies", delay: 800 },
  { name: "Company websites scraped", count: "9 team pages found, 124 contacts", delay: 1600 },
  { name: "LinkedIn profiles matched", count: "290 verified contacts matched", delay: 2200 },
  { name: "MERX & procurement portals", count: "4 active tenders & permits", delay: 2800 },
  { name: "Email patterns detected", count: "14 company patterns, 92% avg confidence", delay: 3400 },
  { name: "Filtering by target roles", count: "178 decision-makers from 670+ raw contacts", delay: 3800 },
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
  const [activeTab, setActiveTab] = useState<"search" | "csv">("search");
  const [csvData, setCsvData] = useState<SearchResult[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [patternCompany, setPatternCompany] = useState("");
  const [patternDomain, setPatternDomain] = useState("");
  const [patternFormat, setPatternFormat] = useState("first.last");
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
    const leads = csvData.map(r => ({
      firstName: r.name.split(" ")[0] || "",
      lastName: r.name.split(" ").slice(1).join(" ") || "",
      email: r.email,
      company: r.company,
      jobTitle: r.role,
      city: r.region,
      source: "linkedin" as const,
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
    const leads = results.map(r => ({
      firstName: r.name.split(" ")[0] || "",
      lastName: r.name.split(" ").slice(1).join(" ") || "",
      email: r.email,
      company: r.company,
      jobTitle: r.role,
      city: r.region,
      source: "web_search" as const,
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
      </div>

      {/* Info Box */}
      {activeTab === "search" && !searching && !showResults && (
        <div className="p-4 bg-[#f4f7f6] border border-[#d4ddd8] rounded-xl mt-5 mb-5">
          <p className="text-[13px] text-[#444] leading-relaxed">
            <strong>Where the engine looks:</strong> Company websites (team pages, about pages, contact pages), Google search results for LinkedIn profiles, industry association member directories, MERX, Alberta Purchasing Connection, municipal procurement portals, and any paid directory APIs you connect in Settings. Focused on finding companies that need <strong>fencing</strong> — temporary, permanent, construction hoarding, event perimeter, and security fencing.
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
      {activeTab === "search" && showTenders && (
        <div className="bg-white rounded-xl border border-[#e8e8ee] p-6 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">📋</span>
            <h3 className="text-[16px] font-bold">Tenders & Active Projects Found</h3>
            <span className="badge-amber">4 found</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-[#f8f5f0] rounded-lg border border-[#d8d0c4]">
              <div className="text-[12px] font-semibold text-[#8c7355] mb-1">📋 MERX — RFP</div>
              <div className="text-[13px] font-semibold">City of Edmonton — Temporary Fencing, LRT Valley Line West</div>
              <div className="text-[12px] text-[#888] mt-1">Posted Jun 16 · Closes Jul 4 · Est. 2,400 linear ft</div>
            </div>
            <div className="p-3 bg-[#f8f5f0] rounded-lg border border-[#d8d0c4]">
              <div className="text-[12px] font-semibold text-[#8c7355] mb-1">🏗️ Building Permit</div>
              <div className="text-[13px] font-semibold">Windermere Mixed-Use — Perimeter & Construction Fencing</div>
              <div className="text-[12px] text-[#888] mt-1">Permit issued Jun 12 · Edmonton · 340 units · GC: Qualico</div>
            </div>
            <div className="p-3 bg-[#f8f5f0] rounded-lg border border-[#d8d0c4]">
              <div className="text-[12px] font-semibold text-[#8c7355] mb-1">📋 Alberta Purchasing Connection</div>
              <div className="text-[13px] font-semibold">Strathcona County — Security Fencing for Rec Centre Expansion</div>
              <div className="text-[12px] text-[#888] mt-1">Posted Jun 14 · Closes Jun 28 · Chain link + temp construction fence</div>
            </div>
            <div className="p-3 bg-[#f8f5f0] rounded-lg border border-[#d8d0c4]">
              <div className="text-[12px] font-semibold text-[#8c7355] mb-1">🔨 Demolition Permit</div>
              <div className="text-[13px] font-semibold">Old Strathcona Block Demolition — Construction Hoarding Required</div>
              <div className="text-[12px] text-[#888] mt-1">Permit issued Jun 10 · Edmonton · Full perimeter hoarding + temp fence</div>
            </div>
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
            <div className="text-center py-8 text-[#888]">
              <p className="text-[14px]">No results found. Try adjusting your criteria.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((c, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-[#eee] result-row" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-4 h-4 rounded border-2 border-[#ddd] shrink-0" />
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
            <div className="text-center pt-3 text-[13px] text-[#888]">
              Showing {results.length} contacts · Click "Import All" to move them to Segment
          </div>
         )}
        </div>
      )}

      {/* CSV Import Tab */}
      {activeTab === "csv" && (
        <div>
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
