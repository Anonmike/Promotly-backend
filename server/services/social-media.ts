import { TwitterApi } from "twitter-api-v2";
import axios from "axios";
import type { Post, SocialAccount } from "@shared/schema";
import { browserAutomationService, type CookieData } from "./browser-automation";
import { browserSessionClient } from "./browser-session-client";

export class SocialMediaService {
  private twitterClients: Map<string, TwitterApi> = new Map();

  // Twitter/X Integration
  async postToTwitter(post: Post, account: SocialAccount): Promise<string> {
    try {
      // Validate token before attempting to post
      const isTokenValid = await this.validateTwitterToken(account);
      if (!isTokenValid) {
        throw new Error('Twitter account disconnected. Please reconnect your Twitter account.');
      }

      const client = this.getTwitterClient(account);
      
      // Validate content length for Twitter
      if (post.content.length > 280) {
        throw new Error('Tweet content exceeds 280 character limit');
      }

      const result = await client.v2.tweet(post.content);
      return result.data.id;
    } catch (error: any) {
      console.error('Twitter posting error:', error);
      
      // Handle specific Twitter API errors
      if (error.code === 401 || error.code === 403) {
        throw new Error('Twitter account disconnected. Please reconnect your Twitter account.');
      } else if (error.code === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate content detected. Please modify your post.');
      }
      
      throw new Error(`Twitter posting failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Facebook Integration
  async postToFacebook(post: Post, account: SocialAccount): Promise<string> {
    try {
      if (!account.accessToken) {
        throw new Error('No Facebook access token available');
      }

      const response = await axios.post(
        `https://graph.facebook.com/me/feed`,
        {
          message: post.content,
          access_token: account.accessToken
        }
      );

      return response.data.id;
    } catch (error: any) {
      console.error('Facebook posting error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Facebook account disconnected. Please reconnect your Facebook account.');
      }
      
      throw new Error(`Facebook posting failed: ${error.response?.data?.error?.message || error.message || 'Unknown error'}`);
    }
  }

  // LinkedIn Integration
  async postToLinkedIn(post: Post, account: SocialAccount): Promise<string> {
    try {
      if (!account.accessToken) {
        throw new Error('No LinkedIn access token available');
      }

      // Get user ID first
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/people/~',
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      const userId = profileResponse.data.id;

      // Create the post
      const postData = {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: post.content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return response.data.id;
    } catch (error: any) {
      console.error('LinkedIn posting error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('LinkedIn account disconnected. Please reconnect your LinkedIn account.');
      }
      
      throw new Error(`LinkedIn posting failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  }

  // Instagram Integration (placeholder)
  async postToInstagram(post: Post, account: SocialAccount): Promise<string> {
    throw new Error('Instagram posting not yet implemented');
  }

  private getTwitterClient(account: SocialAccount): TwitterApi {
    const key = `${account.userId}_${account.platform}`;
    
    if (!this.twitterClients.has(key)) {
      if (!account.accessToken || !account.accessTokenSecret) {
        throw new Error('Twitter tokens not available');
      }

      const client = new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY!,
        appSecret: process.env.TWITTER_CONSUMER_SECRET!,
        accessToken: account.accessToken,
        accessSecret: account.accessTokenSecret,
      });

      this.twitterClients.set(key, client);
    }

    return this.twitterClients.get(key)!;
  }

  // Twitter token validation
  async validateTwitterToken(account: SocialAccount): Promise<boolean> {
    try {
      if (!account.accessToken || !account.accessTokenSecret) {
        return false;
      }

      const client = this.getTwitterClient(account);
      
      // Simple API call to verify credentials
      await client.v2.me();
      return true;
    } catch (error: any) {
      console.error(`Twitter token validation failed for account ${account.accountName}:`, error);
      
      // Check for specific error codes that indicate invalid tokens
      if (error.code === 401 || error.code === 403 || 
          error.message?.includes('Invalid or expired token') ||
          error.message?.includes('Could not authenticate')) {
        
        // Clear the cached client since token is invalid
        const key = `${account.userId}_${account.platform}`;
        this.twitterClients.delete(key);
        return false;
      }
      
      // For other errors (rate limits, network issues), assume token is still valid
      return true;
    }
  }

  // Twitter OAuth Flow
  async initializeTwitterOAuth(): Promise<{ authUrl: string; oauthToken: string; oauthTokenSecret: string }> {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY!,
        appSecret: process.env.TWITTER_CONSUMER_SECRET!,
      });

      const callbackUrl = process.env.NODE_ENV === 'production' 
        ? 'https://app.promotlyai.com/api/auth/twitter/callback'
        : `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/twitter/callback`;
      console.log('Twitter OAuth callback URL:', callbackUrl);
      
      const authLink = await client.generateAuthLink(
        callbackUrl,
        { linkMode: 'authorize' }
      );

      console.log('Twitter OAuth URL generated:', authLink.url);

      return {
        authUrl: authLink.url,
        oauthToken: authLink.oauth_token,
        oauthTokenSecret: authLink.oauth_token_secret,
      };
    } catch (error) {
      console.error('Twitter OAuth initialization failed:', error);
      throw new Error('Failed to initialize Twitter authentication');
    }
  }

  async completeTwitterOAuth(
    oauthToken: string,
    oauthTokenSecret: string,
    oauthVerifier: string
  ): Promise<{ accessToken: string; accessTokenSecret: string; userId: string; screenName: string }> {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY!,
        appSecret: process.env.TWITTER_CONSUMER_SECRET!,
        accessToken: oauthToken,
        accessSecret: oauthTokenSecret,
      });

      const { client: loggedClient, accessToken, accessSecret } = await client.login(oauthVerifier);
      
      // Get user info
      const user = await loggedClient.v2.me();
      
      return {
        accessToken,
        accessTokenSecret: accessSecret,
        userId: user.data.id,
        screenName: user.data.username,
      };
    } catch (error) {
      console.error('Twitter OAuth completion failed:', error);
      throw new Error('Failed to complete Twitter authentication');
    }
  }

  // Method to publish a post to specified platforms
  async publishPost(post: Post, accounts: SocialAccount[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const platform of post.platforms) {
      const account = accounts.find(acc => acc.platform === platform && acc.isActive);
      
      if (!account) {
        throw new Error(`No active account found for platform: ${platform}`);
      }

      try {
        let postId: string;
        
        // Try browser session authentication if set as primary method
        if (account.authMethod === 'browser_session') {
          postId = await this.postWithBrowserSession(post, account);
        } else if (account.authMethod === 'cookies' && account.cookies) {
          // Try cookie-based authentication if set as primary method
          postId = await this.postWithCookies(post, account);
        } else {
          // Use traditional OAuth/API methods
          switch (platform) {
            case 'twitter':
              postId = await this.postToTwitter(post, account);
              break;
            case 'facebook':
              postId = await this.postToFacebook(post, account);
              break;
            case 'linkedin':
              postId = await this.postToLinkedIn(post, account);
              break;
            case 'instagram':
              postId = await this.postToInstagram(post, account);
              break;
            default:
              throw new Error(`Unsupported platform: ${platform}`);
          }
        }
        
        results[platform] = postId;
      } catch (error) {
        console.error(`Failed to post to ${platform}:`, error);
        
        // Fallback to browser session if other methods fail
        if (account.authMethod !== 'browser_session') {
          try {
            console.log(`Trying browser session fallback for ${platform}...`);
            const fallbackPostId = await this.postWithBrowserSession(post, account);
            results[platform] = fallbackPostId;
            console.log(`Browser session fallback succeeded for ${platform}`);
          } catch (fallbackError) {
            console.error(`Browser session fallback also failed for ${platform}:`, fallbackError);
            throw error; // Re-throw original error
          }
        } else {
          throw error; // Re-throw if browser session was already the primary method
        }
      }
    }
    
    return results;
  }

  // Post using cookie-based authentication
  async postWithCookies(post: Post, account: SocialAccount): Promise<string> {
    if (!account.cookies) {
      throw new Error('No cookies available for headless automation');
    }

    const cookies: CookieData[] = JSON.parse(account.cookies);
    
    switch (account.platform) {
      case "twitter":
        return await browserAutomationService.postToTwitter(post.content, cookies);
      case "facebook":
        return await browserAutomationService.postToFacebook(post.content, cookies);
      case "linkedin":
        return await browserAutomationService.postToLinkedIn(post.content, cookies);
      default:
        throw new Error(`Cookie-based posting not supported for platform: ${account.platform}`);
    }
  }

  // Validate cookies for a platform
  async validateCookies(platform: string, cookies: CookieData[]): Promise<boolean> {
    return await browserAutomationService.validateCookies(platform, cookies);
  }

  // Browser Session Integration Methods
  async initializeBrowserSession(userId: number, platform: string): Promise<{ sessionUrl: string; sessionId: string; instructions: string[] }> {
    try {
      // Check if browser session service is available
      await browserSessionClient.healthCheck();
      
      const loginUrls = {
        twitter: 'https://twitter.com/login',
        linkedin: 'https://www.linkedin.com/login',
        facebook: 'https://www.facebook.com/login'
      };

      const loginUrl = loginUrls[platform as keyof typeof loginUrls];
      if (!loginUrl) {
        throw new Error(`Unsupported platform for browser sessions: ${platform}`);
      }

      const result = await browserSessionClient.createSession(
        userId.toString(),
        platform,
        loginUrl
      );

      return {
        sessionUrl: result.next_step,
        sessionId: `${userId}:${platform}`,
        instructions: [
          `Browser opened for ${platform} login`,
          'Complete the login process manually in the opened browser',
          'Once logged in, confirm completion to save your session',
          'This session will be used for automated posting'
        ]
      };
    } catch (error) {
      console.error('Failed to initialize browser session:', error);
      throw new Error(`Browser session initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async confirmBrowserSession(userId: number, platform: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await browserSessionClient.confirmLogin(
        userId.toString(),
        platform
      );

      return {
        success: result.session_saved || false,
        message: result.message || 'Session confirmed successfully'
      };
    } catch (error) {
      console.error('Failed to confirm browser session:', error);
      throw new Error(`Browser session confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async postWithBrowserSession(post: Post, account: SocialAccount): Promise<string> {
    try {
      const platform = account.platform;
      const userId = account.userId.toString();

      // Validate session before posting
      const isValidSession = await browserSessionClient.validateSession(userId, platform);
      if (!isValidSession) {
        throw new Error(`${platform} browser session expired. Please reconnect your account.`);
      }

      let result;
      switch (platform) {
        case 'twitter':
          result = await browserSessionClient.postToTwitter(userId, post.content, post.mediaUrls || []);
          break;
        case 'linkedin':
          result = await browserSessionClient.postToLinkedIn(userId, post.content, post.mediaUrls || []);
          break;
        case 'facebook':
          result = await browserSessionClient.postToFacebook(userId, post.content, post.mediaUrls || []);
          break;
        default:
          throw new Error(`Browser session posting not supported for ${platform}`);
      }

      if (result.status === 'action_completed') {
        return result.result.post_id || `browser_session_${Date.now()}`;
      } else {
        throw new Error(result.message || 'Posting failed');
      }
    } catch (error) {
      console.error(`Browser session posting failed for ${account.platform}:`, error);
      throw error;
    }
  }

  async validateBrowserSession(userId: number, platform: string): Promise<boolean> {
    try {
      return await browserSessionClient.validateSession(userId.toString(), platform);
    } catch (error) {
      console.error('Browser session validation failed:', error);
      return false;
    }
  }

  async listBrowserSessions(userId: number): Promise<any[]> {
    try {
      return await browserSessionClient.listSessions(userId.toString());
    } catch (error) {
      console.error('Failed to list browser sessions:', error);
      return [];
    }
  }

  async deleteBrowserSession(userId: number, platform: string): Promise<boolean> {
    try {
      await browserSessionClient.deleteSession(userId.toString(), platform);
      return true;
    } catch (error) {
      console.error('Failed to delete browser session:', error);
      return false;
    }
  }

  // Method to fetch analytics for published posts
  async fetchAnalytics(platform: string, postId: string, account: SocialAccount): Promise<any> {
    try {
      switch (platform) {
        case 'twitter':
          return await this.fetchTwitterAnalytics(postId, account);
        case 'facebook':
          return await this.fetchFacebookAnalytics(postId, account);
        case 'linkedin':
          return await this.fetchLinkedInAnalytics(postId, account);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to fetch analytics for ${platform}:`, error);
      return null;
    }
  }

  private async fetchTwitterAnalytics(postId: string, account: SocialAccount): Promise<any> {
    try {
      const client = this.getTwitterClient(account);
      const tweet = await client.v2.singleTweet(postId, {
        'tweet.fields': ['public_metrics']
      });
      
      return {
        likes: tweet.data?.public_metrics?.like_count || 0,
        shares: tweet.data?.public_metrics?.retweet_count || 0,
        comments: tweet.data?.public_metrics?.reply_count || 0,
        impressions: tweet.data?.public_metrics?.impression_count || 0,
      };
    } catch (error) {
      return null;
    }
  }

  private async fetchFacebookAnalytics(postId: string, account: SocialAccount): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),shares,comments.summary(true)&access_token=${account.accessToken}`
      );
      
      return {
        likes: response.data.likes?.summary?.total_count || 0,
        shares: response.data.shares?.count || 0,
        comments: response.data.comments?.summary?.total_count || 0,
        impressions: 0, // Not available in basic API
      };
    } catch (error) {
      return null;
    }
  }

  private async fetchLinkedInAnalytics(postId: string, account: SocialAccount): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.linkedin.com/v2/socialActions/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      
      return {
        likes: response.data.likesSummary?.totalLikes || 0,
        shares: response.data.sharesSummary?.totalShares || 0,
        comments: response.data.commentsSummary?.totalComments || 0,
        impressions: 0, // Requires additional API calls
      };
    } catch (error) {
      return null;
    }
  }
}

export const socialMediaService = new SocialMediaService();