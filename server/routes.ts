import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertSocialAccountSchema, insertPostSchema } from "@shared/schema";
import { socialMediaService } from "./services/social-media";
import { scheduler } from "./services/scheduler";
import { aiRecommendationEngine } from "./services/ai-recommendations";
import { setupAuth, authenticateUser } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes and middleware
  setupAuth(app);

  // Get user stats endpoint
  app.get("/api/user/stats", authenticateUser, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats(req.user.userId);
      res.json({ stats: stats || {} });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Social account routes
  app.get("/api/social-accounts", authenticateUser, async (req: any, res) => {
    try {
      const accounts = await storage.getSocialAccounts(req.user.userId);
      
      // Check account status for each account
      const accountsWithStatus = await Promise.all(
        accounts.map(async (account) => {
          let isConnected = true;
          
          // Validate Twitter tokens
          if (account.platform === 'twitter') {
            try {
              isConnected = await socialMediaService.validateTwitterToken(account);
              // Update connection status in database
              if (!isConnected) {
                await storage.updateSocialAccount(account.id, { 
                  isConnected: false,
                  lastValidated: new Date()
                });
              }
            } catch (error) {
              console.error(`Error validating Twitter account ${account.accountName}:`, error);
              isConnected = false;
            }
          }
          
          return {
            ...account,
            isConnected,
            status: isConnected ? 'connected' : 'disconnected'
          };
        })
      );
      
      res.json({ accounts: accountsWithStatus });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch social accounts" });
    }
  });

  // Twitter OAuth initialization
  app.post("/api/auth/twitter/init", authenticateUser, async (req: any, res) => {
    try {
      const result = await socialMediaService.initializeTwitterOAuth();
      
      // Store OAuth data in session for later verification
      (req as any).session.twitterOAuth = {
        oauthToken: result.oauthToken,
        oauthTokenSecret: result.oauthTokenSecret,
        userId: req.user.userId
      };
      
      console.log('Stored Twitter OAuth in session:', {
        sessionId: req.sessionID,
        userId: req.user.userId,
        oauthToken: result.oauthToken
      });

      res.json({
        authUrl: result.authUrl,
        message: "Authorization URL generated. Please complete the OAuth flow."
      });
    } catch (error) {
      console.error('Twitter OAuth initialization error:', error);
      res.status(500).json({ 
        message: "Failed to initialize Twitter OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual Twitter OAuth completion for localhost development
  app.post("/api/auth/twitter/complete", authenticateUser, async (req: any, res) => {
    try {
      const { oauth_verifier } = req.body;
      
      if (!oauth_verifier) {
        return res.status(400).json({ message: "OAuth verifier is required" });
      }

      // Retrieve stored OAuth data
      const oauthData = (req as any).session.twitterOAuth;
      console.log('Manual completion session data:', {
        sessionId: req.sessionID,
        hasOAuthData: !!oauthData,
        userId: req.user.userId,
        sessionData: oauthData
      });

      if (!oauthData || oauthData.userId !== req.user.userId) {
        return res.status(400).json({ message: "Invalid OAuth session" });
      }

      // Complete OAuth flow
      const result = await socialMediaService.completeTwitterOAuth(
        oauthData.oauthToken,
        oauthData.oauthTokenSecret,
        oauth_verifier
      );

      // Store the Twitter account
      await storage.createSocialAccount({
        userId: req.user.userId,
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

  // Twitter OAuth callback for production
  app.get("/api/auth/twitter/callback", async (req, res) => {
    console.log('Twitter callback received:', {
      query: req.query,
      headers: req.headers,
      session: (req as any).session?.twitterOAuth ? 'present' : 'missing',
      sessionId: req.sessionID
    });
    
    try {
      const { oauth_token, oauth_verifier, denied } = req.query;
      
      // Handle authorization denial
      if (denied) {
        console.log('Twitter authorization denied');
        return res.redirect("/?error=twitter_auth_denied");
      }
      
      if (!oauth_token || !oauth_verifier) {
        console.log('Missing OAuth parameters:', { oauth_token, oauth_verifier });
        return res.redirect("/?error=twitter_auth_failed");
      }

      // Retrieve stored OAuth data
      const oauthData = (req as any).session.twitterOAuth;
      console.log('Callback session data:', {
        sessionId: req.sessionID,
        hasOAuthData: !!oauthData,
        storedToken: oauthData?.oauthToken,
        receivedToken: oauth_token,
        sessionData: oauthData
      });
      
      if (!oauthData || oauthData.oauthToken !== oauth_token) {
        console.log('OAuth session validation failed');
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
      const redirectUrl = process.env.NODE_ENV === 'production' 
        ? "https://app.promotlyai.com/?connected=twitter"
        : "/?connected=twitter";
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Twitter OAuth callback error:', error);
      const errorRedirectUrl = process.env.NODE_ENV === 'production' 
        ? "https://app.promotlyai.com/?error=twitter_auth_failed"
        : "/?error=twitter_auth_failed";
      res.redirect(errorRedirectUrl);
    }
  });

  // Refresh account status
  app.post("/api/social-accounts/:id/refresh", authenticateUser, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const accounts = await storage.getSocialAccounts(req.user.userId);
      const account = accounts.find(acc => acc.id === accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      let isConnected = true;
      let statusMessage = "Account is connected";
      
      // Validate token based on platform
      if (account.platform === 'twitter') {
        try {
          isConnected = await socialMediaService.validateTwitterToken(account);
          statusMessage = isConnected ? "Twitter account is connected" : "Twitter account is disconnected. Please reconnect.";
          
          // Update connection status in database
          await storage.updateSocialAccount(account.id, { 
            isConnected,
            lastValidated: new Date()
          });
        } catch (error) {
          console.error(`Error validating Twitter account ${account.accountName}:`, error);
          isConnected = false;
          statusMessage = "Twitter account validation failed. Please reconnect.";
        }
      }
      
      res.json({ 
        isConnected,
        status: isConnected ? 'connected' : 'disconnected',
        message: statusMessage,
        account: {
          ...account,
          isConnected,
          status: isConnected ? 'connected' : 'disconnected'
        }
      });
    } catch (error) {
      console.error('Account refresh error:', error);
      res.status(500).json({ message: "Failed to refresh account status" });
    }
  });

  app.post("/api/social-accounts", authenticateUser, async (req: any, res) => {
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

  app.delete("/api/social-accounts/:id", authenticateUser, async (req: any, res) => {
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
  app.get("/api/posts", authenticateUser, async (req: any, res) => {
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

  app.post("/api/posts/schedule", authenticateUser, async (req: any, res) => {
    try {
      console.log('Received post data:', req.body);
      
      const postData = insertPostSchema.parse({
        ...req.body,
        userId: req.user.userId,
      });

      console.log('Parsed post data:', postData);

      const post = await storage.createPost(postData);
      res.json({ 
        post,
        message: "Post scheduled successfully"
      });
    } catch (error) {
      console.error('Post scheduling error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid post data", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to schedule post",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  app.put("/api/posts/:id", authenticateUser, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const updates = req.body;

      const post = await storage.updatePost(postId, updates);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json({ post });
    } catch (error) {
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", authenticateUser, async (req: any, res) => {
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
  app.get("/api/analytics/user/summary", authenticateUser, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats(req.user.userId);
      const accounts = await storage.getSocialAccounts(req.user.userId);
      
      res.json({ 
        summary: {
          totalPosts: stats?.totalPosts || 0,
          successfulPosts: stats?.successfulPosts || 0,
          failedPosts: stats?.failedPosts || 0,
          totalEngagement: stats?.totalEngagement || 0,
          totalImpressions: stats?.totalImpressions || 0,
          connectedAccounts: accounts.length,
          platforms: accounts.map(acc => acc.platform)
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  app.get("/api/analytics/user", authenticateUser, async (req: any, res) => {
    try {
      const { timeframe } = req.query;
      const analytics = await storage.getUserAnalytics(req.user.userId, timeframe as string);
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user analytics" });
    }
  });

  // Content recommendation routes
  app.get("/api/recommendations", authenticateUser, async (req: any, res) => {
    try {
      const { includeUsed = false, limit = 5 } = req.query;
      
      // Get existing recommendations from database
      const existingRecommendations = await storage.getContentRecommendations(
        req.user.userId, 
        includeUsed === 'true'
      );
      
      // If we have enough unused recommendations, return them
      if (existingRecommendations.length >= parseInt(limit)) {
        return res.json({ 
          recommendations: existingRecommendations.slice(0, parseInt(limit))
        });
      }
      
      // Generate new recommendations if needed
      const newRecommendations = await aiRecommendationEngine.generateRecommendations(
        req.user.userId,
        parseInt(limit) - existingRecommendations.length
      );
      
      // Combine existing and new recommendations
      const allRecommendations = [...existingRecommendations, ...newRecommendations]
        .slice(0, parseInt(limit));
      
      res.json({ recommendations: allRecommendations });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ message: "Failed to fetch content recommendations" });
    }
  });

  app.post("/api/recommendations/:id/use", authenticateUser, async (req: any, res) => {
    try {
      const recommendationId = parseInt(req.params.id);
      await aiRecommendationEngine.markRecommendationAsUsed(recommendationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking recommendation as used:', error);
      res.status(500).json({ message: "Failed to mark recommendation as used" });
    }
  });

  app.get("/api/user/preferences", authenticateUser, async (req: any, res) => {
    try {
      const preferences = await storage.getUserPreferences(req.user.userId);
      res.json({ preferences });
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.post("/api/user/preferences", authenticateUser, async (req: any, res) => {
    try {
      const preferences = await storage.createUserPreferences({
        ...req.body,
        userId: req.user.userId
      });
      res.json({ preferences });
    } catch (error) {
      console.error('Error creating user preferences:', error);
      res.status(500).json({ message: "Failed to create user preferences" });
    }
  });

  app.put("/api/user/preferences", authenticateUser, async (req: any, res) => {
    try {
      const preferences = await storage.updateUserPreferences(req.user.userId, req.body);
      res.json({ preferences });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  app.get("/api/analytics/performance", authenticateUser, async (req: any, res) => {
    try {
      const performance = await storage.getContentPerformance(req.user.userId);
      res.json({ performance });
    } catch (error) {
      console.error('Error fetching content performance:', error);
      res.status(500).json({ message: "Failed to fetch content performance" });
    }
  });

  app.post("/api/analytics/refresh", authenticateUser, async (req: any, res) => {
    try {
      await aiRecommendationEngine.updateContentPerformance(req.user.userId);
      res.json({ success: true, message: "Content performance updated successfully" });
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      res.status(500).json({ message: "Failed to refresh analytics" });
    }
  });

  // Start the scheduler
  scheduler.start();

  const httpServer = createServer(app);
  return httpServer;
}