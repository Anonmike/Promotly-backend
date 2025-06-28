import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertSocialAccountSchema, insertPostSchema, platformSchema, postStatusSchema } from "@shared/schema";
import { socialMediaService } from "./services/social-media";
import { scheduler } from "./services/scheduler";
import { clerkAuth, requireAuth as requireClerkAuth, getUserId } from "./middleware/clerk-auth";
import { verifyJWT, generateJWT, getJWTUser } from "./middleware/jwt-auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Clerk authentication routes (sign in/sign up only)
  app.post("/api/auth/register", clerkAuth, requireClerkAuth, async (req, res) => {
    try {
      const clerkUserId = getUserId(req);
      if (!clerkUserId) {
        return res.status(401).json({ message: "Clerk authentication required" });
      }
      
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Create user in our storage with Clerk ID as reference
      const user = await storage.createUser({ 
        username, 
        clerkUserId: clerkUserId 
      });
      
      // Generate JWT for API access
      const token = generateJWT({ id: user.id, username: user.username });
      
      res.json({ user, token });
    } catch (error) {
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", clerkAuth, requireClerkAuth, async (req, res) => {
    try {
      const clerkUserId = getUserId(req);
      if (!clerkUserId) {
        return res.status(401).json({ message: "Clerk authentication required" });
      }

      // Find user by Clerk ID
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate JWT for API access
      const token = generateJWT({ id: user.id, username: user.username });
      
      res.json({ user, token });
    } catch (error) {
      res.status(500).json({ message: "Failed to login user" });
    }
  });

  // All other routes use JWT authentication
  // Social account routes
  app.get("/api/social-accounts", verifyJWT, async (req, res) => {
    try {
      const user = getJWTUser(req);
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const accounts = await storage.getSocialAccounts(user.id);
      res.json({ accounts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch social accounts" });
    }
  });

  // Twitter OAuth routes
  // Test endpoint to verify session persistence
  app.get("/api/test/session", (req, res) => {
    console.log('Session test:', {
      sessionId: req.sessionID,
      session: (req as any).session
    });
    res.json({ sessionId: req.sessionID, hasSession: !!(req as any).session });
  });

  app.post("/api/auth/twitter/init", verifyJWT, async (req, res) => {
    try {
      const user = getJWTUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const oauthData = await socialMediaService.initializeTwitterOAuth(user.id.toString());
      
      // Store OAuth tokens in database for reliable persistence
      await storage.createOAuthToken({
        userId: user.id,
        platform: "twitter",
        oauthToken: oauthData.oauthToken,
        oauthTokenSecret: oauthData.oauthTokenSecret,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });

      console.log('Stored OAuth data in database:', {
        oauthToken: oauthData.oauthToken,
        userId: user.id
      });

      res.json({ 
        authUrl: oauthData.authUrl,
        oauthToken: oauthData.oauthToken,
        oauthTokenSecret: oauthData.oauthTokenSecret,
        message: "OAuth tokens stored in database for reliable completion"
      });
    } catch (error) {
      console.error('Twitter OAuth init error:', error);
      res.status(500).json({ 
        message: "Failed to initialize Twitter OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Debug endpoint to check stored OAuth tokens
  app.get("/api/debug/oauth-tokens", async (req, res) => {
    try {
      const allTokens = Array.from((storage as any).oauthTokens.entries());
      res.json({
        totalTokens: allTokens.length,
        tokens: allTokens.map(([key, value]) => ({
          token: key.substring(0, 10) + '...',
          userId: value.userId,
          platform: value.platform,
          expiresAt: value.expiresAt,
          isExpired: value.expiresAt < new Date(),
          createdAt: value.createdAt
        }))
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get debug info' });
    }
  });

  // Alternative OAuth completion endpoint that doesn't rely on sessions
  app.post("/api/auth/twitter/complete", verifyJWT, async (req, res) => {
    try {
      const { oauth_token, oauth_verifier, oauth_token_secret } = req.body;
      const user = getJWTUser(req);
      
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
        return res.status(400).json({ message: "Missing OAuth parameters" });
      }

      console.log('Manual Twitter OAuth completion for user:', user.id);

      // Complete OAuth flow
      const result = await socialMediaService.completeTwitterOAuth(
        oauth_token,
        oauth_token_secret,
        oauth_verifier
      );

      // Store the Twitter account
      const account = await storage.createSocialAccount({
        userId: user.id,
        platform: "twitter",
        accountId: result.userId,
        accountName: result.screenName,
        accessToken: result.accessToken,
        accessTokenSecret: result.accessTokenSecret,
      });

      console.log('Twitter account created successfully:', account);
      res.json({ success: true, account });
    } catch (error) {
      console.error('Manual Twitter OAuth completion error:', error);
      res.status(500).json({ 
        message: "Failed to complete Twitter authentication",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Facebook OAuth routes
  app.post("/api/auth/facebook/init", verifyJWT, async (req, res) => {
    try {
      const oauthData = await socialMediaService.initializeFacebookOAuth();
      
      // Store OAuth state temporarily in session
      const userId = getUserId(req);
      (req as any).session.facebookOAuth = {
        state: oauthData.state,
        userId: userId
      };

      console.log('Stored Facebook OAuth data in session:', {
        sessionId: req.sessionID,
        state: oauthData.state,
        userId: userId
      });

      res.json({ 
        authUrl: oauthData.authUrl,
        state: oauthData.state,
        message: "For localhost development, you'll need to manually complete the OAuth flow after authorization"
      });
    } catch (error) {
      console.error('Facebook OAuth init error:', error);
      res.status(500).json({ 
        message: "Failed to initialize Facebook OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/auth/facebook/complete", verifyJWT, async (req, res) => {
    try {
      const { code, state } = req.body;
      
      if (!code || !state) {
        return res.status(400).json({ message: "Authorization code and state required" });
      }

      // Retrieve stored OAuth data
      const oauthData = (req as any).session.facebookOAuth;
      if (!oauthData || oauthData.state !== state) {
        return res.status(400).json({ message: "Invalid OAuth state. Please reinitialize Facebook OAuth." });
      }

      console.log('Facebook OAuth completion:', {
        sessionId: req.sessionID,
        hasOAuthData: !!oauthData,
        receivedState: state,
        storedState: oauthData.state
      });

      // Complete OAuth flow
      const result = await socialMediaService.completeFacebookOAuth(code, state);

      // Store the Facebook account
      await storage.createSocialAccount({
        userId: oauthData.userId,
        platform: "facebook",
        accountId: result.userId,
        accountName: result.userName,
        accessToken: result.accessToken,
        accessTokenSecret: "", // Facebook doesn't use token secret
      });

      // Clear OAuth session data
      delete (req as any).session.facebookOAuth;

      res.json({ 
        success: true, 
        message: `Facebook account ${result.userName} connected successfully!`,
        account: {
          platform: "facebook",
          accountName: result.userName
        }
      });
    } catch (error) {
      console.error('Facebook OAuth completion error:', error);
      res.status(500).json({ 
        message: "Failed to complete Facebook OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // LinkedIn OAuth routes
  app.post("/api/auth/linkedin/init", verifyJWT, async (req, res) => {
    try {
      const oauthData = await socialMediaService.initializeLinkedInOAuth();
      
      // Store OAuth state temporarily in session
      const userId = getUserId(req);
      (req as any).session.linkedinOAuth = {
        state: oauthData.state,
        userId: userId
      };

      console.log('Stored LinkedIn OAuth data in session:', {
        sessionId: req.sessionID,
        state: oauthData.state,
        userId: userId
      });

      res.json({ 
        authUrl: oauthData.authUrl,
        state: oauthData.state,
        message: "For localhost development, you'll need to manually complete the OAuth flow after authorization"
      });
    } catch (error) {
      console.error('LinkedIn OAuth init error:', error);
      res.status(500).json({ 
        message: "Failed to initialize LinkedIn OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/auth/linkedin/complete", verifyJWT, async (req, res) => {
    try {
      const { code, state } = req.body;
      
      if (!code || !state) {
        return res.status(400).json({ message: "Authorization code and state required" });
      }

      // Retrieve stored OAuth data
      const oauthData = (req as any).session.linkedinOAuth;
      if (!oauthData || oauthData.state !== state) {
        return res.status(400).json({ message: "Invalid OAuth state. Please reinitialize LinkedIn OAuth." });
      }

      console.log('LinkedIn OAuth completion:', {
        sessionId: req.sessionID,
        hasOAuthData: !!oauthData,
        receivedState: state,
        storedState: oauthData.state
      });

      // Complete OAuth flow
      const result = await socialMediaService.completeLinkedInOAuth(code, state);

      // Store the LinkedIn account
      await storage.createSocialAccount({
        userId: oauthData.userId,
        platform: "linkedin",
        accountId: result.userId,
        accountName: result.userName,
        accessToken: result.accessToken,
        accessTokenSecret: "", // LinkedIn doesn't use token secret
      });

      // Clear OAuth session data
      delete (req as any).session.linkedinOAuth;

      res.json({ 
        success: true, 
        message: `LinkedIn account ${result.userName} connected successfully!`,
        account: {
          platform: "linkedin",
          accountName: result.userName
        }
      });
    } catch (error) {
      console.error('LinkedIn OAuth completion error:', error);
      res.status(500).json({ 
        message: "Failed to complete LinkedIn OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual OAuth completion for localhost development
  app.post("/api/auth/twitter/complete", verifyJWT, async (req, res) => {
    try {
      const { oauth_verifier } = req.body;
      
      if (!oauth_verifier) {
        return res.status(400).json({ message: "OAuth verifier required" });
      }

      // Retrieve stored OAuth data
      const oauthData = (req as any).session.twitterOAuth;
      if (!oauthData) {
        return res.status(400).json({ message: "No OAuth session found. Please reinitialize Twitter OAuth." });
      }

      console.log('Manual OAuth completion:', {
        sessionId: req.sessionID,
        hasOAuthData: !!oauthData,
        verifier: oauth_verifier
      });

      // Complete OAuth flow
      const result = await socialMediaService.completeTwitterOAuth(
        oauthData.oauthToken,
        oauthData.oauthTokenSecret,
        oauth_verifier
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

      res.json({ 
        success: true, 
        message: `Twitter account @${result.screenName} connected successfully!`,
        account: {
          platform: "twitter",
          accountName: result.screenName
        }
      });
    } catch (error) {
      console.error('Manual Twitter OAuth completion error:', error);
      res.status(500).json({ 
        message: "Failed to complete Twitter OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Simple test callback to verify Twitter can reach our server
  app.get("/api/auth/twitter/test", (req, res) => {
    console.log('Twitter test callback received:', req.query);
    res.send('Twitter callback test successful!');
  });

  app.get("/api/auth/twitter/callback", async (req, res) => {
    console.log('=== TWITTER CALLBACK RECEIVED ===');
    console.log('Query params:', req.query);
    console.log('Session ID:', req.sessionID);
    console.log('Timestamp:', new Date().toISOString());
    console.log('==================================');
    
    try {
      const { oauth_token, oauth_verifier, denied, user_id } = req.query;
      
      // Handle authorization denial
      if (denied) {
        console.log('Twitter authorization denied');
        return res.redirect("/accounts?error=twitter_auth_denied");
      }
      
      if (!oauth_token || !oauth_verifier) {
        console.log('Missing OAuth parameters:', { oauth_token, oauth_verifier });
        return res.redirect("/accounts?error=twitter_auth_failed");
      }

      // Retrieve stored OAuth data from database
      console.log('Looking up OAuth token:', oauth_token);
      const oauthData = await storage.getOAuthToken(oauth_token as string);
      console.log('OAuth token lookup result:', {
        receivedToken: oauth_token,
        foundTokenData: !!oauthData,
        storedUserId: oauthData?.userId,
        storedTokenSecret: oauthData?.oauthTokenSecret ? 'present' : 'missing',
        expiresAt: oauthData?.expiresAt,
        currentTime: new Date()
      });
      
      if (!oauthData) {
        console.log('No OAuth token found in database');
        return res.redirect("/accounts?error=twitter_session_expired");
      }

      // Use userId from stored token data
      const userId = oauthData.userId;
      console.log('Using user_id from stored token:', userId);

      const result = await socialMediaService.completeTwitterOAuth(
        oauth_token as string,
        oauthData.oauthTokenSecret,
        oauth_verifier as string
      );

      // Store the Twitter account
      await storage.createSocialAccount({
        userId: userId,
        platform: "twitter",
        accountId: result.userId,
        accountName: result.screenName,
        accessToken: result.accessToken,
        accessTokenSecret: result.accessTokenSecret,
      });

      // Clean up OAuth token from database
      await storage.deleteOAuthToken(oauth_token as string);

      console.log('Twitter account saved successfully for user:', userId);
      // Redirect back to social accounts page
      res.redirect("/accounts?connected=twitter");
    } catch (error) {
      console.error('Twitter OAuth callback error:', error);
      res.redirect("/accounts?error=twitter_auth_failed");
    }
  });

  // Get social accounts
  app.get("/api/accounts", verifyJWT, async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log('Fetching social accounts for user:', userId);
      
      const accounts = await storage.getSocialAccounts(parseInt(userId!));
      console.log('Retrieved accounts:', accounts);
      
      res.json({ accounts });
    } catch (error) {
      console.error('Failed to fetch social accounts:', error);
      res.status(500).json({ message: "Failed to fetch social accounts" });
    }
  });

  app.post("/api/social-accounts", verifyJWT, async (req, res) => {
    try {
      const userId = getUserId(req);
      const accountData = insertSocialAccountSchema.parse({
        ...req.body,
        userId: userId
      });

      const account = await storage.createSocialAccount(accountData);
      res.json({ account });
    } catch (error) {
      res.status(400).json({ message: "Invalid account data" });
    }
  });

  app.delete("/api/social-accounts/:id", verifyJWT, async (req, res) => {
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
  app.get("/api/posts", verifyJWT, async (req, res) => {
    try {
      const { status, platform, limit } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status;
      if (platform) filters.platform = platform;
      if (limit) filters.limit = parseInt(String(limit));

      const userId = getUserId(req);
      const posts = await storage.getPosts(parseInt(userId!), filters);
      res.json({ posts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts/schedule", verifyJWT, async (req, res) => {
    try {
      console.log('Received post data:', req.body);
      
      const userId = getUserId(req);
      const postData = insertPostSchema.parse({
        ...req.body,
        userId: userId,
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

  app.put("/api/posts/:id", verifyJWT, async (req, res) => {
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

  app.delete("/api/posts/:id", verifyJWT, async (req, res) => {
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
  app.get("/api/analytics/:postId", verifyJWT, async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const analytics = await storage.getAnalytics(postId);
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/user/summary", verifyJWT, async (req, res) => {
    try {
      const { timeframe } = req.query;
      const userId = getUserId(req);
      const analytics = await storage.getUserAnalytics(parseInt(userId!), timeframe as string);
      
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
  app.get("/api/auth/:platform/callback", verifyJWT, async (req, res) => {
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
