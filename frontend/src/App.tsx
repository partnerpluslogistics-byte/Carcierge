import { Route, Switch } from "wouter";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Pages
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import UserSettings from "@/pages/UserSettings";
import AdminUsers from "@/pages/AdminUsers";
import AdminVehicles from "@/pages/AdminVehicles";
import ServiceRequests from "@/pages/ServiceRequests";
import AdminApprovals from "@/pages/AdminApprovals";
import AdminAnalytics from "@/pages/AdminAnalytics";
import Payments from "@/pages/Payments";
import Search from "@/pages/Search";
import Reports from "@/pages/Reports";
import Promotions from "@/pages/Promotions";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useEffect } from "react";
import { useLocation } from "wouter";

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate(to);
  }, [navigate, to]);

  return <FullPageLoader />;
}

function Router() {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [location] = useLocation();
  const isAuthRoute = location === "/login" || location === "/register";
  const isPublicRoute = location === "/" || isAuthRoute;

  if (loading) {
    return <FullPageLoader />;
  }

  if (isAuthenticated) {
    if (isAuthRoute) {
      return <Redirect to="/dashboard" />;
    }

    return (
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/vehicles" component={Vehicles} />
          <Route path="/settings" component={UserSettings} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/vehicles" component={AdminVehicles} />
          <Route path="/service-requests" component={ServiceRequests} />
          <Route path="/admin/approvals" component={AdminApprovals} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/payments" component={Payments} />
          <Route path="/search" component={Search} />
          <Route path="/reports" component={Reports} />
          <Route path="/admin/promotions" component={Promotions} />
          <Route path="/" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    );
  }

  if (!isPublicRoute) {
    return <Redirect to="/login" />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Router />
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
