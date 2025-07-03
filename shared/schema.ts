import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platform: text("platform").notNull(), // twitter, facebook, linkedin, etc.
  accountId: text("account_id").notNull(),
  accessToken: text("access_token"),
  accessTokenSecret: text("access_token_secret"), // For OAuth 1.0a (Twitter)
  refreshToken: text("refresh_token"),
  cookies: text("cookies"), // JSON string of cookies for headless automation
  authMethod: text("auth_method").default("oauth"), // oauth or cookies
  expiresAt: timestamp("expires_at"),
  accountName: text("account_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).pick({
  userId: true,
  platform: true,
  accountId: true,
  accessToken: true,
  accessTokenSecret: true,
  refreshToken: true,
  cookies: true,
  authMethod: true,
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
