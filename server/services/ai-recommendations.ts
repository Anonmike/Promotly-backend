import { storage } from "../storage";
import {
  type ContentRecommendation,
  type InsertContentRecommendation,
  type UserPreferences,
  type InsertUserPreferences,
  type ContentPerformance,
  type InsertContentPerformance,
  type Post,
  type Analytics,
  type User,
} from "@shared/schema";

interface TrendingTopic {
  topic: string;
  platform: string;
  volume: number;
  sentiment: "positive" | "negative" | "neutral";
  hashtags: string[];
}

interface ContentSuggestion {
  type: "trending" | "performance-based" | "schedule-optimized" | "personalized";
  title: string;
  description: string;
  content: string;
  platforms: string[];
  confidence: number;
  reasoning: string;
  tags: string[];
  bestTimeToPost?: Date;
  estimatedEngagement?: number;
}

export class AIRecommendationEngine {
  private trendingTopics: TrendingTopic[] = [
    {
      topic: "AI Technology",
      platform: "twitter",
      volume: 15000,
      sentiment: "positive",
      hashtags: ["#AI", "#Technology", "#Innovation", "#MachineLearning"],
    },
    {
      topic: "Remote Work",
      platform: "linkedin",
      volume: 8500,
      sentiment: "positive",
      hashtags: ["#RemoteWork", "#WorkFromHome", "#Productivity", "#DigitalNomad"],
    },
    {
      topic: "Sustainability",
      platform: "facebook",
      volume: 12000,
      sentiment: "positive",
      hashtags: ["#Sustainability", "#ClimateChange", "#EcoFriendly", "#GreenTech"],
    },
    {
      topic: "Social Media Marketing",
      platform: "twitter",
      volume: 9500,
      sentiment: "positive",
      hashtags: ["#SocialMediaMarketing", "#DigitalMarketing", "#ContentCreation", "#SMM"],
    },
  ];

  async generateRecommendations(userId: number, limit: number = 5): Promise<ContentRecommendation[]> {
    try {
      // Get user data and preferences
      const user = await storage.getUser(userId);
      if (!user) throw new Error("User not found");

      const preferences = await this.getUserPreferences(userId);
      const performanceData = await this.getContentPerformance(userId);
      const recentPosts = await this.getRecentUserPosts(userId);
      const userAnalytics = await this.getUserAnalytics(userId);

      // Generate different types of recommendations
      const suggestions: ContentSuggestion[] = [];

      // 1. Trending topic recommendations
      suggestions.push(...this.generateTrendingRecommendations(preferences, 2));

      // 2. Performance-based recommendations
      suggestions.push(...this.generatePerformanceRecommendations(performanceData, preferences, 2));

      // 3. Schedule-optimized recommendations
      suggestions.push(...this.generateScheduleRecommendations(recentPosts, preferences, 1));

      // 4. Personalized content recommendations
      suggestions.push(...this.generatePersonalizedRecommendations(userAnalytics, preferences, 2));

      // Convert suggestions to database records
      const recommendations: InsertContentRecommendation[] = suggestions
        .slice(0, limit)
        .map((suggestion) => ({
          userId,
          title: suggestion.title,
          description: suggestion.description,
          content: suggestion.content,
          category: suggestion.type,
          platforms: suggestion.platforms,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
          tags: suggestion.tags,
          bestTimeToPost: suggestion.bestTimeToPost,
          estimatedEngagement: suggestion.estimatedEngagement,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        }));

      // Save recommendations to database
      const savedRecommendations: ContentRecommendation[] = [];
      for (const rec of recommendations) {
        const saved = await storage.createContentRecommendation(rec);
        savedRecommendations.push(saved);
      }

      return savedRecommendations;
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }

  private generateTrendingRecommendations(
    preferences?: UserPreferences,
    count: number = 2
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    const preferredPlatforms = preferences?.platforms || ["twitter", "linkedin"];
    
    for (const topic of this.trendingTopics.slice(0, count)) {
      if (preferredPlatforms.includes(topic.platform)) {
        suggestions.push({
          type: "trending",
          title: `Join the ${topic.topic} Conversation`,
          description: `Share your thoughts on ${topic.topic} while it's trending`,
          content: this.generateTrendingContent(topic, preferences),
          platforms: [topic.platform],
          confidence: 85,
          reasoning: `${topic.topic} is currently trending with ${topic.volume} mentions and ${topic.sentiment} sentiment`,
          tags: topic.hashtags,
          estimatedEngagement: Math.floor(topic.volume * 0.05),
        });
      }
    }

    return suggestions;
  }

  private generatePerformanceRecommendations(
    performanceData: ContentPerformance[],
    preferences?: UserPreferences,
    count: number = 2
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Find best-performing content types
    const topPerformers = performanceData
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, count);

    for (const performer of topPerformers) {
      suggestions.push({
        type: "performance-based",
        title: `More ${performer.contentType} Content`,
        description: `Your ${performer.contentType} posts about ${performer.topic} perform well`,
        content: this.generatePerformanceBasedContent(performer, preferences),
        platforms: [performer.platform],
        confidence: 90,
        reasoning: `Your ${performer.contentType} content averages ${performer.avgEngagement} engagement`,
        tags: this.generateTopicTags(performer.topic),
        estimatedEngagement: performer.avgEngagement,
      });
    }

    return suggestions;
  }

