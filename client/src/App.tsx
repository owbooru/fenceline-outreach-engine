import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LeadSourcing from "./pages/LeadSourcing";
import LeadManagement from "./pages/LeadManagement";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Engagement from "./pages/Engagement";
import Salesforce from "./pages/Salesforce";
import DomainProtection from "./pages/DomainProtection";
import RolloutTracking from "./pages/RolloutTracking";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/leads/sourcing"} component={LeadSourcing} />
      <Route path={"/leads/management"} component={LeadManagement} />
      <Route path={"/campaigns"} component={Campaigns} />
      <Route path={"/campaigns/:id"} component={CampaignDetail} />
      <Route path={"/engagement"} component={Engagement} />
      <Route path={"/salesforce"} component={Salesforce} />
      <Route path={"/domains"} component={DomainProtection} />
      <Route path={"/rollout"} component={RolloutTracking} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
