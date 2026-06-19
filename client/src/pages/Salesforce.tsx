import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Cloud, CheckCircle2, XCircle, Clock, ArrowUpRight, Phone, RefreshCw } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  synced: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  synced: CheckCircle2,
  failed: XCircle,
  completed: CheckCircle2,
};

export default function Salesforce() {
  const [config, setConfig] = useState({
    instanceUrl: "",
    clientId: "",
    clientSecret: "",
    autoSync: true,
    syncWarmLeads: true,
    syncHotLeads: true,
    createCallTasks: true,
  });

  const { data: tasks = [], refetch } = trpc.salesforce.tasks.useQuery({});
  const { data: integrations = [] } = trpc.integrations.list.useQuery();

  const sfConfig = integrations.find((i) => i.provider === "salesforce");
  const isConnected = sfConfig?.isActive ?? false;

  const upsertConfig = trpc.integrations.upsert.useMutation({
    onSuccess: () => toast.success("Salesforce configuration saved"),
    onError: () => toast.error("Failed to save configuration"),
  });

  const saveConfig = () => {
    upsertConfig.mutate({
      provider: "salesforce",
      configData: config,
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salesforce Integration</h1>
        <p className="text-muted-foreground mt-1">
          Automatically route high-intent leads as actionable Call Tasks into Salesforce.
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Connection Status</CardTitle>
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1.5">
              {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salesforce Instance URL</Label>
              <Input
                value={config.instanceUrl}
                onChange={(e) => setConfig({ ...config, instanceUrl: e.target.value })}
                placeholder="https://yourcompany.salesforce.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="Connected App Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                placeholder="Connected App Client Secret"
              />
            </div>
          </div>
          <Button onClick={saveConfig} disabled={upsertConfig.isPending}>
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Auto-Sync Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Auto-sync enabled</p>
              <p className="text-xs text-muted-foreground">Automatically push warm leads to Salesforce</p>
            </div>
            <Switch checked={config.autoSync} onCheckedChange={(v) => setConfig({ ...config, autoSync: v })} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Sync warm leads</p>
              <p className="text-xs text-muted-foreground">Push leads with "warm" status as Call Tasks</p>
            </div>
            <Switch checked={config.syncWarmLeads} onCheckedChange={(v) => setConfig({ ...config, syncWarmLeads: v })} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Sync hot leads</p>
              <p className="text-xs text-muted-foreground">Push leads with "hot" status as urgent Call Tasks</p>
            </div>
            <Switch checked={config.syncHotLeads} onCheckedChange={(v) => setConfig({ ...config, syncHotLeads: v })} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Create Call Tasks</p>
              <p className="text-xs text-muted-foreground">Create actionable Call Tasks for your sales team</p>
            </div>
            <Switch checked={config.createCallTasks} onCheckedChange={(v) => setConfig({ ...config, createCallTasks: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Task Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Call Task Queue</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Phone className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No Call Tasks yet. Tasks will appear here when warm leads are identified.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const StatusIcon = statusIcons[task.status] || Clock;
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${statusColors[task.status]?.split(" ").slice(0, 1).join(" ")} ${statusColors[task.status]?.split(" ").slice(1).join(" ")}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.subject || "Call Task"}</p>
                      <p className="text-xs text-muted-foreground">Lead #{task.leadId} · {task.priority} priority</p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusColors[task.status]}`}>
                      {task.status}
                    </Badge>
                    {task.salesforceId && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        <ArrowUpRight className="h-3 w-3" /> View in SF
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
