import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Shield, Plus, CheckCircle2, XCircle, AlertTriangle, Clock, Globe, Lock } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  warming: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  paused: "bg-gray-50 text-gray-700",
  blacklisted: "bg-red-50 text-red-700",
};

export default function DomainProtection() {
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: domains = [], refetch } = trpc.domains.list.useQuery();

  const createDomain = trpc.domains.create.useMutation({
    onSuccess: () => {
      toast.success("Domain added");
      setShowAdd(false);
      setNewDomain("");
      setNewNotes("");
      refetch();
    },
    onError: () => toast.error("Failed to add domain"),
  });

  const updateDomain = trpc.domains.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Domain updated"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Domain Reputation Protection</h1>
          <p className="text-muted-foreground mt-1">
            Isolated sending infrastructure — completely separate from fenceline.ca.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Sending Domain</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Never use fenceline.ca as a sending domain
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All outreach must use isolated domains to protect primary domain reputation.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g., outreach-fenceline.ca"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Purpose of this domain..."
                />
              </div>
              <Button
                onClick={() => createDomain.mutate({ domain: newDomain, notes: newNotes })}
                disabled={!newDomain || newDomain.includes("fenceline.ca") || createDomain.isPending}
                className="w-full"
              >
                Add Domain
              </Button>
              {newDomain.includes("fenceline.ca") && (
                <p className="text-xs text-destructive text-center">Cannot use fenceline.ca — use an isolated domain.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Protection Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Primary Domain Protected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                fenceline.ca is never used for outreach. All campaigns use isolated sending domains to maintain deliverability and protect your brand reputation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain List */}
      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Globe className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No sending domains configured. Add an isolated domain to begin outreach.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {domain.domain}
                  </CardTitle>
                  <Badge className={`text-xs capitalize ${statusColors[domain.status]}`}>
                    {domain.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* DNS Verification */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DNS Records</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30">
                      {domain.spfVerified ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className="text-xs font-medium">SPF</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30">
                      {domain.dkimVerified ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className="text-xs font-medium">DKIM</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30">
                      {domain.dmarcVerified ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className="text-xs font-medium">DMARC</span>
                    </div>
                  </div>
                </div>

                {/* Warm-up Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Warm-up Progress</p>
                    <span className="text-xs text-muted-foreground">Day {domain.warmupDay ?? 0} / 30</span>
                  </div>
                  <Progress value={((domain.warmupDay ?? 0) / 30) * 100} className="h-2" />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span>Daily limit: {domain.dailySendLimit}</span>
                  <span>Total sent: {domain.totalSent}</span>
                  <span>Bounce: {domain.bounceRate}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