  private generateScheduleRecommendations(
    recentPosts: Post[],
    preferences?: UserPreferences,
    count: number = 1
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Analyze posting patterns
    const optimalTime = this.calculateOptimalPostingTime(recentPosts, preferences);
    
    suggestions.push({
      type: "schedule-optimized",
      title: "Optimal Timing Post",
      description: "Post at your best-performing time slot",
      content: this.generateTimingOptimizedContent(preferences),
      platforms: preferences?.platforms || ["twitter"],
      confidence: 75,
      reasoning: `Based on your posting history, ${optimalTime.toLocaleTimeString()} shows highest engagement`,
      tags: this.generateGenericTags(preferences),
      bestTimeToPost: optimalTime,
      estimatedEngagement: 150,
    });

    return suggestions;
  }

  private generatePersonalizedRecommendations(
    analytics: Analytics[],
    preferences?: UserPreferences,
    count: number = 2
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    const avgEngagement = analytics.reduce((sum, a) => sum + a.likes + a.shares + a.comments, 0) / analytics.length || 0;
    const preferredTone = preferences?.tone || "professional";
    const industry = preferences?.industry || "technology";

    suggestions.push({
      type: "personalized",
      title: "Industry Insights",
      description: `Share insights about ${industry} trends`,
      content: this.generateIndustryContent(industry, preferredTone),
      platforms: preferences?.platforms || ["linkedin"],
      confidence: 80,
      reasoning: `Tailored for ${industry} with ${preferredTone} tone based on your preferences`,
      tags: this.generateIndustryTags(industry),
      estimatedEngagement: Math.max(avgEngagement, 100),
    });

    if (suggestions.length < count) {
      suggestions.push({
        type: "personalized",
        title: "Engagement Booster",
        description: "Content designed to increase audience interaction",
        content: this.generateEngagementContent(preferredTone),
        platforms: preferences?.platforms || ["twitter"],
        confidence: 75,
        reasoning: "Interactive content typically generates 40% more engagement",
        tags: ["#Engagement", "#Community", "#Discussion"],
        estimatedEngagement: Math.floor(avgEngagement * 1.4),
      });
    }

    return suggestions;
  }

  private generateTrendingContent(topic: TrendingTopic, preferences?: UserPreferences): string {
    const tone = preferences?.tone || "professional";
    const templates = {
      professional: `Interesting developments in ${topic.topic}. What are your thoughts on how this will impact our industry? ${topic.hashtags.slice(0, 3).join(" ")}`,
      casual: `${topic.topic} is everywhere today! 🔥 What's your take? ${topic.hashtags.slice(0, 2).join(" ")}`,
      humorous: `So ${topic.topic} is trending... again! 😄 Anyone else feeling like we're in a sci-fi movie? ${topic.hashtags.slice(0, 2).join(" ")}`,
    };
    
    return templates[tone as keyof typeof templates] || templates.professional;
  }

  private generatePerformanceBasedContent(performer: ContentPerformance, preferences?: UserPreferences): string {
    const tone = preferences?.tone || "professional";
    
    return `Here's another ${performer.contentType} post about ${performer.topic}. Based on your previous success with this topic, this should resonate well with your audience. What's your experience with ${performer.topic}?`;
  }

