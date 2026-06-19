import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Plus, Mail, Play, Pause, CheckCircle2, Users, Clock } from "lucide-react";

const trackLabels: Record<string, string> = {
  existing_customers: "Existing Customers",
  new_local: "New Local",
  new_national: "New National",
};

const trackColors: Record<string, string> = {
  existing_customers: "bg-emerald-50 text-emerald-700 border-emerald-200",
  new_local: "bg-blue-50 text-blue-700 border-blue-200",
  new_national: "bg-purple-50 text-purple-700 border-purple-200",
};

const statusIcons: Record<string, any> = {
  draft: Clock,
  active: Play,
  paused: Pause,
  completed: CheckCircle2,
};

export default function Campaigns() {
  const [, setLocation] = useLocation();
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    track: "new_local" as "existing_customers" | "new_local" | "new_national",
    description: "",
    fromName: "",
    fromEmail: "",
    sendingDomain: "",
  });

  const { data: campaigns = [], refetch } = trpc.campaigns.list.useQuery(
    filterTrack !== "all" ? { track: filterTrack } : {}
  );

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      toast.success("Campaign created");
      setShowCreate(false);
      setNewCampaign({ name: "", track: "new_local", description: "", fromName: "", fromEmail: "", sendingDomain: "" });
      refetch();
      setLocation(`/campaigns/${data.id}`);
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Campaign updated"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage outreach sequences across three tracks.
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., Q3 Alberta GC Outreach"
                />
              </div>
              <div className="space-y-2">
                <Label>Track</Label>
                <Select
                  value={newCampaign.track}
                  onValueChange={(v) => setNewCampaign({ ...newCampaign, track: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing_customers">Existing Customers</SelectItem>
                    <SelectItem value="new_local">New Local</SelectItem>
                    <SelectItem value="new_national">New National</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Brief description of this campaign..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={newCampaign.fromName}
                    onChange={(e) => setNewCampaign({ ...newCampaign, fromName: e.target.value })}
                    placeholder="Rob McMullen"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    value={newCampaign.fromEmail}
                    onChange={(e) => setNewCampaign({ ...newCampaign, fromEmail: e.target.value })}
                    placeholder="rob@outreach-fenceline.ca"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sending Domain</Label>
                <Input
                  value={newCampaign.sendingDomain}
                  onChange={(e) => setNewCampaign({ ...newCampaign, sendingDomain: e.target.value })}
                  placeholder="outreach-fenceline.ca (NOT fenceline.ca)"
                />
                <p className="text-xs text-muted-foreground">Must be isolated from primary domain fenceline.ca</p>
              </div>
              <Button
                onClick={() => createCampaign.mutate(newCampaign)}
                disabled={!newCampaign.name || createCampaign.isPending}
                className="w-full"
              >
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Track Tabs */}
      <Tabs value={filterTrack} onValueChange={setFilterTrack}>
        <TabsList>
          <TabsTrigger value="all">All Tracks</TabsTrigger>
          <TabsTrigger value="existing_customers">Existing Customers</TabsTrigger>
          <TabsTrigger value="new_local">New Local</TabsTrigger>
          <TabsTrigger value="new_national">New National</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Campaign Cards */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No campaigns yet. Create your first outreach campaign to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const StatusIcon = statusIcons[campaign.status] || Clock;
            return (
              <Card
                key={campaign.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
                onClick={() => setLocation(`/campaigns/${campaign.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">{campaign.name}</CardTitle>
                    <Badge variant="outline" className={`text-xs shrink-0 ${trackColors[campaign.track]}`}>
                      {trackLabels[campaign.track]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="capitalize">{campaign.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {campaign.totalLeads}
                      </span>
                      <span>{campaign.sentCount} sent</span>
                    </div>
                  </div>
                  {(campaign.sentCount ?? 0) > 0 && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t">
                      <span>Opens: {campaign.openCount}</span>
                      <span>Clicks: {campaign.clickCount}</span>
                      <span>Replies: {campaign.replyCount}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
