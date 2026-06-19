import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, MoreHorizontal, Mail, Archive, CheckCircle, Tag, Users, Filter } from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  verified: "bg-green-50 text-green-700 border-green-200",
  contacted: "bg-violet-50 text-violet-700 border-violet-200",
  qualified: "bg-amber-50 text-amber-700 border-amber-200",
  warm: "bg-orange-50 text-orange-700 border-orange-200",
  hot: "bg-red-50 text-red-700 border-red-200",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-50 text-gray-700 border-gray-200",
};

const segmentLabels: Record<string, string> = {
  existing_customer: "Existing Customer",
  new_local: "New Local",
  new_national: "New National",
};

const segmentColors: Record<string, string> = {
  existing_customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  new_local: "bg-blue-50 text-blue-700 border-blue-200",
  new_national: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function LeadManagement() {
  const [search, setSearch] = useState("");
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());

  const { data: leads = [], refetch } = trpc.leads.list.useQuery({
    segment: filterSegment !== "all" ? filterSegment : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    source: filterSource !== "all" ? filterSource : undefined,
    search: search || undefined,
  });

  const bulkUpdate = trpc.leads.bulkUpdate.useMutation({
    onSuccess: () => {
      toast.success("Leads updated successfully");
      setSelectedLeads(new Set());
      refetch();
    },
    onError: () => toast.error("Failed to update leads"),
  });

  const updateLead = trpc.leads.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Lead updated"); },
  });

  const toggleSelect = (id: number) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const selectAll = () => {
    if (selectedLeads.size === leads.length) setSelectedLeads(new Set());
    else setSelectedLeads(new Set(leads.map((l) => l.id)));
  };

  const handleBulkAction = (action: string) => {
    const ids = Array.from(selectedLeads);
    if (ids.length === 0) return;
    switch (action) {
      case "contacted":
        bulkUpdate.mutate({ ids, data: { status: "contacted" } });
        break;
      case "archived":
        bulkUpdate.mutate({ ids, data: { status: "archived" } });
        break;
      case "existing_customer":
        bulkUpdate.mutate({ ids, data: { segment: "existing_customer" } });
        break;
      case "new_local":
        bulkUpdate.mutate({ ids, data: { segment: "new_local" } });
        break;
      case "new_national":
        bulkUpdate.mutate({ ids, data: { segment: "new_national" } });
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground mt-1">
            Filter, segment, and manage your contacts.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Users className="h-3.5 w-3.5 mr-1" />
          {leads.length} leads
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterSegment} onValueChange={setFilterSegment}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="existing_customer">Existing Customers</SelectItem>
                <SelectItem value="new_local">New Local</SelectItem>
                <SelectItem value="new_national">New National</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="scotts_directories">Scott's Directories</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedLeads.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">{selectedLeads.size} selected</span>
          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("contacted")} className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Mark Contacted
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("archived")} className="gap-1.5">
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Segment
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction("existing_customer")}>
                  Existing Customer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("new_local")}>
                  New Local
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("new_national")}>
                  New National
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Lead Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === leads.length && leads.length > 0}
                      onChange={selectAll}
                      className="rounded border-muted-foreground/30"
                    />
                  </th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Company</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Title</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Segment</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Source</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Region</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p>No leads found. Start by sourcing leads from Scott's Directories or LinkedIn.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-muted-foreground/30"
                        />
                      </td>
                      <td className="p-3 font-medium">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="p-3 text-muted-foreground">{lead.company || "—"}</td>
                      <td className="p-3 text-muted-foreground">{lead.jobTitle || "—"}</td>
                      <td className="p-3">
                        {lead.segment ? (
                          <Badge variant="outline" className={`text-xs ${segmentColors[lead.segment] || ""}`}>
                            {segmentLabels[lead.segment] || lead.segment}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unclassified</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs ${statusColors[lead.status] || ""}`}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {lead.source === "scotts_directories" ? "Scott's" : lead.source}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs capitalize">
                        {lead.region?.replace("_", " ") || "—"}
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateLead.mutate({ id: lead.id, data: { status: "contacted" } })}>
                              Mark Contacted
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateLead.mutate({ id: lead.id, data: { segment: "existing_customer" } })}>
                              Set: Existing Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateLead.mutate({ id: lead.id, data: { segment: "new_local" } })}>
                              Set: New Local
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateLead.mutate({ id: lead.id, data: { segment: "new_national" } })}>
                              Set: New National
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateLead.mutate({ id: lead.id, data: { status: "archived" } })}>
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
