import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, TrendingUp, Users, MessageSquare, Heart, Share2, Activity, Sparkles, Zap, Target } from "lucide-react";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [user, setUser] = useState(authService.getUser());
  const [greeting, setGreeting] = useState("");
  const [welcomeCardsVisible, setWelcomeCardsVisible] = useState([false, false, false]);

  useEffect(() => {
    // Set time-based greeting
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 17) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }

    // Staggered animation for welcome cards
    const timers = [
      setTimeout(() => setWelcomeCardsVisible(prev => [true, prev[1], prev[2]]), 200),
      setTimeout(() => setWelcomeCardsVisible(prev => [prev[0], true, prev[2]]), 400),
      setTimeout(() => setWelcomeCardsVisible(prev => [prev[0], prev[1], true]), 600),
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["/api/posts?limit=5"],
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/user/summary?timeframe=7d"],
  });

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/social-accounts"],
  });

  if (postsLoading || analyticsLoading || accountsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const recentPosts = postsData?.posts || [];
  const analytics = analyticsData?.summary || {};
  const accounts = accountsData?.accounts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to Promotly - manage your social media presence</p>
        </div>
        <Link href="/schedule">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Post
          </Button>
        </Link>
      </div>

      {/* Animated Welcome Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Personal Greeting Card */}
        <Card className={`bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 transform hover:scale-105 transition-all duration-500 ease-out welcome-card-float ${
          welcomeCardsVisible[0] ? 'opacity-100 translate-y-0 welcome-card-enter' : 'opacity-0 translate-y-4'
        }`} style={{ animationDelay: '0s' }}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500 rounded-full welcome-card-pulse">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {greeting}, {user?.username || 'there'}! 👋
                </h3>
                <p className="text-sm text-gray-600">Ready to amplify your reach?</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Card */}
        <Link href="/schedule">
          <Card className={`bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 transform hover:scale-105 transition-all duration-500 ease-out cursor-pointer welcome-card-float ${
            welcomeCardsVisible[1] ? 'opacity-100 translate-y-0 welcome-card-enter' : 'opacity-0 translate-y-4'
          }`} style={{ animationDelay: '2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-500 rounded-full welcome-card-pulse">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quick Post</h3>
                  <p className="text-sm text-gray-600">Share your thoughts instantly</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Growth Tip Card */}
        <Card className={`bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 transform hover:scale-105 transition-all duration-500 ease-out welcome-card-float ${
          welcomeCardsVisible[2] ? 'opacity-100 translate-y-0 welcome-card-enter' : 'opacity-0 translate-y-4'
        }`} style={{ animationDelay: '4s' }}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-500 rounded-full welcome-card-pulse">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pro Tip</h3>
                <p className="text-sm text-gray-600">
                  {accounts.length === 0 
                    ? "Connect your social accounts first"
                    : recentPosts.length === 0 
                    ? "Schedule posts for peak hours"
                    : "Consistent posting boosts engagement"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalPosts || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalLikes || 0}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Across all platforms</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shares</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalShares || 0}</p>
              </div>
              <Share2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Engagement metric</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.avgEngagementRate ? (analytics.avgEngagementRate / 100).toFixed(1) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Average rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Posts
              <Link href="/posts">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPosts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No posts yet</p>
                <Link href="/schedule">
                  <Button variant="outline" size="sm">Create your first post</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPosts.slice(0, 5).map((post: any) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-gray-900 line-clamp-2">{post.content}</p>
                      <Badge 
                        variant={
                          post.status === 'published' ? 'default' :
                          post.status === 'scheduled' ? 'secondary' :
                          post.status === 'failed' ? 'destructive' : 'outline'
                        }
                      >
                        {post.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        {post.platforms.map((platform: string) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                      <span>
                        {post.status === 'published' ? 'Published' : 'Scheduled for'} {new Date(post.scheduledFor).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Connected Accounts
              <Badge variant="outline">{accounts.length} connected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No accounts connected</p>
                <Button variant="outline" size="sm">Connect Account</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account: any) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {account.platform.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{account.accountName}</p>
                        <p className="text-sm text-gray-500 capitalize">{account.platform}</p>
                      </div>
                    </div>
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
