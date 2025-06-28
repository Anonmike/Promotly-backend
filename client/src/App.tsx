import { SignIn, SignUp, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
import { Switch, Route } from "wouter";
import { queryClient, setClerkToken } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SchedulePost from "@/pages/schedule-post";
import Posts from "@/pages/posts";
import Analytics from "@/pages/analytics";
import SocialAccounts from "@/pages/social-accounts";
import Navigation from "@/components/layout/navigation";

function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Social Media Scheduler
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isSignUp ? <SignUp /> : <SignIn />}
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign in instead" : "Create account"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-gray-50">
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
    </div>
  );
}

function AuthenticatedApp() {
  const { getToken } = useAuth();

  useEffect(() => {
    const updateToken = async () => {
      try {
        const token = await getToken();
        setClerkToken(token);
      } catch (error) {
        console.error('Failed to get Clerk token:', error);
        setClerkToken(null);
      }
    };

    updateToken();
    // Update token periodically
    const interval = setInterval(updateToken, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [getToken]);

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SignedOut>
          <AuthPage />
        </SignedOut>
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
