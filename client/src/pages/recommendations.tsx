import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Target, 
  Sparkles, 
  RefreshCw,
  Copy,
  Calendar,
  BarChart3,
  Users,
  Heart,
  Share2,
  MessageCircle
} from "lucide-react";
import { Link } from "wouter";

interface ContentRecommendation {
  id: number;
  type: "trending" | "performance-based" | "schedule-optimized" | "personalized";
  title: string;
  description: string;
  content: string;
  platforms: string[];
  confidence: number;
  reasoning: string;
  tags: string[];
  bestTimeToPost?: string;
  estimatedEngagement?: number;
  isUsed: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface UserPreferences {
  industry?: string;
  toneOfVoice?: string;
  targetAudience?: string;
  contentThemes?: string[];
  postingFrequency?: string;
  preferredPlatforms?: string[];
}

export default function RecommendationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [copiedContent, setCopiedContent] = useState<number | null>(null);

  // Fetch recommendations
  const { data: recommendationsData, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useQuery<{
    recommendations: ContentRecommendation[];
  }>({
    queryKey: ["/api/recommendations"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch user preferences
  const { data: preferencesData } = useQuery<{
    preferences: UserPreferences;
  }>({
    queryKey: ["/api/user/preferences"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Mark recommendation as used
  const markAsUsedMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      const res = await apiRequest("POST", `/api/recommendations/${recommendationId}/use`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Recommendation marked as used",
        description: "This will help improve future suggestions.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh analytics
  const refreshAnalyticsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/analytics/refresh");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Analytics refreshed",
        description: "Recommendations updated with latest performance data.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error refreshing analytics",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const recommendations = recommendationsData?.recommendations || [];
  const preferences = preferencesData?.preferences;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "trending": return <TrendingUp className="h-4 w-4" />;
      case "performance-based": return <BarChart3 className="h-4 w-4" />;
      case "schedule-optimized": return <Clock className="h-4 w-4" />;
      case "personalized": return <Target className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "trending": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "performance-based": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "schedule-optimized": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "personalized": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitter": return "𝕏";
      case "facebook": return "f";
      case "linkedin": return "in";
      case "instagram": return "📷";
      default: return "📱";
    }
  };

  const copyToClipboard = async (content: string, id: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(id);
      setTimeout(() => setCopiedContent(null), 2000);
      toast({
        title: "Content copied",
        description: "Post content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy content to clipboard",
        variant: "destructive",
      });
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (activeTab === "all") return true;
    if (activeTab === "unused") return !rec.isUsed;
    return rec.type === activeTab;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (recommendationsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Content Recommendations</h1>
          <p className="text-muted-foreground">
            Personalized content suggestions based on your performance and trending topics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetchRecommendations()}
            disabled={recommendationsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recommendationsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => refreshAnalyticsMutation.mutate()}
            disabled={refreshAnalyticsMutation.isPending}
          >
            <BarChart3 className={`h-4 w-4 mr-2 ${refreshAnalyticsMutation.isPending ? 'animate-pulse' : ''}`} />
            Update Analytics
          </Button>
        </div>
      </div>

      {/* User Preferences Summary */}
      {preferences && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Your Content Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {preferences.industry && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Industry</h4>
                  <Badge variant="secondary">{preferences.industry}</Badge>
                </div>
              )}
              {preferences.toneOfVoice && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Tone</h4>
                  <Badge variant="secondary">{preferences.toneOfVoice}</Badge>
                </div>
              )}
              {preferences.targetAudience && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Audience</h4>
                  <Badge variant="secondary">{preferences.targetAudience}</Badge>
                </div>
              )}
            </div>
            {(!preferences.industry || !preferences.toneOfVoice) && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>Complete your profile to get more personalized recommendations</span>
                  <Link href="/settings">
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      Update preferences
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({recommendations.length})</TabsTrigger>
          <TabsTrigger value="unused">Unused ({recommendations.filter(r => !r.isUsed).length})</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="performance-based">Performance</TabsTrigger>
          <TabsTrigger value="schedule-optimized">Timing</TabsTrigger>
          <TabsTrigger value="personalized">Personal</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredRecommendations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No recommendations found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {activeTab === "all" 
                    ? "We're analyzing your content to generate personalized recommendations."
                    : `No ${activeTab.replace('-', ' ')} recommendations available.`}
                </p>
                <Button onClick={() => refetchRecommendations()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredRecommendations.map((recommendation) => (
                <Card key={recommendation.id} className={`${recommendation.isUsed ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getTypeColor(recommendation.type)}`}>
                          {getTypeIcon(recommendation.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {recommendation.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={recommendation.confidence > 80 ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {recommendation.confidence}% confidence
                        </Badge>
                        {recommendation.isUsed && (
                          <Badge variant="outline" className="shrink-0">
                            Used
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Content Preview */}
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Suggested Content</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(recommendation.content, recommendation.id)}
                        >
                          {copiedContent === recommendation.id ? (
                            <span className="text-green-600">Copied!</span>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{recommendation.content}</p>
                    </div>

                    {/* Meta Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {/* Platforms */}
                      <div>
                        <h4 className="font-medium text-muted-foreground mb-2">Platforms</h4>
                        <div className="flex gap-2">
                          {recommendation.platforms.map(platform => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {getPlatformIcon(platform)} {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Best Time to Post */}
                      {recommendation.bestTimeToPost && (
                        <div>
                          <h4 className="font-medium text-muted-foreground mb-2">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Best Time
                          </h4>
                          <Badge variant="outline">
                            {formatDate(recommendation.bestTimeToPost)}
                          </Badge>
                        </div>
                      )}

                      {/* Estimated Engagement */}
                      {recommendation.estimatedEngagement && (
                        <div>
                          <h4 className="font-medium text-muted-foreground mb-2">
                            <Heart className="h-4 w-4 inline mr-1" />
                            Est. Engagement
                          </h4>
                          <Badge variant="outline">
                            {recommendation.estimatedEngagement}% rate
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {recommendation.tags.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Suggested Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reasoning */}
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Why this recommendation?</h4>
                      <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Created {formatDate(recommendation.createdAt)}
                        {recommendation.expiresAt && (
                          <span> • Expires {formatDate(recommendation.expiresAt)}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!recommendation.isUsed && (
                          <Button
                            size="sm"
                            onClick={() => markAsUsedMutation.mutate(recommendation.id)}
                            disabled={markAsUsedMutation.isPending}
                          >
                            Mark as Used
                          </Button>
                        )}
                        <Link href="/schedule-post">
                          <Button size="sm" variant="outline">
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule Post
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}