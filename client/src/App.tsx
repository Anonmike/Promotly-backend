
import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, setClerkTokenGetter } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SignIn, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SchedulePost from "@/pages/schedule-post";
import Posts from "@/pages/posts";
import Analytics from "@/pages/analytics";
import SocialAccounts from "@/pages/social-accounts";
import Navigation from "@/components/layout/navigation";
import { useNotifications } from "@/hooks/use-notifications";

function AuthenticatedApp() {
  // Initialize notifications system for authenticated users
  useNotifications();

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/schedule" component={SchedulePost} />
          <Route path="/posts" component={Posts} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/accounts" component={SocialAccounts} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center">
          <SignIn />
        </div>
      </SignedOut>
      
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
    </div>
  );
}

function App() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set up Clerk token getter for API requests
    setClerkTokenGetter(getToken);
  }, [getToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
