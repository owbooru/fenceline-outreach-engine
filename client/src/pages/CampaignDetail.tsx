import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Play, Pause, Trash2, GripVertical, Mail, Clock, Send } from "lucide-react";

const trackLabels: Record<string, string> = {
  existing_customers: "Existing Customers",
  new_local: "New Local",
  new_national: "New National",
};

export default function CampaignDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const campaignId = parseInt(params.id || "0");
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStep, setNewStep] = useState({ subject: "", body: "", delayDays: 0, stepType: "email" as "email" | "follow_up" | "final" });

  const { data, refetch } = trpc.campaigns.getById.useQuery({ id: campaignId });
  const campaign = data?.campaign;
  const steps = data?.steps || [];

  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Campaign updated"); },
  });

  const createStep = trpc.sequences.create.useMutation({
    onSuccess: () => {
      toast.success("Step added");
      setShowAddStep(false);
      setNewStep({ subject: "", body: "", delayDays: 0, stepType: "email" });
      refetch();
    },
  });

  const deleteStep = trpc.sequences.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Step removed"); },
  });

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading campaign...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/campaigns")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {trackLabels[campaign.track]}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {campaign.status}
            </Badge>
            {campaign.sendingDomain && (
              <Badge variant="outline" className="text-xs">
                via {campaign.sendingDomain}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "draft" && (
            <Button
              onClick={() => updateCampaign.mutate({ id: campaignId, data: { status: "active" } })}
              className="gap-2"
            >
              <Play className="h-4 w-4" /> Activate
            </Button>
          )}
          {campaign.status === "active" && (
            <Button
              variant="outline"
              onClick={() => updateCampaign.mutate({ id: campaignId, data: { status: "paused" } })}
              className="gap-2"
            >
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button
              onClick={() => updateCampaign.mutate({ id: campaignId, data: { status: "active" } })}
              className="gap-2"
            >
              <Play className="h-4 w-4" /> Resume
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaign.totalLeads ?? 0}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaign.sentCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaign.openCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Opens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaign.clickCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{campaign.replyCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Replies</p>
          </CardContent>
        </Card>
      </div>

      {/* Sequence Steps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sequence Steps</h2>
          <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add Step
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Sequence Step</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Step Type</Label>
                  <Select value={newStep.stepType} onValueChange={(v) => setNewStep({ ...newStep, stepType: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Initial Email</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="final">Final Touch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={newStep.subject}
                    onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
                    placeholder="e.g., Quick question about your upcoming projects"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={newStep.body}
                    onChange={(e) => setNewStep({ ...newStep, body: e.target.value })}
                    placeholder="Hi {{firstName}},&#10;&#10;I noticed your team at {{company}} is working on..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{company}}"}, {"{{jobTitle}}"} for personalization.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Delay (days after previous step)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newStep.delayDays}
                    onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <Button
                  onClick={() => createStep.mutate({ campaignId, stepOrder: steps.length + 1, ...newStep })}
                  disabled={!newStep.subject || createStep.isPending}
                  className="w-full"
                >
                  Add Step
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {steps.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-2 text-center">
                <Send className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No sequence steps yet. Add your first email step to build the outreach flow.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <Card key={step.id} className="relative">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {idx + 1}
                      </div>
                      {idx < steps.length - 1 && <div className="w-px h-6 bg-border" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">{step.stepType?.replace("_", " ")}</Badge>
                        {(step.delayDays ?? 0) > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {step.delayDays} day{(step.delayDays ?? 0) > 1 ? "s" : ""} delay
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{step.subject}</p>
                      {step.body && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{step.body}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteStep.mutate({ id: step.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
