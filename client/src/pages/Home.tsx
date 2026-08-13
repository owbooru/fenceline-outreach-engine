import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Users,
  Mail,
  BarChart3,
  Cloud,
  Search,
  Shield,
  Milestone,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const quickActions = [
  { icon: Search, label: "Source Leads", description: "Search Scott's Directories & LinkedIn", path: "/leads/sourcing", color: "text-blue-600 bg-blue-50" },
  { icon: Users, label: "Manage Leads", description: "View, filter, and segment contacts", path: "/leads/management", color: "text-emerald-600 bg-emerald-50" },
  { icon: Mail, label: "Campaigns", description: "Build and launch outreach sequences", path: "/campaigns", color: "text-violet-600 bg-violet-50" },
  { icon: BarChart3, label: "Engagement", description: "Track opens, clicks, and interest", path: "/engagement", color: "text-amber-600 bg-amber-50" },
  { icon: Cloud, label: "Salesforce", description: "Route warm leads as Call Tasks", path: "/salesforce", color: "text-sky-600 bg-sky-50" },
  { icon: Shield, label: "Domain Protection", description: "Isolated sending infrastructure", path: "/domains", color: "text-rose-600 bg-rose-50" },
  { icon: Milestone, label: "Rollout Tracking", description: "POC → Staged Beta → Full Rollout", path: "/rollout", color: "text-indigo-600 bg-indigo-50" },
];

export default function Home() {

  const [, setLocation] = useLocation();
  const { data: stats } = trpc.leads.stats.useQuery();
  const { data: engagementStats } = trpc.engagement.stats.useQuery({});

  const totalLeads = stats?.total ?? 0;
  const existingCustomers = stats?.bySegment?.existing_customer ?? 0;
  const newLocal = stats?.bySegment?.new_local ?? 0;
  const newNational = stats?.bySegment?.new_national ?? 0;
  const totalSent = engagementStats?.sent ?? 0;
  const totalOpened = engagementStats?.opened ?? 0;
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-1">
          Your fence sales outreach and growth engine overview.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/leads/management")}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Leads</p>
                <p className="text-2xl font-bold mt-1">{totalLeads}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/leads/management")}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Segments</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">EC: {existingCustomers}</span>
                  <span className="text-xs text-muted-foreground">NL: {newLocal}</span>
                  <span className="text-xs text-muted-foreground">NN: {newNational}</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/engagement")}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Emails Sent</p>
                <p className="text-2xl font-bold mt-1">{totalSent}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/engagement")}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Open Rate</p>
                <p className="text-2xl font-bold mt-1">{openRate}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20 group"
              onClick={() => setLocation(action.path)}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                    <action.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{action.label}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
