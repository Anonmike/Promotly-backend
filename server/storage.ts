import { users, userSessions, socialAccounts, posts, analytics, type User, type InsertUser, type UserSession, type InsertUserSession, type SocialAccount, type InsertSocialAccount, type Post, type InsertPost, type Analytics, type InsertAnalytics } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, lt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session operations
  createSession(session: InsertUserSession): Promise<UserSession>;
  getSession(sessionId: string): Promise<UserSession | undefined>;
  updateSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | undefined>;
  deleteSession(sessionId: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<number>;
  getUserSessions(userId: number): Promise<UserSession[]>;

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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Session management
  async createSession(session: InsertUserSession): Promise<UserSession> {
    const [newSession] = await db
      .insert(userSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getSession(sessionId: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, sessionId));
    return session || undefined;
  }

  async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    const [updatedSession] = await db
      .update(userSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSessions.sessionId, sessionId))
      .returning();
    return updatedSession || undefined;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.sessionId, sessionId));
    return (result.rowCount || 0) > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await db
      .delete(userSessions)
      .where(lt(userSessions.expiresAt, new Date()));
    return result.rowCount || 0;
  }

  async getUserSessions(userId: number): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId));
  }

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

  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const [newAccount] = await db
      .insert(socialAccounts)
      .values(account)
      .returning();
    return newAccount;
  }

  async updateSocialAccount(id: number, updates: Partial<SocialAccount>): Promise<SocialAccount | undefined> {
    const [updatedAccount] = await db
      .update(socialAccounts)
      .set(updates)
      .where(eq(socialAccounts.id, id))
      .returning();
    return updatedAccount || undefined;
  }

  async deleteSocialAccount(id: number): Promise<boolean> {
    const result = await db
      .delete(socialAccounts)
      .where(eq(socialAccounts.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPosts(userId: number, filters?: { status?: string; platform?: string; limit?: number }): Promise<Post[]> {
    if (filters?.status && filters?.limit) {
      return await db.select().from(posts)
        .where(and(eq(posts.userId, userId), eq(posts.status, filters.status)))
        .limit(filters.limit);
    } else if (filters?.status) {
      return await db.select().from(posts)
        .where(and(eq(posts.userId, userId), eq(posts.status, filters.status)));
    } else if (filters?.limit) {
      return await db.select().from(posts)
        .where(eq(posts.userId, userId))
        .limit(filters.limit);
    } else {
      return await db.select().from(posts)
        .where(eq(posts.userId, userId));
    }
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
    return newPost;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const [updatedPost] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();
    return updatedPost || undefined;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db
      .delete(posts)
      .where(eq(posts.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getScheduledPosts(): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.status, "scheduled"));
  }

  async getAnalytics(postId: number): Promise<Analytics[]> {
    return await db.select().from(analytics).where(eq(analytics.postId, postId));
  }

  async createAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
    const [newAnalytics] = await db
      .insert(analytics)
      .values(analyticsData)
      .returning();
    return newAnalytics;
  }

  async updateAnalytics(id: number, updates: Partial<Analytics>): Promise<Analytics | undefined> {
    const [updatedAnalytics] = await db
      .update(analytics)
      .set(updates)
      .where(eq(analytics.id, id))
      .returning();
    return updatedAnalytics || undefined;
  }

  async getUserAnalytics(userId: number, timeframe?: string): Promise<Analytics[]> {
    const userPosts = await db.select().from(posts).where(eq(posts.userId, userId));
    const postIds = userPosts.map(post => post.id);
    
    if (postIds.length === 0) return [];
    
    return await db
      .select()
      .from(analytics)
      .where(inArray(analytics.postId, postIds));
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userSessions: Map<string, UserSession>;
  private socialAccounts: Map<number, SocialAccount>;
  private posts: Map<number, Post>;
  private analytics: Map<number, Analytics>;
  private currentUserId: number;
  private currentSessionId: number;
  private currentSocialAccountId: number;
  private currentPostId: number;
  private currentAnalyticsId: number;

  constructor() {
    this.users = new Map();
    this.userSessions = new Map();
    this.socialAccounts = new Map();
    this.posts = new Map();
    this.analytics = new Map();
    this.currentUserId = 1;
    this.currentSessionId = 1;
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

  // Session management
  async createSession(insertSession: InsertUserSession): Promise<UserSession> {
    const id = this.currentSessionId++;
    const session: UserSession = {
      id,
      sessionId: insertSession.sessionId,
      userId: insertSession.userId,
      clerkUserId: insertSession.clerkUserId,
      data: insertSession.data || {},
      expiresAt: insertSession.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userSessions.set(insertSession.sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<UserSession | undefined> {
    return this.userSessions.get(sessionId);
  }

  async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    const session = this.userSessions.get(sessionId);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates, updatedAt: new Date() };
    this.userSessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.userSessions.delete(sessionId);
  }

  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;
    
    for (const [sessionId, session] of this.userSessions.entries()) {
      if (session.expiresAt < now) {
        this.userSessions.delete(sessionId);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  async getUserSessions(userId: number): Promise<UserSession[]> {
    return Array.from(this.userSessions.values()).filter(session => session.userId === userId);
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
