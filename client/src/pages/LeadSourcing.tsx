import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Download, Building2, MapPin, Briefcase, Linkedin, BookOpen, Globe, Loader2, Sparkles, Info } from "lucide-react";

export default function LeadSourcing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [companyType, setCompanyType] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());

  // Web search state
  const [webCriteria, setWebCriteria] = useState("people needing fencing");
  const [webRegion, setWebRegion] = useState("all");
  const [webIndustry, setWebIndustry] = useState("all");
  const [webKeywords, setWebKeywords] = useState("");
  const [webResults, setWebResults] = useState<any[]>([]);
  const [selectedWebResults, setSelectedWebResults] = useState<Set<number>>(new Set());
  const [isWebSearching, setIsWebSearching] = useState(false);

  // LinkedIn scraping state
  const [liJobTitle, setLiJobTitle] = useState("project manager OR estimator");
  const [liCompany, setLiCompany] = useState("");
  const [liRegion, setLiRegion] = useState("all");
  const [liIndustry, setLiIndustry] = useState("all");
  const [liKeywords, setLiKeywords] = useState("");
  const [liResults, setLiResults] = useState<any[]>([]);
  const [selectedLiResults, setSelectedLiResults] = useState<Set<number>>(new Set());
  const [isLinkedInScraping, setIsLinkedInScraping] = useState(false);

  const createBulk = trpc.leads.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} leads imported successfully`);
      setSelectedResults(new Set());
      setSelectedWebResults(new Set());
      setSelectedLiResults(new Set());
      setSearchResults([]);
      setWebResults([]);
      setLiResults([]);
    },
    onError: () => toast.error("Failed to import leads"),
  });

  const linkedInScrapeMutation = trpc.linkedin.scrape.useMutation({
    onSuccess: (data) => {
      setLiResults(data.results);
      setIsLinkedInScraping(false);
      if (data.results.length === 0) {
        toast.info("No LinkedIn profiles found. Try different criteria.");
      } else {
        toast.success(`Found ${data.results.length} LinkedIn profiles`);
      }
    },
    onError: () => {
      setIsLinkedInScraping(false);
      toast.error("LinkedIn scraping failed. Please try again.");
    },
  });

  const webSearchMutation = trpc.webSearch.search.useMutation({
    onSuccess: (data) => {
      setWebResults(data.results);
      setIsWebSearching(false);
      if (data.results.length === 0) {
        toast.info("No results found. Try different criteria.");
      } else {
        toast.success(`Found ${data.results.length} potential leads`);
      }
    },
    onError: (err) => {
      setIsWebSearching(false);
      toast.error("Web search failed. Please try again.");
    },
  });

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      const mockResults = generateMockResults(searchQuery, region, companyType);
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 1200);
  };

  const handleWebSearch = () => {
    setIsWebSearching(true);
    setWebResults([]);
    setSelectedWebResults(new Set());
    webSearchMutation.mutate({
      criteria: webCriteria,
      region: webRegion,
      industry: webIndustry,
      customKeywords: webKeywords,
    });
  };

  const handleLinkedInScrape = () => {
    setIsLinkedInScraping(true);
    setLiResults([]);
    setSelectedLiResults(new Set());
    linkedInScrapeMutation.mutate({
      jobTitle: liJobTitle,
      company: liCompany,
      region: liRegion,
      industry: liIndustry,
      keywords: liKeywords,
    });
  };

  const toggleLiSelect = (idx: number) => {
    const next = new Set(selectedLiResults);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedLiResults(next);
  };

  const selectAllLinkedIn = () => {
    if (selectedLiResults.size === liResults.length) {
      setSelectedLiResults(new Set());
    } else {
      setSelectedLiResults(new Set(liResults.map((_, i) => i)));
    }
  };

  const importLinkedInSelected = () => {
    const leadsToImport = liResults
      .filter((_, i) => selectedLiResults.has(i))
      .map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        jobTitle: r.jobTitle || undefined,
        company: r.company,
        companyType: r.companyType,
        city: r.location || undefined,
        region: r.region,
        source: "linkedin" as const,
        sourceUrl: r.linkedinUrl || undefined,
        linkedinUrl: r.linkedinUrl || undefined,
      }));
    createBulk.mutate({ leads: leadsToImport });
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedResults);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedResults(next);
  };

  const toggleWebSelect = (idx: number) => {
    const next = new Set(selectedWebResults);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedWebResults(next);
  };

  const selectAll = () => {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map((_, i) => i)));
    }
  };

  const selectAllWeb = () => {
    if (selectedWebResults.size === webResults.length) {
      setSelectedWebResults(new Set());
    } else {
      setSelectedWebResults(new Set(webResults.map((_, i) => i)));
    }
  };

  const importSelected = () => {
    const leadsToImport = searchResults
      .filter((_, i) => selectedResults.has(i))
      .map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        jobTitle: r.jobTitle,
        company: r.company,
        companyType: r.companyType,
        city: r.city,
        region: r.region,
        source: r.source as "scotts_directories" | "linkedin",
        sourceUrl: r.sourceUrl,
      }));
    createBulk.mutate({ leads: leadsToImport });
  };

  const importWebSelected = () => {
    const leadsToImport = webResults
      .filter((_, i) => selectedWebResults.has(i))
      .map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email || undefined,
        phone: r.phone || undefined,
        jobTitle: r.jobTitle || undefined,
        company: r.company,
        companyType: r.companyType,
        city: r.city || undefined,
        region: r.region,
        source: "web_search" as const,
        sourceUrl: r.sourceUrl || undefined,
      }));
    createBulk.mutate({ leads: leadsToImport });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Sourcing</h1>
        <p className="text-muted-foreground mt-1">
          Search and import contacts from Scott's Directories, LinkedIn, and the web.
        </p>
      </div>

      <Tabs defaultValue="web" className="space-y-4">
        <TabsList>
          <TabsTrigger value="web" className="gap-2">
            <Globe className="h-4 w-4" />
            Web Search
          </TabsTrigger>
          <TabsTrigger value="scotts" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Scott's Directories
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </TabsTrigger>
        </TabsList>

        {/* ─── Web Search Tab ─────────────────────────────────────────────── */}
        <TabsContent value="web" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Search the Internet</CardTitle>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" /> AI-Powered
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Search the web for companies and people who need fencing services. AI extracts structured contact information from results.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Criteria */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Search Criteria</label>
                  <Select value={webCriteria} onValueChange={setWebCriteria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="people needing fencing">People Needing Fencing</SelectItem>
                      <SelectItem value="temporary fence rentals">Temporary Fence Rentals</SelectItem>
                      <SelectItem value="construction site fencing needed">Construction Site Fencing</SelectItem>
                      <SelectItem value="municipal fencing projects">Municipal Fencing Projects</SelectItem>
                      <SelectItem value="residential fence installation">Residential Fence Installation</SelectItem>
                      <SelectItem value="commercial property fencing">Commercial Property Fencing</SelectItem>
                      <SelectItem value="event temporary fencing">Event Temporary Fencing</SelectItem>
                      <SelectItem value="industrial perimeter fencing">Industrial Perimeter Fencing</SelectItem>
                      <SelectItem value="new construction projects needing fencing">New Construction Projects</SelectItem>
                      <SelectItem value="property developers needing fencing">Property Developers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Region</label>
                    <Select value={webRegion} onValueChange={setWebRegion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Alberta</SelectItem>
                        <SelectItem value="edmonton">Edmonton</SelectItem>
                        <SelectItem value="calgary">Calgary</SelectItem>
                        <SelectItem value="red_deer">Red Deer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Industry Focus</label>
                    <Select value={webIndustry} onValueChange={setWebIndustry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Industries</SelectItem>
                        <SelectItem value="fence_installation">Fence Installation</SelectItem>
                        <SelectItem value="temp_fence_rental">Temp Fence Rental</SelectItem>
                        <SelectItem value="construction_fencing">Construction Fencing</SelectItem>
                        <SelectItem value="municipal_projects">Municipal Projects</SelectItem>
                        <SelectItem value="residential_fencing">Residential Fencing</SelectItem>
                        <SelectItem value="commercial_fencing">Commercial Fencing</SelectItem>
                        <SelectItem value="event_fencing">Event Fencing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Custom Keywords</label>
                    <Input
                      value={webKeywords}
                      onChange={(e) => setWebKeywords(e.target.value)}
                      placeholder="e.g., chain link, privacy fence..."
                      onKeyDown={(e) => e.key === "Enter" && handleWebSearch()}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleWebSearch} disabled={isWebSearching} className="gap-2">
                  {isWebSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  {isWebSearching ? "Searching..." : "Search the Web"}
                </Button>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  AI will extract contact details from web results
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Web Search Results */}
          {webResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Web Results ({webResults.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllWeb}>
                      {selectedWebResults.size === webResults.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={selectedWebResults.size === 0 || createBulk.isPending}
                      onClick={importWebSelected}
                      className="gap-2"
                    >
                      {createBulk.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Import {selectedWebResults.size} Selected
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {webResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleWebSelect(idx)}
                      className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedWebResults.has(idx)
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedWebResults.has(idx) ? "bg-primary border-primary" : "border-muted-foreground/30"
                      }`}>
                        {selectedWebResults.has(idx) && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{result.firstName} {result.lastName}</span>
                          {result.jobTitle && <Badge variant="secondary" className="text-xs">{result.jobTitle}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />{result.company}
                          </span>
                          {result.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{result.city}
                            </span>
                          )}
                        </div>
                        {result.relevanceNote && (
                          <p className="text-xs text-muted-foreground/80 mt-1 italic">
                            {result.relevanceNote}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 gap-1">
                        <Globe className="h-3 w-3" /> Web
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Scott's Directories Tab ────────────────────────────────────── */}
        <TabsContent value="scotts" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Search Scott's Directories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Search companies, contacts, or job titles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Alberta</SelectItem>
                    <SelectItem value="edmonton">Edmonton</SelectItem>
                    <SelectItem value="calgary">Calgary</SelectItem>
                    <SelectItem value="red_deer">Red Deer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={companyType} onValueChange={setCompanyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Company Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="municipality">Municipalities</SelectItem>
                    <SelectItem value="general_contractor">General Contractors</SelectItem>
                    <SelectItem value="home_builder">Home Builders</SelectItem>
                    <SelectItem value="civil">Civil Projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search Directories
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LinkedIn Tab (Real Scraping) ─────────────────────────────── */}
        <TabsContent value="linkedin" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Scrape LinkedIn Profiles</CardTitle>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" /> Live Scraping
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Searches Google for real LinkedIn profiles matching your criteria, then AI extracts structured contact data.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Job Title</label>
                  <Select value={liJobTitle} onValueChange={setLiJobTitle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project manager OR estimator">Project Manager / Estimator</SelectItem>
                      <SelectItem value="buyer OR procurement manager">Buyer / Procurement</SelectItem>
                      <SelectItem value="operations manager OR site superintendent">Operations / Site Super</SelectItem>
                      <SelectItem value="construction manager">Construction Manager</SelectItem>
                      <SelectItem value="facilities manager">Facilities Manager</SelectItem>
                      <SelectItem value="property manager">Property Manager</SelectItem>
                      <SelectItem value="director of operations">Director of Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company (optional)</label>
                  <Input
                    value={liCompany}
                    onChange={(e) => setLiCompany(e.target.value)}
                    placeholder="e.g., PCL Construction, City of Edmonton..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Region</label>
                  <Select value={liRegion} onValueChange={setLiRegion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Alberta</SelectItem>
                      <SelectItem value="edmonton">Edmonton</SelectItem>
                      <SelectItem value="calgary">Calgary</SelectItem>
                      <SelectItem value="red_deer">Red Deer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Industry</label>
                  <Select value={liIndustry} onValueChange={setLiIndustry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      <SelectItem value="municipality">Government / Municipal</SelectItem>
                      <SelectItem value="general_contractor">Construction / GC</SelectItem>
                      <SelectItem value="home_builder">Residential Builder</SelectItem>
                      <SelectItem value="civil">Civil Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Additional Keywords</label>
                  <Input
                    value={liKeywords}
                    onChange={(e) => setLiKeywords(e.target.value)}
                    placeholder="e.g., fence, construction..."
                    onKeyDown={(e) => e.key === "Enter" && handleLinkedInScrape()}
                  />
                </div>
              </div>
              <Button onClick={handleLinkedInScrape} disabled={isLinkedInScraping} className="gap-2">
                {isLinkedInScraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Linkedin className="h-4 w-4" />}
                {isLinkedInScraping ? "Scraping LinkedIn..." : "Scrape LinkedIn Profiles"}
              </Button>
            </CardContent>
          </Card>

          {/* LinkedIn Results */}
          {liResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    LinkedIn Profiles Found ({liResults.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllLinkedIn}>
                      {selectedLiResults.size === liResults.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={selectedLiResults.size === 0 || createBulk.isPending}
                      onClick={importLinkedInSelected}
                      className="gap-2"
                    >
                      {createBulk.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Import {selectedLiResults.size} Selected
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {liResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleLiSelect(idx)}
                      className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedLiResults.has(idx)
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedLiResults.has(idx) ? "bg-primary border-primary" : "border-muted-foreground/30"
                      }`}>
                        {selectedLiResults.has(idx) && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{result.firstName} {result.lastName}</span>
                          <Badge variant="secondary" className="text-xs">{result.jobTitle}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />{result.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{result.location}
                          </span>
                        </div>
                        {result.summary && (
                          <p className="text-xs text-muted-foreground/80 mt-1 italic">{result.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {result.linkedinUrl && (
                          <a
                            href={result.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Profile
                          </a>
                        )}
                        <Badge variant="outline" className="text-xs shrink-0 gap-1">
                          <Linkedin className="h-3 w-3" /> LinkedIn
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Scott's / LinkedIn Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Search Results ({searchResults.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedResults.size === searchResults.length ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedResults.size === 0 || createBulk.isPending}
                  onClick={importSelected}
                  className="gap-2"
                >
                  {createBulk.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Import {selectedResults.size} Selected
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedResults.has(idx)
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedResults.has(idx) ? "bg-primary border-primary" : "border-muted-foreground/30"
                  }`}>
                    {selectedResults.has(idx) && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{result.firstName} {result.lastName}</span>
                      <Badge variant="secondary" className="text-xs">{result.jobTitle}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />{result.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{result.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />{result.companyTypeLabel}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {result.source === "scotts_directories" ? "Scott's" : "LinkedIn"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Mock data generator for Scott's / LinkedIn demonstration
function generateMockResults(query: string, region: string, companyType: string) {
  const companies: Record<string, any[]> = {
    municipality: [
      { company: "City of Edmonton", city: "Edmonton", region: "edmonton" },
      { company: "City of Calgary", city: "Calgary", region: "calgary" },
      { company: "City of Red Deer", city: "Red Deer", region: "red_deer" },
      { company: "Strathcona County", city: "Sherwood Park", region: "edmonton" },
      { company: "Rocky View County", city: "Calgary", region: "calgary" },
    ],
    general_contractor: [
      { company: "PCL Construction", city: "Edmonton", region: "edmonton" },
      { company: "Graham Construction", city: "Calgary", region: "calgary" },
      { company: "Clark Builders", city: "Edmonton", region: "edmonton" },
      { company: "Stuart Olson", city: "Calgary", region: "calgary" },
      { company: "EllisDon Alberta", city: "Edmonton", region: "edmonton" },
    ],
    home_builder: [
      { company: "Jayman Built", city: "Calgary", region: "calgary" },
      { company: "Brookfield Residential", city: "Calgary", region: "calgary" },
      { company: "Landmark Homes", city: "Edmonton", region: "edmonton" },
      { company: "Pacesetter Homes", city: "Edmonton", region: "edmonton" },
      { company: "Shane Homes", city: "Calgary", region: "calgary" },
    ],
  };

  const titles = ["Project Manager", "Estimator", "Procurement Manager", "Buyer", "Site Superintendent", "Operations Manager"];
  const firstNames = ["James", "Sarah", "Michael", "Jennifer", "David", "Lisa", "Robert", "Amanda", "Chris", "Nicole"];
  const lastNames = ["Anderson", "Thompson", "Wilson", "Martinez", "Johnson", "Brown", "Taylor", "Davis", "Miller", "Garcia"];

  const typeLabel: Record<string, string> = {
    municipality: "Municipality",
    general_contractor: "General Contractor",
    home_builder: "Home Builder",
    civil: "Civil",
  };

  let pool: any[] = [];
  const types = companyType === "all" ? ["municipality", "general_contractor", "home_builder"] : [companyType];

  types.forEach((type) => {
    (companies[type] || []).forEach((c) => {
      if (region !== "all" && c.region !== region) return;
      pool.push({ ...c, companyType: type, companyTypeLabel: typeLabel[type] || type });
    });
  });

  return pool.slice(0, 10).map((c, i) => ({
    firstName: firstNames[i % firstNames.length],
    lastName: lastNames[i % lastNames.length],
    email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@${c.company.toLowerCase().replace(/\s+/g, "")}.ca`,
    phone: `780-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    jobTitle: titles[i % titles.length],
    company: c.company,
    companyType: c.companyType,
    companyTypeLabel: c.companyTypeLabel,
    city: c.city,
    region: c.region,
    source: i % 2 === 0 ? "scotts_directories" : "linkedin",
    sourceUrl: i % 2 === 0 ? `https://scottsdirectories.com/listing/${i}` : `https://linkedin.com/in/${firstNames[i % firstNames.length].toLowerCase()}${lastNames[i % lastNames.length].toLowerCase()}`,
  }));
}
