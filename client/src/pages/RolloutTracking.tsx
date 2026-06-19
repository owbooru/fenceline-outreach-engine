import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Milestone, Plus, CheckCircle2, Clock, ArrowRight, Target, TrendingUp } from "lucide-react";

const phaseLabels: Record<string, string> = {
  poc: "POC",
  staged_beta: "Staged Beta",
  full_alberta_rollout: "Full Alberta Rollout",
};

const phaseColors: Record<string, string> = {
  poc: "bg-blue-50 text-blue-700 border-blue-200",
  staged_beta: "bg-violet-50 text-violet-700 border-violet-200",
  full_alberta_rollout: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusColors: Record<string, string> = {
  not_started: "bg-gray-50 text-gray-600",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
};

export default function RolloutTracking() {
  const [showAdd, setShowAdd] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    phase: "poc" as "poc" | "staged_beta" | "full_alberta_rollout",
    title: "",
    description: "",
    targetDate: "",
  });

  const { data: milestones = [], refetch } = trpc.rollout.milestones.useQuery();

  const createMilestone = trpc.rollout.create.useMutation({
    onSuccess: () => {
      toast.success("Milestone created");
      setShowAdd(false);
      setNewMilestone({ phase: "poc", title: "", description: "", targetDate: "" });
      refetch();
    },
  });

  const updateMilestone = trpc.rollout.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Milestone updated"); },
  });

  // Group milestones by phase
  const pocMilestones = milestones.filter((m) => m.phase === "poc");
  const betaMilestones = milestones.filter((m) => m.phase === "staged_beta");
  const rolloutMilestones = milestones.filter((m) => m.phase === "full_alberta_rollout");

  const getPhaseProgress = (items: typeof milestones) => {
    if (items.length === 0) return 0;
    const completed = items.filter((m) => m.status === "completed").length;
    return Math.round((completed / items.length) * 100);
  };

  const phases = [
    { key: "poc", label: "POC", items: pocMilestones },
    { key: "staged_beta", label: "Staged Beta", items: betaMilestones },
    { key: "full_alberta_rollout", label: "Full Alberta Rollout", items: rolloutMilestones },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rollout Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track milestone progress: POC → Staged Beta → Full Alberta Rollout.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Phase</Label>
                <Select value={newMilestone.phase} onValueChange={(v) => setNewMilestone({ ...newMilestone, phase: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poc">POC</SelectItem>
                    <SelectItem value="staged_beta">Staged Beta</SelectItem>
                    <SelectItem value="full_alberta_rollout">Full Alberta Rollout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  placeholder="e.g., First 10 leads verified"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  placeholder="Details about this milestone..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={newMilestone.targetDate}
                  onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value })}
                />
              </div>
              <Button
                onClick={() => createMilestone.mutate(newMilestone)}
                disabled={!newMilestone.title || createMilestone.isPending}
                className="w-full"
              >
                Create Milestone
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Phase Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phases.map((phase, idx) => (
          <Card key={phase.key} className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${phaseColors[phase.key]}`}>
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{phase.label}</p>
                  <p className="text-xs text-muted-foreground">{phase.items.length} milestones</p>
                </div>
              </div>
              <Progress value={getPhaseProgress(phase.items)} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground text-right">{getPhaseProgress(phase.items)}% complete</p>
            </CardContent>
            {idx < 2 && (
              <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 hidden md:block">
                <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Milestone Details by Phase */}
      {phases.map((phase) => (
        <div key={phase.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${phaseColors[phase.key]}`}>
              {phase.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {phase.items.filter((m) => m.status === "completed").length} / {phase.items.length} complete
            </span>
          </div>

          {phase.items.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No milestones for this phase yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {phase.items.map((milestone) => (
                <Card key={milestone.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${statusColors[milestone.status]}`}>
                        {milestone.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : milestone.status === "in_progress" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{milestone.title}</p>
                          <Badge variant="secondary" className={`text-xs capitalize ${statusColors[milestone.status]}`}>
                            {milestone.status?.replace("_", " ")}
                          </Badge>
                        </div>
                        {milestone.description && (
                          <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                        )}
                        {(milestone.leadsProcessed || milestone.emailsSent || milestone.warmLeads) && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {milestone.leadsProcessed ? <span>Leads: {milestone.leadsProcessed}</span> : null}
                            {milestone.emailsSent ? <span>Emails: {milestone.emailsSent}</span> : null}
                            {milestone.openRate ? <span>Open: {milestone.openRate}%</span> : null}
                            {milestone.warmLeads ? <span>Warm: {milestone.warmLeads}</span> : null}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {milestone.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              const nextStatus = milestone.status === "not_started" ? "in_progress" : "completed";
                              updateMilestone.mutate({
                                id: milestone.id,
                                data: {
                                  status: nextStatus as any,
                                  ...(nextStatus === "completed" ? { completedDate: new Date().toISOString() } : {}),
                                },
                              });
                            }}
                          >
                            {milestone.status === "not_started" ? "Start" : "Complete"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
