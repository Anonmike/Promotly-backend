import { users, socialAccounts, posts, analytics, type User, type InsertUser, type SocialAccount, type InsertSocialAccount, type Post, type InsertPost, type Analytics, type InsertAnalytics } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByClerkId(clerkUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  getAllPublishedPosts(): Promise<Post[]>;

  // Analytics operations
  getAnalytics(postId: number): Promise<Analytics[]>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  updateAnalytics(id: number, updates: Partial<Analytics>): Promise<Analytics | undefined>;
  getUserAnalytics(userId: number, timeframe?: string): Promise<Analytics[]>;

  // OAuth token operations
  createOAuthToken(token: { userId: number; platform: string; oauthToken: string; oauthTokenSecret?: string; expiresAt: Date }): Promise<any>;
  getOAuthToken(oauthToken: string): Promise<any>;
  deleteOAuthToken(oauthToken: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private socialAccounts: Map<number, SocialAccount>;
  private posts: Map<number, Post>;
  private analytics: Map<number, Analytics>;
  private oauthTokens: Map<string, any>;
  private currentUserId: number;
  private currentSocialAccountId: number;
  private currentPostId: number;
  private currentAnalyticsId: number;

  constructor() {
    this.users = new Map();
    this.socialAccounts = new Map();
    this.posts = new Map();
    this.analytics = new Map();
    this.oauthTokens = new Map();
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

  async getUserByClerkId(clerkUserId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.clerkUserId === clerkUserId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password || null,
      clerkUserId: insertUser.clerkUserId || null
    };
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

  async getAllPublishedPosts(): Promise<Post[]> {
    return Array.from(this.posts.values()).filter(post => post.status === "published");
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

  // OAuth token operations
  async createOAuthToken(token: { userId: number; platform: string; oauthToken: string; oauthTokenSecret?: string; expiresAt: Date }): Promise<any> {
    const tokenData = {
      ...token,
      createdAt: new Date()
    };
    this.oauthTokens.set(token.oauthToken, tokenData);
    console.log('Created OAuth token:', token.oauthToken);
    return tokenData;
  }

  async getOAuthToken(oauthToken: string): Promise<any> {
    console.log('Looking up OAuth token in storage:', oauthToken);
    console.log('Total tokens in storage:', this.oauthTokens.size);
    console.log('Available tokens:', Array.from(this.oauthTokens.keys()));
    
    const token = this.oauthTokens.get(oauthToken);
    console.log('Found token:', !!token);
    
    if (token && token.expiresAt > new Date()) {
      console.log('Token is valid and not expired');
      return token;
    }
    if (token) {
      console.log('Token expired, cleaning up');
      this.oauthTokens.delete(oauthToken); // Clean up expired token
    }
    console.log('No valid token found');
    return null;
  }

  async deleteOAuthToken(oauthToken: string): Promise<boolean> {
    return this.oauthTokens.delete(oauthToken);
  }
}

export const storage = new MemStorage();
