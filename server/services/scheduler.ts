import * as cron from "node-cron";
import { storage } from "../storage";
import { socialMediaService } from "./social-media";

export class SchedulerService {
  private isSchedulerRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  start() {
    if (this.isSchedulerRunning) {
      console.log("Scheduler is already running");
      return;
    }

    // Run every minute to check for scheduled posts
    this.cronJob = cron.schedule("* * * * *", async () => {
      await this.processScheduledPosts();
    });

    this.isSchedulerRunning = true;
    console.log("Social media scheduler started");
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isSchedulerRunning = false;
    console.log("Social media scheduler stopped");
  }

  isRunning(): boolean {
    return this.isSchedulerRunning;
  }

  private async processScheduledPosts() {
    try {
      const scheduledPosts = await storage.getScheduledPosts();
      
      for (const post of scheduledPosts) {
        await this.processPost(post);
      }
    } catch (error) {
      console.error("Error processing scheduled posts:", error);
    }
  }

  private async processPost(post: any) {
    try {
      console.log(`Processing post ${post.id} for platforms: ${post.platforms.join(", ")}`);

      // Update post status to "publishing"
      await storage.updatePost(post.id, { status: "publishing" });

      // Get user's social accounts
      const accounts = await storage.getSocialAccounts(post.userId);
      
      // Publish to all specified platforms
      const socialPostIds = await socialMediaService.publishPost(post, accounts);

      // Update post as published
      await storage.updatePost(post.id, {
        status: "published",
        publishedAt: new Date(),
        socialPostIds
      });

      console.log(`Successfully published post ${post.id}`);

      // Schedule analytics collection
      setTimeout(() => {
        this.collectAnalytics(post.id, socialPostIds, accounts);
      }, 60000); // Wait 1 minute before collecting initial analytics

    } catch (error) {
      console.error(`Failed to publish post ${post.id}:`, error);
      
      // Update post as failed
      await storage.updatePost(post.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  private async collectAnalytics(postId: number, socialPostIds: Record<string, string>, accounts: any[]) {
    try {
      for (const [platform, platformPostId] of Object.entries(socialPostIds)) {
        const account = accounts.find(acc => acc.platform === platform);
        
        if (account) {
          const analyticsData = await socialMediaService.fetchAnalytics(platform, platformPostId, account);
          
          if (analyticsData) {
            // Check if analytics already exist for this post/platform
            const existingAnalytics = await storage.getAnalytics(postId);
            const platformAnalytics = existingAnalytics.find(a => a.platform === platform);

            if (platformAnalytics) {
              // Update existing analytics
              await storage.updateAnalytics(platformAnalytics.id, {
                likes: analyticsData.likes,
                shares: analyticsData.shares,
                comments: analyticsData.comments,
                impressions: analyticsData.impressions,
                engagementRate: this.calculateEngagementRate(analyticsData)
              });
            } else {
              // Create new analytics record
              await storage.createAnalytics({
                postId,
                platform,
                likes: analyticsData.likes || 0,
                shares: analyticsData.shares || 0,
                comments: analyticsData.comments || 0,
                impressions: analyticsData.impressions || 0,
                engagementRate: this.calculateEngagementRate(analyticsData)
              });
            }
          }
        }
      }

      console.log(`Analytics collected for post ${postId}`);
    } catch (error) {
      console.error(`Failed to collect analytics for post ${postId}:`, error);
    }
  }

  private calculateEngagementRate(analytics: any): number {
    const { likes = 0, shares = 0, comments = 0, impressions = 0 } = analytics;
    
    if (impressions === 0) return 0;
    
    const totalEngagements = likes + shares + comments;
    return Math.round((totalEngagements / impressions) * 10000); // Store as percentage * 100
  }

  // Method to manually trigger analytics collection for all published posts
  async refreshAllAnalytics() {
    try {
      const publishedPosts = await storage.getAllPublishedPosts(); // Get all published posts
      
      for (const post of publishedPosts) {
        if (post.socialPostIds && Object.keys(post.socialPostIds).length > 0) {
          const accounts = await storage.getSocialAccounts(post.userId);
          await this.collectAnalytics(post.id, post.socialPostIds, accounts);
        }
      }
      
      console.log("Analytics refresh completed for all published posts");
    } catch (error) {
      console.error("Failed to refresh analytics:", error);
    }
  }

  // Method to schedule periodic analytics updates
  startAnalyticsCollection() {
    // Collect analytics every hour
    cron.schedule("0 * * * *", async () => {
      console.log("Starting hourly analytics collection...");
      await this.refreshAllAnalytics();
    });

    console.log("Analytics collection scheduler started");
  }
}

export const scheduler = new SchedulerService();
