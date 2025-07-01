import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import { SignedIn, SignedOut, SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

import HomePage from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import AuthenticatedApp from "@/components/layout/authenticated-app";
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
      <Route path="/signin">
        <div className="flex items-center justify-center min-h-screen">
          <SignIn fallbackRedirectUrl="/" />
        </div>
      </Route>
      <Route path="/signup">
        <div className="flex items-center justify-center min-h-screen">
          <SignUp fallbackRedirectUrl="/" />
        </div>
      </Route>
      <Route path="/">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/signin" />
        </SignedOut>
      </Route>
      <Route path="/dashboard">
        <SignedIn>
          <HomePage />
        </SignedIn>
        <SignedOut>
          <Redirect to="/signin" />
        </SignedOut>
      </Route>
      <Route path="/posts">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/signin" />
        </SignedOut>
      </Route>
      <Route path="/schedule-post">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/signin" />
        </SignedOut>
      </Route>
      <Route path="/analytics">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/signin" />
        </SignedOut>
      </Route>
      <Route path="/social-accounts">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/signin" />
        </SignedOut>
      </Route>
      <Route path="/recommendations">
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <Redirect to="/signin" />
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