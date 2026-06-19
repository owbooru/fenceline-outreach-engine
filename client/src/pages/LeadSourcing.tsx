import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Download, Building2, MapPin, Briefcase, Linkedin, BookOpen, Plus, Loader2 } from "lucide-react";

export default function LeadSourcing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [companyType, setCompanyType] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());

  const createBulk = trpc.leads.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} leads imported successfully`);
      setSelectedResults(new Set());
      setSearchResults([]);
    },
    onError: () => toast.error("Failed to import leads"),
  });

  const handleSearch = () => {
    setIsSearching(true);
    // Simulate search results from Scott's Directories / LinkedIn
    setTimeout(() => {
      const mockResults = generateMockResults(searchQuery, region, companyType);
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 1200);
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedResults);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedResults(next);
  };

  const selectAll = () => {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map((_, i) => i)));
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Sourcing</h1>
        <p className="text-muted-foreground mt-1">
          Search and import contacts from Scott's Directories and LinkedIn.
        </p>
      </div>

      <Tabs defaultValue="scotts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scotts" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Scott's Directories
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="linkedin" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Search LinkedIn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Search by name, title, or company..."
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
                    <SelectValue placeholder="Industry" />
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
              <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search LinkedIn
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search Results */}
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

// Mock data generator for demonstration
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
