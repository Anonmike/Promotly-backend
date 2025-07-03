import { TwitterApi } from "twitter-api-v2";
import axios from "axios";
import type { Post, SocialAccount } from "@shared/schema";
import { browserAutomationService, type CookieData } from "./browser-automation";

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

      let tweetData: any = {
        text: post.content
      };

      // Add media if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        const mediaIds = await this.uploadMediaToTwitter(client, post.mediaUrls);
        if (mediaIds.length > 0) {
          tweetData.media = { media_ids: mediaIds };
        }
      }

      const tweet = await client.v2.tweet(tweetData);
      return tweet.data.id;
    } catch (error: any) {
      console.error('Twitter posting error:', error);
      
      // Handle specific Twitter API errors
      if (error.code === 401 || error.code === 403) {
        // Clear cached client for this account
        const key = `${account.userId}_${account.platform}`;
        this.twitterClients.delete(key);
        throw new Error('Twitter account disconnected. Please reconnect your Twitter account.');
      }
      
      if (error.message?.includes('duplicate')) {
        throw new Error('This tweet appears to be a duplicate of a recent post.');
      }
      
      if (error.code === 429) {
        throw new Error('Twitter rate limit reached. Please try again later.');
      }
      
      throw new Error(`Twitter posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Facebook Integration
  async postToFacebook(post: Post, account: SocialAccount): Promise<string> {
    try {
      const pageId = account.accountId;
      const accessToken = account.accessToken;

      const postData: any = {
        message: post.content,
        access_token: accessToken
      };

      // Add media if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        // For simplicity, using the first image
        postData.link = post.mediaUrls[0];
      }

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        postData
      );

      return response.data.id;
    } catch (error) {
      throw new Error(`Facebook posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // LinkedIn Integration
  async postToLinkedIn(post: Post, account: SocialAccount): Promise<string> {
    try {
      const personUrn = `urn:li:person:${account.accountId}`;
      const accessToken = account.accessToken;

      const postData = {
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: post.content
            },
            shareMediaCategory: post.mediaUrls && post.mediaUrls.length > 0 ? "IMAGE" : "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };

      // Add media if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        const mediaUrn = await this.uploadMediaToLinkedIn(post.mediaUrls[0], accessToken);
        postData.specificContent["com.linkedin.ugc.ShareContent"].media = [{
          status: "READY",
          description: {
            text: "Shared image"
          },
          media: mediaUrn,
          title: {
            text: "Image"
          }
        }];
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return response.data.id;
    } catch (error) {
      throw new Error(`LinkedIn posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Instagram Basic Display (read-only, but included for completeness)
  async postToInstagram(post: Post, account: SocialAccount): Promise<string> {
    // Note: Instagram Basic Display API is read-only
    // For posting, you'd need Instagram Graph API with a Facebook Business account
    throw new Error("Instagram posting requires Instagram Graph API with Business account");
  }

  // Helper methods
  private getTwitterClient(account: SocialAccount): TwitterApi {
    const key = `${account.userId}_${account.platform}`;
    
    if (!this.twitterClients.has(key)) {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY!,
        appSecret: process.env.TWITTER_CONSUMER_SECRET!,
        accessToken: account.accessToken,
        accessSecret: account.accessTokenSecret!,
      });
      
      this.twitterClients.set(key, client);
    }

    return this.twitterClients.get(key)!;
  }

  // Validate Twitter token by making a simple API call
  async validateTwitterToken(account: SocialAccount): Promise<boolean> {
    try {
      const client = this.getTwitterClient(account);
      
      // Try to get user info to validate token
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
      console.error('Twitter OAuth initialization error:', error);
      if (error instanceof Error && error.message.includes('403')) {
        throw new Error('Twitter app configuration error: Please add the callback URL to your Twitter app settings in the Developer Portal');
      }
      throw new Error(`Failed to initialize Twitter OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      const loginResult = await client.login(oauthVerifier);
      
      return {
        accessToken: loginResult.accessToken,
        accessTokenSecret: loginResult.accessSecret,
        userId: loginResult.userId,
        screenName: loginResult.screenName,
      };
    } catch (error) {
      console.error('Twitter OAuth completion error:', error);
      throw new Error(`Failed to complete Twitter OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async uploadMediaToTwitter(client: TwitterApi, mediaUrls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];
    
    for (const url of mediaUrls.slice(0, 4)) { // Twitter allows max 4 images
      try {
        // Download image
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        // Upload to Twitter
        const mediaId = await client.v1.uploadMedia(buffer, { mimeType: response.headers['content-type'] });
        mediaIds.push(mediaId);
      } catch (error) {
        console.error(`Failed to upload media ${url}:`, error);
      }
    }
    
    return mediaIds;
  }

  private async uploadMediaToLinkedIn(mediaUrl: string, accessToken: string): Promise<string> {
    try {
      // This is a simplified version - LinkedIn media upload is more complex
      // First, you need to register the upload, then upload the binary, then reference it
      
      // For now, return a placeholder URN
      return `urn:li:digitalmediaAsset:${Date.now()}`;
    } catch (error) {
      throw new Error(`LinkedIn media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        
        // Try cookie-based authentication if set as primary method
        if (account.authMethod === 'cookies' && account.cookies) {
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
        
        // If OAuth fails and we have cookies, try fallback
        if (account.authMethod !== 'cookies' && account.cookies) {
          try {
            console.log(`Attempting cookie fallback for ${platform}`);
            const postId = await this.postWithCookies(post, account);
            results[platform] = postId;
            console.log(`Cookie fallback successful for ${platform}`);
          } catch (cookieError) {
            console.error(`Cookie fallback also failed for ${platform}:`, cookieError);
            throw error; // Throw original error
          }
        } else {
          throw error; // Re-throw to handle at caller level
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
        return await browserAutomationService.postToTwitterWithCookies(post, cookies);
      case "facebook":
        return await browserAutomationService.postToFacebookWithCookies(post, cookies);
      case "linkedin":
        return await browserAutomationService.postToLinkedInWithCookies(post, cookies);
      default:
        throw new Error(`Cookie-based posting not supported for platform: ${account.platform}`);
    }
  }

  // Validate cookies for a platform
  async validateCookies(platform: string, cookies: CookieData[]): Promise<boolean> {
    return await browserAutomationService.validateCookies(platform, cookies);
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
