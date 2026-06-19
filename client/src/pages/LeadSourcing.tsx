import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Download, Building2, MapPin, Users, Loader2, Mail, ArrowRight, ArrowLeft, Upload, ChevronRight } from "lucide-react";

type Company = {
  name: string;
  domain: string;
  city: string;
  type: string;
  emailPattern: string;
  description: string;
};

export default function LeadSourcing() {
  // Step 1: Category selection
  const [category, setCategory] = useState("general_contractor");
  const [region, setRegion] = useState("edmonton");
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Step 2: Company drill-down
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [emailPattern, setEmailPattern] = useState("first.last");
  const [companyDomain, setCompanyDomain] = useState("");

  // CSV Import state
  const [csvResults, setCsvResults] = useState<any[]>([]);
  const [selectedCsvResults, setSelectedCsvResults] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const createBulk = trpc.leads.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} contacts imported to database`);
      setSelectedContacts(new Set());
      setSelectedCsvResults(new Set());
    },
    onError: () => toast.error("Failed to import contacts"),
  });

  // Generate company list
  const companySearch = trpc.webSearch.search.useMutation({
    onSuccess: (data) => {
      // Parse company list from results
      const companyList: Company[] = data.results.map((r: any) => ({
        name: r.company,
        domain: r.email?.split("@")[1] || "",
        city: r.city || "",
        type: category,
        emailPattern: "first.last",
        description: r.serviceNeed || r.relevanceNote || "",
      }));
      // Deduplicate by company name
      const unique = companyList.filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i);
      setCompanies(unique);
      setIsLoadingCompanies(false);
      if (unique.length === 0) toast.info("No companies found. Try a different category.");
      else toast.success(`Found ${unique.length} companies`);
    },
    onError: () => { setIsLoadingCompanies(false); toast.error("Search failed"); },
  });

  // Generate contacts for a company
  const contactSearch = trpc.webSearch.search.useMutation({
    onSuccess: (data) => {
      setContacts(data.results);
      setIsLoadingContacts(false);
      if (data.results.length > 0 && data.results[0]?.email) {
        const domain = data.results[0].email.split("@")[1] || "";
        setCompanyDomain(domain);
      }
    },
    onError: () => { setIsLoadingContacts(false); toast.error("Failed to find contacts"); },
  });

  const handleFindCompanies = () => {
    setIsLoadingCompanies(true);
    setCompanies([]);
    setSelectedCompany(null);
    setContacts([]);

    const categoryLabels: Record<string, string> = {
      general_contractor: "general contractors construction companies",
      municipality: "municipalities cities counties government",
      home_builder: "home builders residential developers",
      civil: "civil engineering infrastructure companies",
      rental_company: "equipment rental companies site services",
      excavation: "excavation companies earthwork contractors",
      event: "event management companies festivals",
      environmental: "environmental disaster cleanup companies",
    };

    companySearch.mutate({
      criteria: `list of ${categoryLabels[category] || category}`,
      region,
      industry: category,
      customKeywords: "that need temporary fencing toilets site services",
    });
  };

  const handleDrillIntoCompany = (company: Company) => {
    setSelectedCompany(company);
    setCompanyDomain(company.domain);
    setContacts([]);
    setSelectedContacts(new Set());
    setIsLoadingContacts(true);

    contactSearch.mutate({
      criteria: `estimator buyer project manager at ${company.name}`,
      region,
      industry: category,
      customKeywords: company.name,
    });
  };

  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setContacts([]);
    setSelectedContacts(new Set());
  };

  // Email pattern logic
  const generateEmail = (first: string, last: string, domain: string, pattern: string) => {
    if (!first || !last || !domain) return "";
    const f = first.toLowerCase().replace(/[^a-z]/g, "");
    const l = last.toLowerCase().replace(/[^a-z]/g, "");
    switch (pattern) {
      case "first.last": return `${f}.${l}@${domain}`;
      case "f.last": return `${f[0]}.${l}@${domain}`;
      case "flast": return `${f[0]}${l}@${domain}`;
      case "first_last": return `${f}_${l}@${domain}`;
      case "firstl": return `${f}${l[0]}@${domain}`;
      case "first": return `${f}@${domain}`;
      default: return `${f}.${l}@${domain}`;
    }
  };

  const toggleContact = (idx: number) => {
    const next = new Set(selectedContacts);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelectedContacts(next);
  };

  const selectAll = () => {
    if (selectedContacts.size === contacts.length) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(contacts.map((_, i) => i)));
  };

  const importSelected = () => {
    const leadsToImport = contacts
      .filter((_, i) => selectedContacts.has(i))
      .map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email || generateEmail(r.firstName, r.lastName, companyDomain, emailPattern),
        jobTitle: r.jobTitle || undefined,
        company: selectedCompany?.name || r.company,
        companyType: category as any,
        city: r.city || selectedCompany?.city || undefined,
        region: region !== "all" ? region as any : undefined,
        source: "web_search" as const,
      }));
    createBulk.mutate({ leads: leadsToImport });
  };

  // CSV handlers
  const parseCsv = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/["']/g, ""));
    const colMap: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h.includes("first") && h.includes("name")) colMap.firstName = String(i);
      else if (h.includes("last") && h.includes("name")) colMap.lastName = String(i);
      else if (h === "first name" || h === "firstname") colMap.firstName = String(i);
      else if (h === "last name" || h === "lastname") colMap.lastName = String(i);
      else if (h.includes("title") || h.includes("position") || h.includes("job")) colMap.jobTitle = String(i);
      else if (h.includes("company") || h.includes("organization")) colMap.company = String(i);
      else if (h.includes("location") || h.includes("geography") || h.includes("city")) colMap.city = String(i);
      else if (h.includes("email")) colMap.email = String(i);
    });
    if (!colMap.firstName && headers.length >= 2) {
      colMap.firstName = "0"; colMap.lastName = "1";
      if (headers.length >= 3) colMap.jobTitle = "2";
      if (headers.length >= 4) colMap.company = "3";
      if (headers.length >= 5) colMap.city = "4";
    }
    return lines.slice(1).map(line => {
      const cols: string[] = []; let current = ""; let inQuotes = false;
      for (const char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ""; }
        else current += char;
      }
      cols.push(current.trim());
      const firstName = cols[parseInt(colMap.firstName || "0")] || "";
      const lastName = cols[parseInt(colMap.lastName || "1")] || "";
      if (!firstName && !lastName) return null;
      return {
        firstName, lastName,
        jobTitle: cols[parseInt(colMap.jobTitle || "2")] || "",
        company: cols[parseInt(colMap.company || "3")] || "",
        city: cols[parseInt(colMap.city || "4")] || "",
        email: colMap.email ? cols[parseInt(colMap.email)] : undefined,
      };
    }).filter(Boolean);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const results = parseCsv(ev.target?.result as string);
        setCsvResults(results);
        setSelectedCsvResults(new Set(results.map((_, i) => i)));
        toast.success(`Parsed ${results.length} contacts`);
      };
      reader.readAsText(file);
    } else toast.error("Please upload a .csv file");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const results = parseCsv(ev.target?.result as string);
        setCsvResults(results);
        setSelectedCsvResults(new Set(results.map((_, i) => i)));
        toast.success(`Parsed ${results.length} contacts`);
      };
      reader.readAsText(file);
    } else toast.error("Please upload a .csv file");
  };

  const importCsvSelected = () => {
    const leadsToImport = csvResults
      .filter((_, i) => selectedCsvResults.has(i))
      .map((r: any) => ({
        firstName: r.firstName, lastName: r.lastName,
        email: r.email || (companyDomain ? generateEmail(r.firstName, r.lastName, companyDomain, emailPattern) : undefined),
        jobTitle: r.jobTitle || undefined, company: r.company || undefined,
        city: r.city || undefined, source: "linkedin" as const,
      }));
    createBulk.mutate({ leads: leadsToImport });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Sourcing</h1>
        <p className="text-muted-foreground mt-1">
          Find target companies, then drill into contacts — automated.
        </p>
      </div>

      <Tabs defaultValue="discover" className="space-y-4">
        <TabsList>
          <TabsTrigger value="discover" className="gap-2">
            <Search className="h-4 w-4" />
            Discover Companies
          </TabsTrigger>
          <TabsTrigger value="csv" className="gap-2">
            <Upload className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
        </TabsList>

        {/* ─── Discover Companies ─────────────────────────────────────────── */}
        <TabsContent value="discover" className="space-y-4">

          {/* If no company selected, show company finder */}
          {!selectedCompany ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Find Target Companies</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Pick a category and region — the tool generates a list of companies to work through.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Company Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general_contractor">General Contractors</SelectItem>
                          <SelectItem value="municipality">Municipalities / Cities / Counties</SelectItem>
                          <SelectItem value="home_builder">Home Builders</SelectItem>
                          <SelectItem value="civil">Civil / Infrastructure</SelectItem>
                          <SelectItem value="rental_company">Rental Companies (buy fence to rent out)</SelectItem>
                          <SelectItem value="excavation">Excavation / Earthwork Subtrades</SelectItem>
                          <SelectItem value="event">Event Companies</SelectItem>
                          <SelectItem value="environmental">Environmental / Disaster Cleanup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Region</Label>
                      <Select value={region} onValueChange={setRegion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="edmonton">Edmonton, AB</SelectItem>
                          <SelectItem value="calgary">Calgary, AB</SelectItem>
                          <SelectItem value="red_deer">Red Deer, AB</SelectItem>
                          <SelectItem value="all">All Alberta</SelectItem>
                          <SelectItem value="bc">British Columbia</SelectItem>
                          <SelectItem value="sk">Saskatchewan</SelectItem>
                          <SelectItem value="on">Ontario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleFindCompanies} disabled={isLoadingCompanies} className="gap-2">
                    {isLoadingCompanies ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {isLoadingCompanies ? "Finding companies..." : "Generate Company List"}
                  </Button>
                </CardContent>
              </Card>

              {/* Company List */}
              {companies.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Companies to Work Through ({companies.length})</CardTitle>
                    <p className="text-xs text-muted-foreground">Click a company to find contacts and generate emails.</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {companies.map((company, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDrillIntoCompany(company)}
                          className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all group"
                        >
                          <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{company.name}</span>
                              {company.domain && (
                                <span className="text-xs text-muted-foreground font-mono">@{company.domain}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {company.city && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{company.city}</span>
                              )}
                              {company.description && (
                                <span className="line-clamp-1">{company.description}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            /* Company selected — show contacts */
            <>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleBackToCompanies} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back to Companies
                </Button>
              </div>

              {/* Company Header + Email Pattern */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{selectedCompany.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{selectedCompany.city} · {selectedCompany.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Email Pattern</Label>
                      <Select value={emailPattern} onValueChange={setEmailPattern}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first.last">first.last@ (john.smith@)</SelectItem>
                          <SelectItem value="f.last">f.last@ (j.smith@)</SelectItem>
                          <SelectItem value="flast">flast@ (jsmith@)</SelectItem>
                          <SelectItem value="first_last">first_last@ (john_smith@)</SelectItem>
                          <SelectItem value="firstl">firstl@ (johns@)</SelectItem>
                          <SelectItem value="first">first@ (john@)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Company Domain</Label>
                      <Input
                        value={companyDomain}
                        onChange={(e) => setCompanyDomain(e.target.value)}
                        placeholder="e.g., aecon.com"
                      />
                    </div>
                  </div>
                  {companyDomain && contacts[0] && (
                    <div className="mt-3 p-2 bg-muted/30 rounded-md">
                      <p className="text-xs text-muted-foreground">Preview: <span className="font-mono text-foreground">{generateEmail(contacts[0].firstName, contacts[0].lastName, companyDomain, emailPattern)}</span></p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contacts */}
              {isLoadingContacts ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Finding contacts at {selectedCompany.name}...</p>
                  </CardContent>
                </Card>
              ) : contacts.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Contacts at {selectedCompany.name} ({contacts.length})</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                          {selectedContacts.size === contacts.length ? "Deselect All" : "Select All"}
                        </Button>
                        <Button
                          size="sm"
                          disabled={selectedContacts.size === 0 || createBulk.isPending}
                          onClick={importSelected}
                          className="gap-2"
                        >
                          {createBulk.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          Import {selectedContacts.size} to Database
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {contacts.map((contact, idx) => {
                        const email = contact.email || generateEmail(contact.firstName, contact.lastName, companyDomain, emailPattern);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleContact(idx)}
                            className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedContacts.has(idx) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              selectedContacts.has(idx) ? "bg-primary border-primary" : "border-muted-foreground/30"
                            }`}>
                              {selectedContacts.has(idx) && (
                                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{contact.firstName} {contact.lastName}</span>
                                {contact.jobTitle && <Badge variant="secondary" className="text-xs">{contact.jobTitle}</Badge>}
                              </div>
                              {email && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs font-mono text-foreground">{email}</span>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-200 bg-amber-50">Pattern</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </TabsContent>

        {/* ─── CSV Import ─────────────────────────────────────────────────── */}
        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Import from Sales Navigator CSV</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Export a lead list from LinkedIn Sales Navigator, then drop the CSV here.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email Pattern</Label>
                  <Select value={emailPattern} onValueChange={setEmailPattern}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first.last">first.last@</SelectItem>
                      <SelectItem value="f.last">f.last@</SelectItem>
                      <SelectItem value="flast">flast@</SelectItem>
                      <SelectItem value="first_last">first_last@</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Company Domain (if same company)</Label>
                  <Input value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)} placeholder="e.g., aecon.com" />
                </div>
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Drag & drop CSV here</p>
                <p className="text-xs text-muted-foreground mt-1">Or click to browse</p>
                <input type="file" accept=".csv" onChange={handleFileSelect} className="opacity-0 cursor-pointer" style={{ position: 'relative', marginTop: '8px' }} />
              </div>
            </CardContent>
          </Card>

          {csvResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Contacts ({csvResults.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      if (selectedCsvResults.size === csvResults.length) setSelectedCsvResults(new Set());
                      else setSelectedCsvResults(new Set(csvResults.map((_, i) => i)));
                    }}>
                      {selectedCsvResults.size === csvResults.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button size="sm" disabled={selectedCsvResults.size === 0 || createBulk.isPending} onClick={importCsvSelected} className="gap-2">
                      {createBulk.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Import {selectedCsvResults.size}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {csvResults.map((r: any, idx) => {
                    const email = r.email || (companyDomain ? generateEmail(r.firstName, r.lastName, companyDomain, emailPattern) : "");
                    return (
                      <div key={idx} onClick={() => { const n = new Set(selectedCsvResults); if (n.has(idx)) n.delete(idx); else n.add(idx); setSelectedCsvResults(n); }}
                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${selectedCsvResults.has(idx) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"}`}>
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedCsvResults.has(idx) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                          {selectedCsvResults.has(idx) && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.firstName} {r.lastName}</span>
                            {r.jobTitle && <Badge variant="secondary" className="text-xs">{r.jobTitle}</Badge>}
                          </div>
                          {r.company && <p className="text-xs text-muted-foreground mt-0.5">{r.company} {r.city ? `· ${r.city}` : ""}</p>}
                          {email && <div className="flex items-center gap-1.5 mt-1"><Mail className="h-3 w-3 text-muted-foreground" /><span className="text-xs font-mono">{email}</span><Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-200 bg-amber-50">Pattern</Badge></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
