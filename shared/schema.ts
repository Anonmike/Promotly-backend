import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  totalPosts: integer("total_posts").default(0),
  successfulPosts: integer("successful_posts").default(0),
  failedPosts: integer("failed_posts").default(0),
  totalEngagement: integer("total_engagement").default(0),
  totalImpressions: integer("total_impressions").default(0),
  connectedAccounts: integer("connected_accounts").default(0),
  lastPostDate: timestamp("last_post_date"),
  accountCreatedDate: timestamp("account_created_date").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platform: text("platform").notNull(), // twitter, facebook, linkedin, etc.
  accountId: text("account_id").notNull(),
  accessToken: text("access_token").notNull(),
  accessTokenSecret: text("access_token_secret"), // For OAuth 1.0a (Twitter)
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  accountName: text("account_name").notNull(),
  isActive: boolean("is_active").default(true),
  isConnected: boolean("is_connected").default(true),
  lastValidated: timestamp("last_validated").defaultNow(),
  postsCount: integer("posts_count").default(0),
  successfulPosts: integer("successful_posts").default(0),
  failedPosts: integer("failed_posts").default(0),
  totalEngagement: integer("total_engagement").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  platforms: json("platforms").$type<string[]>().notNull(), // array of platform names
  mediaUrls: json("media_urls").$type<string[]>().default([]),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, published, failed, draft
  publishedAt: timestamp("published_at"),
  errorMessage: text("error_message"),
  socialPostIds: json("social_post_ids").$type<Record<string, string>>().default({}), // platform -> post_id mapping
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  platform: text("platform").notNull(),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  clicks: integer("clicks").default(0),
  impressions: integer("impressions").default(0),
  engagementRate: integer("engagement_rate").default(0), // stored as percentage * 100
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  stats: one(userStats, {
    fields: [users.id],
    references: [userStats.userId],
  }),
  socialAccounts: many(socialAccounts),
  posts: many(posts),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  user: one(users, {
    fields: [socialAccounts.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  analytics: many(analytics),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  post: one(posts, {
    fields: [analytics.postId],
    references: [posts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true,
});

export const insertUserStatsSchema = createInsertSchema(userStats).pick({
  userId: true,
  totalPosts: true,
  successfulPosts: true,
  failedPosts: true,
  totalEngagement: true,
  totalImpressions: true,
  connectedAccounts: true,
  lastPostDate: true,
});

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).pick({
  userId: true,
  platform: true,
  accountId: true,
  accessToken: true,
  accessTokenSecret: true,
  refreshToken: true,
  expiresAt: true,
  accountName: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  content: true,
  platforms: true,
  mediaUrls: true,
  scheduledFor: true,
  status: true,
}).extend({
  scheduledFor: z.coerce.date(),
  platforms: z.array(z.string()).min(1, "At least one platform is required"),
  mediaUrls: z.array(z.string()).optional().default([]),
});

export const insertAnalyticsSchema = createInsertSchema(analytics).pick({
  postId: true,
  platform: true,
  likes: true,
  shares: true,
  comments: true,
  clicks: true,
  impressions: true,
  engagementRate: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;

// Platform enum for validation
export const platformSchema = z.enum(["twitter", "facebook", "linkedin", "instagram"]);
export type Platform = z.infer<typeof platformSchema>;

// Post status enum
export const postStatusSchema = z.enum(["draft", "scheduled", "published", "failed"]);
export type PostStatus = z.infer<typeof postStatusSchema>;
