import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Heart, Share2, MessageSquare, Eye, Download, Filter, Calendar, BarChart3, PieChart, Activity } from "lucide-react";
import AnalyticsChart from "@/components/analytics-chart";

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("7d");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: [`/api/analytics/user/summary?timeframe=${timeframe}`],
  });

  const { data: postsData } = useQuery({
    queryKey: ["/api/posts"],
  });

  const summary = analyticsData?.summary || {};
  const analytics = analyticsData?.analytics || [];
  const posts = postsData?.posts || [];

  // Filter analytics by platform
  const filteredAnalytics = platformFilter === "all" 
    ? analytics 
    : analytics.filter((item: any) => item.platform === platformFilter);

  // Get unique platforms for filtering
  const platforms = Array.from(new Set(analytics.map((item: any) => item.platform))) as string[];

  // Calculate growth metrics
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Export analytics data
  const exportData = (format: 'csv' | 'json') => {
    const dataToExport = {
      summary,
      analytics: filteredAnalytics,
      timeframe,
      platform: platformFilter,
      exportedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      const csvContent = [
        ['Platform', 'Likes', 'Shares', 'Comments', 'Impressions', 'Engagement Rate'],
        ...filteredAnalytics.map((item: any) => [
          item.platform,
          item.likes || 0,
          item.shares || 0,
          item.comments || 0,
          item.impressions || 0,
          item.engagementRate || 0
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promotly-analytics-${timeframe}-${Date.now()}.csv`;
      a.click();
    } else {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promotly-analytics-${timeframe}-${Date.now()}.json`;
      a.click();
    }

    toast({
      title: "Export Complete",
      description: `Analytics data exported as ${format.toUpperCase()}`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
            <p className="text-gray-600">Comprehensive social media performance insights</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Filters */}
          <div className="flex items-center space-x-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Platform</label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform} className="capitalize">
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Time Period</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportData('csv')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportData('json')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>JSON</span>
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Engagement</span>
          </TabsTrigger>
          <TabsTrigger value="platforms" className="flex items-center space-x-2">
            <PieChart className="h-4 w-4" />
            <span>Platforms</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Post Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900">{summary.totalPosts || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-3xl font-bold text-gray-900">{summary.totalLikes || 0}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shares</p>
                <p className="text-3xl font-bold text-gray-900">{summary.totalShares || 0}</p>
              </div>
              <Share2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comments</p>
                <p className="text-3xl font-bold text-gray-900">{summary.totalComments || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Impressions</p>
                    <p className="text-3xl font-bold text-gray-900">{summary.totalImpressions || 0}</p>
                  </div>
                  <Eye className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {summary.avgEngagementRate ? (summary.avgEngagementRate / 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Avg Engagement Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {posts.filter((p: any) => p.status === 'published').length}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Published Posts</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {platforms.length}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Active Platforms</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart data={filteredAnalytics} type="engagement" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart data={filteredAnalytics} type="platform" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Engagement Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.avgEngagementRate ? `${(summary.avgEngagementRate / 100).toFixed(1)}%` : '0%'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {calculateGrowth(summary.avgEngagementRate || 0, 0) >= 0 ? '+' : ''}
                  {calculateGrowth(summary.avgEngagementRate || 0, 0)}% vs previous period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {(summary.totalLikes || 0) + (summary.totalShares || 0) + (summary.totalComments || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Likes + Shares + Comments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Best Performing Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600 capitalize">
                  {filteredAnalytics.length > 0 ? 
                    filteredAnalytics.reduce((best: any, current: any) => 
                      (current.engagementRate || 0) > (best.engagementRate || 0) ? current : best
                    ).platform : 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Highest engagement rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {summary.totalImpressions || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">Total impressions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAnalytics.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No engagement data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Platform</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Likes</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Shares</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Comments</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Engagement Rate</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnalytics.map((item: any, index: number) => {
                        const engagementRate = item.engagementRate || 0;
                        const performance = engagementRate >= 5 ? 'Excellent' : engagementRate >= 3 ? 'Good' : engagementRate >= 1 ? 'Fair' : 'Poor';
                        const performanceColor = engagementRate >= 5 ? 'text-green-600' : engagementRate >= 3 ? 'text-blue-600' : engagementRate >= 1 ? 'text-yellow-600' : 'text-red-600';
                        
                        return (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="capitalize">
                                {item.platform}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">{item.likes || 0}</td>
                            <td className="py-3 px-4">{item.shares || 0}</td>
                            <td className="py-3 px-4">{item.comments || 0}</td>
                            <td className="py-3 px-4">{(engagementRate / 100).toFixed(1)}%</td>
                            <td className={`py-3 px-4 font-medium ${performanceColor}`}>{performance}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart data={filteredAnalytics} type="platform" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platforms.map((platform: string) => {
                    const platformData = analytics.filter((item: any) => item.platform === platform);
                    const totalEngagement = platformData.reduce((sum: number, item: any) => 
                      sum + (item.likes || 0) + (item.shares || 0) + (item.comments || 0), 0);
                    const avgEngagement = platformData.length > 0 ? 
                      platformData.reduce((sum: number, item: any) => sum + (item.engagementRate || 0), 0) / platformData.length : 0;

                    return (
                      <div key={platform} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="capitalize">{platform}</Badge>
                          <div>
                            <p className="font-medium">{totalEngagement} total interactions</p>
                            <p className="text-sm text-gray-500">{(avgEngagement / 100).toFixed(1)}% avg engagement</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{platformData.length}</p>
                          <p className="text-sm text-gray-500">posts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Post Performance Tab */}
        <TabsContent value="posts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Post Performance Analysis
                <Badge variant="outline">{posts.length} total posts</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No posts available</p>
                  <p className="text-sm text-gray-400 mt-1">Create some posts to see performance data</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Content</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Platforms</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Published</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post: any, index: number) => {
                        const postAnalytics = analytics.filter((item: any) => item.postId === post.id);
                        const totalEngagement = postAnalytics.reduce((sum: number, item: any) => 
                          sum + (item.likes || 0) + (item.shares || 0) + (item.comments || 0), 0);
                        
                        return (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4 max-w-xs">
                              <p className="truncate">{post.content}</p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {post.platforms?.map((platform: string) => (
                                  <Badge key={platform} variant="secondary" className="text-xs capitalize">
                                    {platform}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant={post.status === 'published' ? 'default' : 
                                        post.status === 'failed' ? 'destructive' : 'secondary'}
                                className="capitalize"
                              >
                                {post.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4">
                              {totalEngagement > 0 ? (
                                <div>
                                  <p className="font-medium">{totalEngagement} interactions</p>
                                  <p className="text-xs text-gray-500">
                                    {postAnalytics.length > 0 ? 
                                      `${(postAnalytics.reduce((sum: number, item: any) => sum + (item.engagementRate || 0), 0) / postAnalytics.length / 100).toFixed(1)}% engagement` 
                                      : 'No data'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400">No data</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
