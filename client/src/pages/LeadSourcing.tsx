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
import { Search, Download, Building2, MapPin, Briefcase, Linkedin, Users, Globe, Loader2, Sparkles, Mail, ArrowRight, CheckCircle2, Upload } from "lucide-react";

export default function LeadSourcing() {
  // Step 1: Company search
  const [companyName, setCompanyName] = useState("");
  const [jobFunction, setJobFunction] = useState("estimator");
  const [region, setRegion] = useState("all");
  const [segment, setSegment] = useState("general_contractor");

  // Results state
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
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

  const webSearch = trpc.webSearch.search.useMutation({
    onSuccess: (data) => {
      setContacts(data.results);
      setIsSearching(false);
      if (data.results.length === 0) {
        toast.info("No contacts found. Try a different company or role.");
      } else {
        toast.success(`Found ${data.results.length} contacts`);
        // Auto-detect domain from first result
        if (data.results[0]?.email) {
          const domain = data.results[0].email.split("@")[1] || "";
          setCompanyDomain(domain);
        }
      }
    },
    onError: () => {
      setIsSearching(false);
      toast.error("Search failed. Please try again.");
    },
  });

  const handleCompanySearch = () => {
    if (!companyName.trim()) {
      toast.error("Enter a company name");
      return;
    }
    setIsSearching(true);
    setContacts([]);
    setSelectedContacts(new Set());
    webSearch.mutate({
      criteria: `${jobFunction} at ${companyName}`,
      region,
      industry: segment,
      customKeywords: companyName,
    });
  };

  const toggleContact = (idx: number) => {
    const next = new Set(selectedContacts);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
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
        company: companyName || r.company,
        companyType: segment as any,
        city: r.city || undefined,
        region: region !== "all" ? region as any : undefined,
        source: "web_search" as const,
      }));
    createBulk.mutate({ leads: leadsToImport });
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
      else if (h.includes("linkedin") || h.includes("url") || h.includes("profile")) colMap.linkedinUrl = String(i);
      else if (h.includes("email")) colMap.email = String(i);
    });

    if (!colMap.firstName && headers.length >= 2) {
      colMap.firstName = "0"; colMap.lastName = "1";
      if (headers.length >= 3) colMap.jobTitle = "2";
      if (headers.length >= 4) colMap.company = "3";
      if (headers.length >= 5) colMap.city = "4";
    }

    return lines.slice(1).map(line => {
      const cols: string[] = [];
      let current = ""; let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ""; }
        else { current += char; }
      }
      cols.push(current.trim());

      const firstName = cols[parseInt(colMap.firstName || "0")] || "";
      const lastName = cols[parseInt(colMap.lastName || "1")] || "";
      const company = cols[parseInt(colMap.company || "3")] || "";
      const jobTitle = cols[parseInt(colMap.jobTitle || "2")] || "";
      const city = cols[parseInt(colMap.city || "4")] || "";
      const linkedinUrl = colMap.linkedinUrl ? cols[parseInt(colMap.linkedinUrl)] : "";
      const existingEmail = colMap.email ? cols[parseInt(colMap.email)] : "";

      if (!firstName && !lastName) return null;
      return { firstName, lastName, jobTitle, company, city, linkedinUrl, email: existingEmail || undefined };
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
        toast.success(`Parsed ${results.length} contacts from CSV`);
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
        toast.success(`Parsed ${results.length} contacts from CSV`);
      };
      reader.readAsText(file);
    } else toast.error("Please upload a .csv file");
  };

  const importCsvSelected = () => {
    const leadsToImport = csvResults
      .filter((_, i) => selectedCsvResults.has(i))
      .map((r: any) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email || (r.firstName && r.lastName && companyDomain ? generateEmail(r.firstName, r.lastName, companyDomain, emailPattern) : undefined),
        jobTitle: r.jobTitle || undefined,
        company: r.company || companyName || undefined,
        city: r.city || undefined,
        source: "linkedin" as const,
        linkedinUrl: r.linkedinUrl || undefined,
      }));
    createBulk.mutate({ leads: leadsToImport });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Sourcing</h1>
        <p className="text-muted-foreground mt-1">
          Find contacts at target companies — Rob's workflow, automated.
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Company Search
          </TabsTrigger>
          <TabsTrigger value="csv" className="gap-2">
            <Upload className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
        </TabsList>

        {/* ─── Company Search (Rob's Workflow) ─────────────────────────────── */}
        <TabsContent value="company" className="space-y-4">
          {/* Step 1: Pick a Company */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                Pick a Company & Role
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Enter the company name and select the job functions you're targeting — just like searching Scott's Directories.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., AECON, EllisDon, PCL Construction..."
                    onKeyDown={(e) => e.key === "Enter" && handleCompanySearch()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Job Function</Label>
                  <Select value={jobFunction} onValueChange={setJobFunction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estimator">Estimator</SelectItem>
                      <SelectItem value="buyer">Buyer / Purchaser</SelectItem>
                      <SelectItem value="project manager">Project Manager</SelectItem>
                      <SelectItem value="project coordinator">Project Coordinator</SelectItem>
                      <SelectItem value="site superintendent">Site Superintendent</SelectItem>
                      <SelectItem value="operations manager">Operations Manager</SelectItem>
                      <SelectItem value="procurement manager">Procurement Manager</SelectItem>
                      <SelectItem value="all roles">All Decision Makers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Company Type</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_contractor">General Contractor</SelectItem>
                      <SelectItem value="municipality">Municipality / City / County</SelectItem>
                      <SelectItem value="home_builder">Home Builder</SelectItem>
                      <SelectItem value="civil">Civil / Infrastructure</SelectItem>
                      <SelectItem value="other">Rental Company / Other</SelectItem>
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
                      <SelectItem value="all">All Alberta</SelectItem>
                      <SelectItem value="edmonton">Edmonton, AB</SelectItem>
                      <SelectItem value="calgary">Calgary, AB</SelectItem>
                      <SelectItem value="red_deer">Red Deer, AB</SelectItem>
                      <SelectItem value="bc">British Columbia</SelectItem>
                      <SelectItem value="sk">Saskatchewan</SelectItem>
                      <SelectItem value="on">Ontario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCompanySearch} disabled={isSearching} className="gap-2">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {isSearching ? "Finding contacts..." : "Find Contacts"}
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Email Pattern */}
          {contacts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                  Email Pattern
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Set the email format for {companyName || "this company"}. Most companies use one consistent pattern.
                </p>
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
                      placeholder="e.g., aecon.com, ellisdon.com"
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
          )}

          {/* Step 3: Contact Results */}
          {contacts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                    Contacts Found ({contacts.length})
                  </CardTitle>
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
                          selectedContacts.has(idx)
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "hover:bg-muted/50"
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
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />{contact.company || companyName}
                            </span>
                            {contact.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{contact.city}
                              </span>
                            )}
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
          )}
        </TabsContent>

        {/* ─── CSV Import (Sales Navigator Export) ─────────────────────────── */}
        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Import from Sales Navigator CSV</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Export your lead list from LinkedIn Sales Navigator, then drop the CSV here. Emails will be generated using the pattern above.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email Pattern (for imported contacts)</Label>
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
                  <Label className="text-sm">Company Domain (if all same company)</Label>
                  <Input
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder="e.g., aecon.com (leave blank if mixed)"
                  />
                </div>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Drag & drop your CSV file here</p>
                <p className="text-xs text-muted-foreground mt-1">Or click to browse</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="opacity-0 cursor-pointer"
                  style={{ position: 'relative', marginTop: '8px' }}
                />
              </div>
            </CardContent>
          </Card>

          {/* CSV Results */}
          {csvResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Imported Contacts ({csvResults.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      if (selectedCsvResults.size === csvResults.length) setSelectedCsvResults(new Set());
                      else setSelectedCsvResults(new Set(csvResults.map((_, i) => i)));
                    }}>
                      {selectedCsvResults.size === csvResults.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={selectedCsvResults.size === 0 || createBulk.isPending}
                      onClick={importCsvSelected}
                      className="gap-2"
                    >
                      {createBulk.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Import {selectedCsvResults.size} to Database
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {csvResults.map((r: any, idx) => {
                    const email = r.email || (r.firstName && r.lastName && companyDomain ? generateEmail(r.firstName, r.lastName, companyDomain, emailPattern) : "");
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          const next = new Set(selectedCsvResults);
                          if (next.has(idx)) next.delete(idx); else next.add(idx);
                          setSelectedCsvResults(next);
                        }}
                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedCsvResults.has(idx) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selectedCsvResults.has(idx) ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}>
                          {selectedCsvResults.has(idx) && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.firstName} {r.lastName}</span>
                            {r.jobTitle && <Badge variant="secondary" className="text-xs">{r.jobTitle}</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {r.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{r.company}</span>}
                            {r.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</span>}
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
