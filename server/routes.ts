import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertUserSchema, insertSocialAccountSchema, insertPostSchema, platformSchema, postStatusSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { socialMediaService } from "./services/social-media";
import { scheduler } from "./services/scheduler";
import { cookieExtractor } from "./services/cookie-extractor";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Middleware to verify Clerk token
const authenticateClerkToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });
    
    // Get or create user in our system
    const clerkUser = await clerkClient.users.getUser(payload.sub);
    let user = await storage.getUserByUsername(clerkUser.id);
    
    if (!user) {
      // Create user in our system using Clerk ID as username
      user = await storage.createUser({
        username: clerkUser.id,
        password: 'clerk_user' // Placeholder since Clerk handles auth
      });
    }
    
    req.user = { userId: user.id, username: user.username, clerkId: clerkUser.id };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Legacy JWT middleware for backward compatibility
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
  app.get("/api/social-accounts", authenticateClerkToken, async (req: any, res) => {
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

  // Twitter OAuth routes
  // Test endpoint to verify session persistence
  app.get("/api/test/session", (req, res) => {
    console.log('Session test:', {
      sessionId: req.sessionID,
      session: (req as any).session
    });
    res.json({ sessionId: req.sessionID, hasSession: !!(req as any).session });
  });

  app.post("/api/auth/twitter/init", authenticateClerkToken, async (req: any, res) => {
    try {
      const oauthData = await socialMediaService.initializeTwitterOAuth();
      
      // Store OAuth tokens temporarily in session
      (req as any).session.twitterOAuth = {
        oauthToken: oauthData.oauthToken,
        oauthTokenSecret: oauthData.oauthTokenSecret,
        userId: req.user.userId
      };

      console.log('Stored OAuth data in session:', {
        sessionId: req.sessionID,
        oauthToken: oauthData.oauthToken,
        userId: req.user.userId
      });

      res.json({ 
        authUrl: oauthData.authUrl,
        oauthToken: oauthData.oauthToken,
        message: "For localhost development, you'll need to manually complete the OAuth flow after authorization"
      });
    } catch (error) {
      console.error('Twitter OAuth init error:', error);
      res.status(500).json({ 
        message: "Failed to initialize Twitter OAuth",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual OAuth completion for localhost development
  app.post("/api/auth/twitter/complete", authenticateClerkToken, async (req: any, res) => {
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

  app.post("/api/social-accounts", authenticateClerkToken, async (req: any, res) => {
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

  // Add cookie-based authentication for an account
  app.post("/api/social-accounts/cookies", authenticateClerkToken, async (req: any, res) => {
    try {
      const { platform, accountName, cookies } = req.body;
      
      if (!platform || !accountName || !cookies) {
        return res.status(400).json({ message: "Platform, account name, and cookies are required" });
      }

      // Validate cookies first
      const isValid = await socialMediaService.validateCookies(platform, cookies);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid cookies - unable to authenticate with the platform" });
      }

      // Create or update social account with cookies
      const accountData = {
        userId: req.user.userId,
        platform,
        accountId: `cookie_${accountName}_${Date.now()}`,
        accountName,
        authMethod: 'cookies',
        cookies: JSON.stringify(cookies),
        accessToken: null, // Not needed for cookie auth
        accessTokenSecret: null
      };

      const account = await storage.createSocialAccount(accountData);
      res.json({ 
        success: true, 
        message: `${platform} account connected via cookies successfully!`,
        account 
      });
    } catch (error) {
      console.error('Cookie-based account creation error:', error);
      res.status(500).json({ 
        message: "Failed to connect account with cookies",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Refresh account status
  app.post("/api/social-accounts/:id/refresh", authenticateClerkToken, async (req: any, res) => {
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

  app.delete("/api/social-accounts/:id", authenticateClerkToken, async (req: any, res) => {
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

  // Automatic cookie extraction routes
  app.post("/api/social-accounts/extract-cookies/start", authenticateClerkToken, async (req: any, res) => {
    try {
      const { platform } = req.body;
      
      if (!platform) {
        return res.status(400).json({ message: "Platform is required" });
      }

      if (!['twitter', 'facebook', 'linkedin'].includes(platform)) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      // Start the cookie extraction process
      const result = await cookieExtractor.extractCookiesFromPlatform(platform);
      
      res.json({
        success: true,
        sessionId: result.sessionId,
        loginUrl: result.loginUrl,
        message: `Please follow the instructions to extract cookies from ${platform}`,
        instructions: [
          `1. Open a new tab and go to: ${result.loginUrl}`,
          `2. Log in to your ${platform} account`,
          `3. Open browser developer tools (F12)`,
          `4. Go to Application/Storage tab → Cookies`,
          `5. Copy all cookies and paste them in the completion form`,
          `6. Return here and complete the process`
        ]
      });
    } catch (error) {
      console.error('Cookie extraction start error:', error);
      res.status(500).json({ 
        message: "Failed to start cookie extraction",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/social-accounts/extract-cookies/complete", authenticateClerkToken, async (req: any, res) => {
    try {
      const { sessionId, accountName, cookies: cookiesJson } = req.body;
      
      if (!sessionId || !accountName || !cookiesJson) {
        return res.status(400).json({ message: "Session ID, account name, and cookies are required" });
      }

      // Complete the cookie extraction
      const cookies = await cookieExtractor.completeCookieExtraction(sessionId, cookiesJson);
      
      if (cookies.length === 0) {
        return res.status(400).json({ message: "No relevant cookies found. Make sure you're logged in." });
      }

      // Determine platform from cookies
      let platform = '';
      for (const cookie of cookies) {
        if (cookie.domain.includes('x.com') || cookie.domain.includes('twitter.com')) {
          platform = 'twitter';
          break;
        } else if (cookie.domain.includes('facebook.com')) {
          platform = 'facebook';
          break;
        } else if (cookie.domain.includes('linkedin.com')) {
          platform = 'linkedin';
          break;
        }
      }

      if (!platform) {
        return res.status(400).json({ message: "Could not determine platform from cookies" });
      }

      // Create or update social account with extracted cookies
      const accountData = {
        userId: req.user.userId,
        platform,
        accountId: `auto_${accountName}_${Date.now()}`,
        accountName,
        authMethod: 'cookies',
        cookies: JSON.stringify(cookies),
        accessToken: null,
        accessTokenSecret: null,
        isActive: true
      };

      const account = await storage.createSocialAccount(accountData);

      res.json({
        success: true,
        message: `Successfully connected ${platform} account using automatic cookie extraction`,
        account: {
          ...account,
          cookies: undefined // Don't send cookies back in response
        },
        cookiesExtracted: cookies.length
      });
    } catch (error) {
      console.error('Cookie extraction complete error:', error);
      res.status(500).json({ 
        message: "Failed to complete cookie extraction",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/social-accounts/extract-cookies/cancel", authenticateClerkToken, async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      await cookieExtractor.cancelCookieExtraction(sessionId);
      
      res.json({
        success: true,
        message: "Cookie extraction cancelled successfully"
      });
    } catch (error) {
      console.error('Cookie extraction cancel error:', error);
      res.status(500).json({ 
        message: "Failed to cancel cookie extraction",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Post routes
  app.get("/api/posts", authenticateClerkToken, async (req: any, res) => {
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

  app.post("/api/posts/schedule", authenticateClerkToken, async (req: any, res) => {
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

  app.delete("/api/posts/:id", authenticateClerkToken, async (req: any, res) => {
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
  app.get("/api/analytics/:postId", authenticateClerkToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const analytics = await storage.getAnalytics(postId);
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/user/summary", authenticateClerkToken, async (req: any, res) => {
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
  app.get("/api/auth/:platform/callback", authenticateClerkToken, async (req: any, res) => {
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
