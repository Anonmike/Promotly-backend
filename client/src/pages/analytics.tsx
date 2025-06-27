import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Heart, Share2, MessageSquare, Eye } from "lucide-react";
import AnalyticsChart from "@/components/analytics-chart";

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("7d");

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: [`/api/analytics/user/summary?timeframe=${timeframe}`],
  });

  const summary = analyticsData?.summary || {};
  const analytics = analyticsData?.analytics || [];

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">Track your social media performance</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Time Period</label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
          <CardTitle>Engagement Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="text-4xl font-bold text-blue-600">
              {summary.avgEngagementRate ? (summary.avgEngagementRate / 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-600">
              Average engagement rate across all platforms
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
            <AnalyticsChart data={analytics} type="engagement" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart data={analytics} type="platform" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Detailed Analytics
            <Badge variant="outline">{analytics.length} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No analytics data available</p>
              <p className="text-sm text-gray-400 mt-1">Publish some posts to start seeing analytics</p>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Impressions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {item.platform}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{item.likes || 0}</td>
                      <td className="py-3 px-4">{item.shares || 0}</td>
                      <td className="py-3 px-4">{item.comments || 0}</td>
                      <td className="py-3 px-4">{item.impressions || 0}</td>
                      <td className="py-3 px-4">
                        {item.engagementRate ? (item.engagementRate / 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
