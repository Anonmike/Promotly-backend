import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

import HomePage from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import AuthenticatedApp from "@/components/layout/authenticated-app";
import AuthPage from "@/pages/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setClerkTokenGetter } from "@/lib/queryClient";

import "./index.css";

const queryClient = new QueryClient();

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set up the Clerk token getter for API requests
    setClerkTokenGetter(() => getToken());
  }, [getToken]);

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/signin" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/auth" />
        </SignedOut>
      </Route>
      <Route path="/dashboard">
        <SignedIn>
          <HomePage />
        </SignedIn>
        <SignedOut>
          <Redirect to="/auth" />
        </SignedOut>
      </Route>
      <Route path="/posts">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/auth" />
        </SignedOut>
      </Route>
      <Route path="/schedule-post">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/auth" />
        </SignedOut>
      </Route>
      <Route path="/analytics">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/auth" />
        </SignedOut>
      </Route>
      <Route path="/social-accounts">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/auth" />
        </SignedOut>
      </Route>
      <Route path="/recommendations">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/auth" />
        </SignedOut>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50">
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthWrapper>
    </QueryClientProvider>
  );
}

export default App;