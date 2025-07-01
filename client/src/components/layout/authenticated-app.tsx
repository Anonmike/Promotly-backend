import { Switch, Route } from "wouter";
import Navigation from "@/components/layout/navigation";
import Dashboard from "@/pages/dashboard";
import SchedulePost from "@/pages/schedule-post";
import Posts from "@/pages/posts";
import Analytics from "@/pages/analytics";
import SocialAccounts from "@/pages/social-accounts";
import Recommendations from "@/pages/recommendations";
import NotFound from "@/pages/not-found";
import { useNotifications } from "@/hooks/use-notifications";

export default function AuthenticatedApp() {
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
          <Route path="/recommendations" component={Recommendations} />
          <Route path="/accounts" component={SocialAccounts} />
          <Route path="/social-accounts" component={SocialAccounts} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}