  private generateTimingOptimizedContent(preferences?: UserPreferences): string {
    const topics = preferences?.topics || ["productivity", "business"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    return `Quick thought on ${topic}: consistency beats perfection every time. What's your approach to staying consistent in your work?`;
  }

  private generateIndustryContent(industry: string, tone: string): string {
    const insights = {
      technology: "The pace of technological innovation continues to accelerate. How is your organization adapting to these rapid changes?",
      marketing: "Data-driven marketing is becoming the norm. What metrics do you find most valuable for measuring campaign success?",
      healthcare: "Digital transformation in healthcare is creating new opportunities for patient care. What innovations excite you most?",
      finance: "The financial landscape is evolving with new technologies. How do you see the future of digital banking?",
    };
    
    return insights[industry as keyof typeof insights] || `What trends are you seeing in the ${industry} industry?`;
  }

  private generateEngagementContent(tone: string): string {
    const questions = [
      "What's one piece of advice you wish you had received earlier in your career?",
      "If you could solve one problem in your industry, what would it be?",
      "What's the most valuable lesson you've learned this year?",
      "Share a tip that has made your workday more productive.",
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  private generateTopicTags(topic: string): string[] {
    const tagMap: { [key: string]: string[] } = {
      "AI Technology": ["#AI", "#Technology", "#Innovation"],
      "Remote Work": ["#RemoteWork", "#Productivity", "#WorkLife"],
      "Sustainability": ["#Sustainability", "#GreenTech", "#Environment"],
      "Marketing": ["#Marketing", "#DigitalMarketing", "#Strategy"],
    };
    
    return tagMap[topic] || [`#${topic.replace(/\s+/g, '')}`];
  }

  private generateIndustryTags(industry: string): string[] {
    const tagMap: { [key: string]: string[] } = {
      technology: ["#Technology", "#Innovation", "#TechTrends"],
      marketing: ["#Marketing", "#DigitalMarketing", "#MarketingStrategy"],
      healthcare: ["#Healthcare", "#HealthTech", "#PatientCare"],
      finance: ["#Finance", "#FinTech", "#Banking"],
    };
    
    return tagMap[industry] || [`#${industry.charAt(0).toUpperCase() + industry.slice(1)}`];
  }

  private generateGenericTags(preferences?: UserPreferences): string[] {
    return preferences?.topics?.map(topic => `#${topic}`) || ["#Business", "#Growth"];
  }

  private calculateOptimalPostingTime(posts: Post[], preferences?: UserPreferences): Date {
    // Simple algorithm: find the hour with best average engagement
    // In a real implementation, this would analyze actual engagement data
    const optimalHour = preferences?.bestPostingTimes ? 
      (preferences.bestPostingTimes as any)?.hour || 10 : 10;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(optimalHour, 0, 0, 0);
    
    return tomorrow;
  }

  private async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return await storage.getUserPreferences(userId);
  }

  private async getContentPerformance(userId: number): Promise<ContentPerformance[]> {
    return await storage.getContentPerformance(userId);
  }

  private async getRecentUserPosts(userId: number): Promise<Post[]> {
    return await storage.getPosts(userId, { limit: 10 });
  }

  private async getUserAnalytics(userId: number): Promise<Analytics[]> {
    return await storage.getUserAnalytics(userId);
  }

  async updateContentPerformance(userId: number): Promise<void> {
    // Analyze user's posts and update performance metrics
    const posts = await storage.getPosts(userId);
    const performanceMap = new Map<string, {
      totalEngagement: number;
      totalReach: number;
      totalClicks: number;
      count: number;
    }>();

    for (const post of posts) {
      const analytics = await storage.getAnalytics(post.id);
      for (const analytic of analytics) {
        const key = `${post.content.substring(0, 20)}-${analytic.platform}`;
        const existing = performanceMap.get(key) || {
          totalEngagement: 0,
          totalReach: 0,
          totalClicks: 0,
          count: 0,
        };

        existing.totalEngagement += analytic.likes + analytic.shares + analytic.comments;
        existing.totalReach += analytic.impressions;
        existing.totalClicks += analytic.clicks;
        existing.count += 1;

        performanceMap.set(key, existing);
      }
    }

    // Save aggregated performance data
    for (const [key, data] of performanceMap) {
      const [contentType, platform] = key.split('-');
      await storage.createContentPerformance({
        userId,
        contentType: contentType || "general",
        topic: "general",
        platform: platform || "twitter",
        avgEngagement: Math.floor(data.totalEngagement / data.count),
        avgReach: Math.floor(data.totalReach / data.count),
        avgClicks: Math.floor(data.totalClicks / data.count),
        postCount: data.count,
      });
    }
  }

  async markRecommendationAsUsed(recommendationId: number): Promise<void> {
    await storage.updateContentRecommendation(recommendationId, {
      isUsed: true,
      usedAt: new Date(),
    });
  }

  async getUserRecommendations(userId: number, includeUsed: boolean = false): Promise<ContentRecommendation[]> {
    return await storage.getContentRecommendations(userId, includeUsed);
  }
}

export const aiRecommendationEngine = new AIRecommendationEngine();