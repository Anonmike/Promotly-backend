
import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient, setClerkTokenGetter } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SignIn, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SchedulePost from "@/pages/schedule-post";
import Posts from "@/pages/posts";
import Analytics from "@/pages/analytics";
import SocialAccounts from "@/pages/social-accounts";
import Navigation from "@/components/layout/navigation";
import { useNotifications } from "@/hooks/use-notifications";

function Router() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SignedIn>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/schedule" component={SchedulePost} />
            <Route path="/posts" component={Posts} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/accounts" component={SocialAccounts} />
            <Route component={NotFound} />
          </Switch>
        </SignedIn>
        <SignedOut>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Promotly</h1>
                <p className="text-gray-600">Sign in to manage your social media presence</p>
              </div>
              <SignIn />
            </div>
          </div>
        </SignedOut>
      </main>
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
