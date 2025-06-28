import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertUserSchema, insertSocialAccountSchema, insertPostSchema, platformSchema, postStatusSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { socialMediaService } from "./services/social-media";
import { scheduler } from "./services/scheduler";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);

      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Social account routes
  app.get("/api/social-accounts", authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts(req.user.userId);
      res.json({ accounts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch social accounts" });
    }
  });

  // Twitter OAuth routes
  app.post("/api/auth/twitter/init", authenticateToken, async (req: any, res) => {
    try {
      const oauthData = await socialMediaService.initializeTwitterOAuth();
      
      // Store OAuth tokens temporarily in session
      (req as any).session.twitterOAuth = {
        oauthToken: oauthData.oauthToken,
        oauthTokenSecret: oauthData.oauthTokenSecret,
        userId: req.user.userId
      };

      res.json({ authUrl: oauthData.authUrl });
    } catch (error) {
      console.error('Twitter OAuth init error:', error);
      res.status(500).json({ 
        message: "Failed to initialize Twitter OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/auth/twitter/callback", async (req, res) => {
    try {
      const { oauth_token, oauth_verifier } = req.query;
      
      if (!oauth_token || !oauth_verifier) {
        return res.status(400).json({ message: "Missing OAuth parameters" });
      }

      // Retrieve stored OAuth data
      const oauthData = (req as any).session.twitterOAuth;
      if (!oauthData || oauthData.oauthToken !== oauth_token) {
        return res.status(400).json({ message: "Invalid OAuth session" });
      }

      // Complete OAuth flow
      const result = await socialMediaService.completeTwitterOAuth(
        oauthData.oauthToken,
        oauthData.oauthTokenSecret,
        oauth_verifier as string
      );

      // Store the Twitter account
      await storage.createSocialAccount({
        userId: oauthData.userId,
        platform: "twitter",
        accountId: result.userId,
        accountName: result.screenName,
        accessToken: result.accessToken,
        accessTokenSecret: result.accessTokenSecret,
      });

      // Clear OAuth session data
      delete (req as any).session.twitterOAuth;

      // Redirect back to social accounts page
      res.redirect("/?connected=twitter");
    } catch (error) {
      console.error('Twitter OAuth callback error:', error);
      res.redirect("/?error=twitter_auth_failed");
    }
  });

  app.post("/api/social-accounts", authenticateToken, async (req: any, res) => {
    try {
      const accountData = insertSocialAccountSchema.parse({
        ...req.body,
        userId: req.user.userId
      });

      const account = await storage.createSocialAccount(accountData);
      res.json({ account });
    } catch (error) {
      res.status(400).json({ message: "Invalid account data" });
    }
  });

  app.delete("/api/social-accounts/:id", authenticateToken, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const deleted = await storage.deleteSocialAccount(accountId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Post routes
  app.get("/api/posts", authenticateToken, async (req: any, res) => {
    try {
      const { status, platform, limit } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status;
      if (platform) filters.platform = platform;
      if (limit) filters.limit = parseInt(limit);

      const posts = await storage.getPosts(req.user.userId, filters);
      res.json({ posts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts/schedule", authenticateToken, async (req: any, res) => {
    try {
      console.log('Received post data:', req.body);
      
      const postData = insertPostSchema.parse({
        ...req.body,
        userId: req.user.userId,
        status: "scheduled"
      });

      console.log('Parsed post data:', postData);

      // Validate platforms
      if (postData.platforms && postData.platforms.length > 0) {
        for (const platform of postData.platforms) {
          platformSchema.parse(platform);
        }
      }

      const post = await storage.createPost(postData);
      res.json({ post });
    } catch (error) {
      console.error('Post scheduling error:', error);
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        return res.status(400).json({ 
          message: "Invalid post data", 
          errors: error.errors,
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ 
        message: "Failed to schedule post",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/posts/:id", authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const updates = req.body;

      // Validate status if provided
      if (updates.status) {
        postStatusSchema.parse(updates.status);
      }

      const updatedPost = await storage.updatePost(postId, updates);
      if (!updatedPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json({ post: updatedPost });
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete("/api/posts/:id", authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const deleted = await storage.deletePost(postId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/:postId", authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const analytics = await storage.getAnalytics(postId);
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/user/summary", authenticateToken, async (req: any, res) => {
    try {
      const { timeframe } = req.query;
      const analytics = await storage.getUserAnalytics(req.user.userId, timeframe as string);
      
      // Calculate summary statistics
      const summary = {
        totalPosts: analytics.length,
        totalLikes: analytics.reduce((sum, a) => sum + (a.likes || 0), 0),
        totalShares: analytics.reduce((sum, a) => sum + (a.shares || 0), 0),
        totalComments: analytics.reduce((sum, a) => sum + (a.comments || 0), 0),
        totalImpressions: analytics.reduce((sum, a) => sum + (a.impressions || 0), 0),
        avgEngagementRate: analytics.length > 0 
          ? analytics.reduce((sum, a) => sum + (a.engagementRate || 0), 0) / analytics.length 
          : 0
      };

      res.json({ summary, analytics });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      scheduler: scheduler.isRunning() ? "running" : "stopped"
    });
  });

  // Social media OAuth callback endpoints (simplified)
  app.get("/api/auth/:platform/callback", authenticateToken, async (req: any, res) => {
    try {
      const { platform } = req.params;
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ message: "Authorization code required" });
      }

      // This would handle OAuth flow for each platform
      // For now, return success message
      res.json({ 
        message: `${platform} authorization successful`,
        platform,
        code 
      });
    } catch (error) {
      res.status(500).json({ message: "OAuth callback failed" });
    }
  });

  // Start the scheduler
  scheduler.start();

  const httpServer = createServer(app);
  return httpServer;
}
