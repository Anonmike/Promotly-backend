import { 
  users, userStats, socialAccounts, posts, analytics, contentRecommendations, userPreferences, contentPerformance,
  type User, type InsertUser, type UserStats, type InsertUserStats, type SocialAccount, type InsertSocialAccount, 
  type Post, type InsertPost, type Analytics, type InsertAnalytics, type ContentRecommendation, type InsertContentRecommendation,
  type UserPreferences, type InsertUserPreferences, type ContentPerformance, type InsertContentPerformance
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // User stats operations
  getUserStats(userId: number): Promise<UserStats | undefined>;
  createUserStats(stats: InsertUserStats): Promise<UserStats>;
  updateUserStats(userId: number, updates: Partial<UserStats>): Promise<UserStats | undefined>;

  // Social account operations
  getSocialAccounts(userId: number): Promise<SocialAccount[]>;
  getSocialAccount(userId: number, platform: string): Promise<SocialAccount | undefined>;
  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccount(id: number, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined>;
  deleteSocialAccount(id: number): Promise<boolean>;

  // Post operations
  getPost(id: number): Promise<Post | undefined>;
  getPosts(userId: number, filters?: { status?: string; platform?: string; limit?: number }): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
  getScheduledPosts(): Promise<Post[]>;

  // Analytics operations
  getAnalytics(postId: number): Promise<Analytics[]>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  updateAnalytics(id: number, updates: Partial<Analytics>): Promise<Analytics | undefined>;
  getUserAnalytics(userId: number, timeframe?: string): Promise<Analytics[]>;

  // Content recommendation operations
  getContentRecommendations(userId: number, includeUsed?: boolean): Promise<ContentRecommendation[]>;
  createContentRecommendation(recommendation: InsertContentRecommendation): Promise<ContentRecommendation>;
  updateContentRecommendation(id: number, updates: Partial<ContentRecommendation>): Promise<ContentRecommendation | undefined>;

  // User preferences operations
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined>;

  // Content performance operations
  getContentPerformance(userId: number): Promise<ContentPerformance[]>;
  createContentPerformance(performance: InsertContentPerformance): Promise<ContentPerformance>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Create initial user stats
    await this.createUserStats({ userId: user.id });
    
    return user;
  }

  // User stats operations
  async getUserStats(userId: number): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats || undefined;
  }

  async createUserStats(insertStats: InsertUserStats): Promise<UserStats> {
    const [stats] = await db.insert(userStats).values(insertStats).returning();
    return stats;
  }

  async updateUserStats(userId: number, updates: Partial<UserStats>): Promise<UserStats | undefined> {
    const [updatedStats] = await db
      .update(userStats)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(userStats.userId, userId))
      .returning();
    return updatedStats || undefined;
  }

  // Social account operations
  async getSocialAccounts(userId: number): Promise<SocialAccount[]> {
    return await db.select().from(socialAccounts).where(eq(socialAccounts.userId, userId));
  }

  async getSocialAccount(userId: number, platform: string): Promise<SocialAccount | undefined> {
    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.platform, platform)));
    return account || undefined;
  }

  async createSocialAccount(insertAccount: InsertSocialAccount): Promise<SocialAccount> {
    const [account] = await db.insert(socialAccounts).values(insertAccount).returning();
    
    // Update user stats - increment connected accounts
    await this.updateUserStats(insertAccount.userId, {
      connectedAccounts: sql`connected_accounts + 1`
    } as any);
    
    return account;
  }

  async updateSocialAccount(id: number, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined> {
    const [updatedAccount] = await db
      .update(socialAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(socialAccounts.id, id))
      .returning();
    return updatedAccount || undefined;
  }

  async deleteSocialAccount(id: number): Promise<boolean> {
    // Get the account to update user stats
    const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, id));
    
    if (!account) return false;
    
    const result = await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
    
    if (result.rowCount && result.rowCount > 0) {
      // Update user stats - decrement connected accounts
      await this.updateUserStats(account.userId, {
        connectedAccounts: sql`GREATEST(connected_accounts - 1, 0)`
      } as any);
      return true;
    }
    
    return false;
  }

  // Post operations
  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPosts(userId: number, filters?: { status?: string; platform?: string; limit?: number }): Promise<Post[]> {
    let query = db.select().from(posts).where(eq(posts.userId, userId));
    
    if (filters?.status) {
      query = query.where(eq(posts.status, filters.status));
    }
    
    if (filters?.platform) {
      query = query.where(sql`${posts.platforms} @> ${JSON.stringify([filters.platform])}`);
    }
    
    query = query.orderBy(desc(posts.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    
    // Update user stats
    await this.updateUserStats(insertPost.userId, {
      totalPosts: sql`total_posts + 1`,
      lastPostDate: new Date()
    } as any);
    
    return post;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const [updatedPost] = await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    
    // Update user stats based on post status
    if (updatedPost && updates.status) {
      const userId = updatedPost.userId;
      
      if (updates.status === 'published') {
        await this.updateUserStats(userId, {
          successfulPosts: sql`successful_posts + 1`
        } as any);
        
        // Update social account stats
        for (const platform of updatedPost.platforms) {
          await db
            .update(socialAccounts)
            .set({
              postsCount: sql`posts_count + 1`,
              successfulPosts: sql`successful_posts + 1`,
              updatedAt: new Date()
            })
            .where(and(
              eq(socialAccounts.userId, userId),
              eq(socialAccounts.platform, platform)
            ));
        }
      } else if (updates.status === 'failed') {
        await this.updateUserStats(userId, {
          failedPosts: sql`failed_posts + 1`
        } as any);
        
        // Update social account stats
        for (const platform of updatedPost.platforms) {
          await db
            .update(socialAccounts)
            .set({
              failedPosts: sql`failed_posts + 1`,
              updatedAt: new Date()
            })
            .where(and(
              eq(socialAccounts.userId, userId),
              eq(socialAccounts.platform, platform)
            ));
        }
      }
    }
    
    return updatedPost || undefined;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getScheduledPosts(): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.status, "scheduled"),
        sql`${posts.scheduledFor} <= NOW()`
      ))
      .orderBy(posts.scheduledFor);
  }

  // Analytics operations
  async getAnalytics(postId: number): Promise<Analytics[]> {
    return await db.select().from(analytics).where(eq(analytics.postId, postId));
  }

  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const [analytic] = await db.insert(analytics).values(insertAnalytics).returning();
    
    // Update user and social account engagement stats
    const post = await this.getPost(insertAnalytics.postId);
    if (post) {
      const engagement = (analytic.likes || 0) + (analytic.shares || 0) + (analytic.comments || 0);
      
      await this.updateUserStats(post.userId, {
        totalEngagement: sql`total_engagement + ${engagement}`,
        totalImpressions: sql`total_impressions + ${analytic.impressions || 0}`
      } as any);
      
      // Update social account engagement
      await db
        .update(socialAccounts)
        .set({
          totalEngagement: sql`total_engagement + ${engagement}`,
          updatedAt: new Date()
        })
        .where(and(
          eq(socialAccounts.userId, post.userId),
          eq(socialAccounts.platform, insertAnalytics.platform)
        ));
    }
    
    return analytic;
  }

  async updateAnalytics(id: number, updates: Partial<Analytics>): Promise<Analytics | undefined> {
    const [updatedAnalytics] = await db
      .update(analytics)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(analytics.id, id))
      .returning();
    return updatedAnalytics || undefined;
  }

  async getUserAnalytics(userId: number, timeframe?: string): Promise<Analytics[]> {
    let query = db
      .select()
      .from(analytics)
      .innerJoin(posts, eq(analytics.postId, posts.id))
      .where(eq(posts.userId, userId));
    
    if (timeframe) {
      const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
      query = query.where(sql`${analytics.lastUpdated} >= NOW() - INTERVAL '${daysBack} days'`);
    }
    
    const results = await query.orderBy(desc(analytics.lastUpdated));
    return results.map(result => result.analytics);
  }

  // Content recommendation operations
  async getContentRecommendations(userId: number, includeUsed: boolean = false): Promise<ContentRecommendation[]> {
    let query = db
      .select()
      .from(contentRecommendations)
      .where(eq(contentRecommendations.userId, userId));
    
    if (!includeUsed) {
      query = query.where(eq(contentRecommendations.isUsed, false));
    }
    
    return await query.orderBy(desc(contentRecommendations.createdAt));
  }

  async createContentRecommendation(recommendation: InsertContentRecommendation): Promise<ContentRecommendation> {
    const [created] = await db
      .insert(contentRecommendations)
      .values(recommendation)
      .returning();
    return created;
  }

  async updateContentRecommendation(id: number, updates: Partial<ContentRecommendation>): Promise<ContentRecommendation | undefined> {
    const [updated] = await db
      .update(contentRecommendations)
      .set(updates)
      .where(eq(contentRecommendations.id, id))
      .returning();
    return updated || undefined;
  }

  // User preferences operations
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences || undefined;
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [created] = await db
      .insert(userPreferences)
      .values(preferences)
      .returning();
    return created;
  }

  async updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const [updated] = await db
      .update(userPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updated || undefined;
  }

  // Content performance operations
  async getContentPerformance(userId: number): Promise<ContentPerformance[]> {
    return await db
      .select()
      .from(contentPerformance)
      .where(eq(contentPerformance.userId, userId))
      .orderBy(desc(contentPerformance.lastCalculated));
  }

  async createContentPerformance(performance: InsertContentPerformance): Promise<ContentPerformance> {
    const [created] = await db
      .insert(contentPerformance)
      .values(performance)
      .returning();
    return created;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private socialAccounts: Map<number, SocialAccount>;
  private posts: Map<number, Post>;
  private analytics: Map<number, Analytics>;
  private currentUserId: number;
  private currentSocialAccountId: number;
  private currentPostId: number;
  private currentAnalyticsId: number;

  constructor() {
    this.users = new Map();
    this.socialAccounts = new Map();
    this.posts = new Map();
    this.analytics = new Map();
    this.currentUserId = 1;
    this.currentSocialAccountId = 1;
    this.currentPostId = 1;
    this.currentAnalyticsId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Social account operations
  async getSocialAccounts(userId: number): Promise<SocialAccount[]> {
    return Array.from(this.socialAccounts.values()).filter(account => account.userId === userId);
  }

  async getSocialAccount(userId: number, platform: string): Promise<SocialAccount | undefined> {
    return Array.from(this.socialAccounts.values()).find(
      account => account.userId === userId && account.platform === platform
    );
  }

  async createSocialAccount(insertAccount: InsertSocialAccount): Promise<SocialAccount> {
    const id = this.currentSocialAccountId++;
    const account: SocialAccount = {
      ...insertAccount,
      id,
      accessTokenSecret: insertAccount.accessTokenSecret ?? null,
      isActive: true,
      createdAt: new Date(),
      refreshToken: insertAccount.refreshToken || null,
      expiresAt: insertAccount.expiresAt || null,
    };
    this.socialAccounts.set(id, account);
    return account;
  }

  async updateSocialAccount(id: number, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined> {
    const account = this.socialAccounts.get(id);
    if (!account) return undefined;

    const updatedAccount = { ...account, ...updates };
    this.socialAccounts.set(id, updatedAccount);
    return updatedAccount;
  }

  async deleteSocialAccount(id: number): Promise<boolean> {
    return this.socialAccounts.delete(id);
  }

  // Post operations
  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getPosts(userId: number, filters?: { status?: string; platform?: string; limit?: number }): Promise<Post[]> {
    let posts = Array.from(this.posts.values()).filter(post => post.userId === userId);

    if (filters?.status) {
      posts = posts.filter(post => post.status === filters.status);
    }

    if (filters?.platform) {
      posts = posts.filter(post => post.platforms.includes(filters.platform!));
    }

    // Sort by scheduled time, most recent first
    posts.sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());

    if (filters?.limit) {
      posts = posts.slice(0, filters.limit);
    }

    return posts;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.currentPostId++;
    const post: Post = {
      id,
      userId: insertPost.userId,
      content: insertPost.content,
      platforms: (insertPost.platforms || []) as string[],
      mediaUrls: (insertPost.mediaUrls || []) as string[],
      scheduledFor: insertPost.scheduledFor,
      status: insertPost.status || "draft",
      publishedAt: null,
      errorMessage: null,
      socialPostIds: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const updatedPost = { ...post, ...updates, updatedAt: new Date() };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }

  async getScheduledPosts(): Promise<Post[]> {
    const now = new Date();
    return Array.from(this.posts.values()).filter(
      post => post.status === "scheduled" && new Date(post.scheduledFor) <= now
    );
  }

  // Analytics operations
  async getAnalytics(postId: number): Promise<Analytics[]> {
    return Array.from(this.analytics.values()).filter(analytics => analytics.postId === postId);
  }

  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const id = this.currentAnalyticsId++;
    const analytics: Analytics = {
      ...insertAnalytics,
      id,
      comments: insertAnalytics.comments || null,
      likes: insertAnalytics.likes || null,
      shares: insertAnalytics.shares || null,
      clicks: insertAnalytics.clicks || null,
      impressions: insertAnalytics.impressions || null,
      engagementRate: insertAnalytics.engagementRate || null,
      lastUpdated: new Date(),
    };
    this.analytics.set(id, analytics);
    return analytics;
  }

  async updateAnalytics(id: number, updates: Partial<Analytics>): Promise<Analytics | undefined> {
    const analytics = this.analytics.get(id);
    if (!analytics) return undefined;

    const updatedAnalytics = { ...analytics, ...updates, lastUpdated: new Date() };
    this.analytics.set(id, updatedAnalytics);
    return updatedAnalytics;
  }

  async getUserAnalytics(userId: number, timeframe?: string): Promise<Analytics[]> {
    // Get all posts for the user first
    const userPosts = Array.from(this.posts.values()).filter(post => post.userId === userId);
    const postIds = userPosts.map(post => post.id);

    // Get analytics for those posts
    let analytics = Array.from(this.analytics.values()).filter(a => postIds.includes(a.postId));

    // Filter by timeframe if provided
    if (timeframe) {
      const now = new Date();
      let cutoffDate = new Date();

      switch (timeframe) {
        case "7d":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          cutoffDate.setDate(now.getDate() - 90);
          break;
      }

      analytics = analytics.filter(a => a.lastUpdated && new Date(a.lastUpdated) >= cutoffDate);
    }

    return analytics;
  }
}

export const storage = new DatabaseStorage();
