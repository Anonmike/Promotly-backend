
import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, setClerkTokenGetter } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SignIn, SignUp, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SchedulePost from "@/pages/schedule-post";
import Posts from "@/pages/posts";
import Analytics from "@/pages/analytics";
import SocialAccounts from "@/pages/social-accounts";
import SignInPage from "@/pages/signin";
import SignUpPage from "@/pages/signup";
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
  const [location] = useLocation();
  
  // Handle authentication routes for both signed in and signed out users
  if (location === '/signin') {
    return <SignInPage />;
  }
  
  if (location === '/signup') {
    return <SignUpPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SignedOut>
        {/* Default sign-in page for non-auth routes when signed out */}
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Promotly</h1>
              <p className="text-gray-600">Sign in to manage your social media presence</p>
            </div>
            <SignIn 
              fallbackRedirectUrl="/"
              signUpUrl="/signup"
            />
          </div>
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
