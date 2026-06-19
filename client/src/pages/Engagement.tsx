import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart3, Mail, MousePointer, MessageSquare, AlertTriangle, Eye } from "lucide-react";

export default function Engagement() {
  const { data: stats } = trpc.engagement.stats.useQuery({});
  const { data: events = [] } = trpc.engagement.events.useQuery({});

  const sent = stats?.sent ?? 0;
  const opened = stats?.opened ?? 0;
  const clicked = stats?.clicked ?? 0;
  const replied = stats?.replied ?? 0;
  const bounced = stats?.bounced ?? 0;
  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0.0";
  const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0.0";
  const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0.0";
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0";

  const eventTypeIcons: Record<string, any> = {
    sent: Mail,
    opened: Eye,
    clicked: MousePointer,
    replied: MessageSquare,
    bounced: AlertTriangle,
  };

  const eventTypeColors: Record<string, string> = {
    sent: "text-blue-600 bg-blue-50",
    opened: "text-green-600 bg-green-50",
    clicked: "text-violet-600 bg-violet-50",
    replied: "text-amber-600 bg-amber-50",
    bounced: "text-red-600 bg-red-50",
    unsubscribed: "text-gray-600 bg-gray-50",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Engagement Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Real-time monitoring of email opens, clicks, and interest signals.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sent}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openRate}%</p>
                <p className="text-xs text-muted-foreground">Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <MousePointer className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clickRate}%</p>
                <p className="text-xs text-muted-foreground">Click Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{replyRate}%</p>
                <p className="text-xs text-muted-foreground">Reply Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bounceRate}%</p>
                <p className="text-xs text-muted-foreground">Bounce Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Sent", value: sent, color: "bg-blue-500" },
              { label: "Opened", value: opened, color: "bg-green-500" },
              { label: "Clicked", value: clicked, color: "bg-violet-500" },
              { label: "Replied", value: replied, color: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-16">{item.label}</span>
                <div className="flex-1 h-8 bg-muted/50 rounded-md overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-md transition-all flex items-center px-2`}
                    style={{ width: sent > 0 ? `${Math.max((item.value / sent) * 100, 2)}%` : "2%" }}
                  >
                    <span className="text-xs text-white font-medium">{item.value}</span>
                  </div>
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {sent > 0 ? `${((item.value / sent) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No engagement events yet. Events will appear here once campaigns are active.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {events.slice(0, 50).map((event) => {
                const Icon = eventTypeIcons[event.eventType] || Mail;
                const colorClass = eventTypeColors[event.eventType] || "text-gray-600 bg-gray-50";
                return (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{event.eventType}</p>
                      <p className="text-xs text-muted-foreground">Lead #{event.leadId}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {event.occurredAt ? new Date(event.occurredAt).toLocaleString() : "—"}
                    </span>
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
