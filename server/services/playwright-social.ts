import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import type { Post, SocialAccount, User } from '@shared/schema';
import { storage } from '../storage';

/**
 * Playwright-based Social Media Service
 * 
 * This service replaces cookie-based authentication with persistent browser sessions.
 * Each user gets an isolated browser context that persists between application restarts.
 */
export class PlaywrightSocialService {
  private sessionsDir: string;
  private activeSessions: Map<string, BrowserContext>;

  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'user_sessions');
    this.activeSessions = new Map();
  }

  /**
   * Ensure sessions directory exists
   */
  private async ensureSessionsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get user data directory for a specific user and platform
   */
  private getUserDataDir(userId: number, platform: string): string {
    return path.join(this.sessionsDir, `${userId}_${platform}`);
  }

  /**
   * Check if user has existing browser session for platform
   */
  async hasExistingSession(userId: number, platform: string): Promise<boolean> {
    const userDataDir = this.getUserDataDir(userId, platform);
    try {
      const stats = await fs.stat(userDataDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Start onboarding session for manual login
   * Opens browser in visible mode for user to log in manually
   */
  async startOnboardingSession(userId: number, platform: string): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
  }> {
    console.log(`Starting onboarding session for user ${userId} on ${platform}`);
    
    await this.ensureSessionsDirectory();
    const userDataDir = this.getUserDataDir(userId, platform);
    const sessionKey = `${userId}_${platform}`;

    let browser: Browser | null = null;

    try {
      // Get platform-specific login URL
      const loginUrl = this.getLoginUrl(platform);
      
      // Launch browser with persistent context in visible mode
      browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });

      this.activeSessions.set(sessionKey, browser);

      // Navigate to login page
      const page = await browser.newPage();
      await page.goto(loginUrl, { waitUntil: 'networkidle' });

      // Store session info in database
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        message: `Browser opened for ${platform} login. Complete login and call completeOnboarding when done.`,
        sessionId
      };

    } catch (error: any) {
      console.error('Onboarding session error:', error);
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
      this.activeSessions.delete(sessionKey);

      return {
        success: false,
        message: `Failed to start onboarding session: ${error.message}`
      };
    }
  }

  /**
   * Complete onboarding session
   * Saves the session after user has logged in manually
   */
  async completeOnboardingSession(userId: number, platform: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const sessionKey = `${userId}_${platform}`;
    const session = this.activeSessions.get(sessionKey);

    if (!session) {
      return {
        success: false,
        message: 'No active onboarding session found'
      };
    }

    try {
      // Verify login by checking current URL
      const pages = await session.context.pages();
      if (pages.length > 0) {
        const currentUrl = pages[0].url();
        const isLoggedIn = this.isLoggedInUrl(platform, currentUrl);
        
        if (!isLoggedIn) {
          return {
            success: false,
            message: 'Login verification failed. Please ensure you are logged in.'
          };
        }
      }

      // Close browser to save session
      await session.browser.close();
      this.activeSessions.delete(sessionKey);

      // Create or update social account in database
      const existingAccount = await storage.getSocialAccount(userId, platform);
      if (existingAccount) {
        await storage.updateSocialAccount(existingAccount.id, {
          authMethod: 'browser_session',
          isActive: true
        });
      } else {
        await storage.createSocialAccount({
          userId,
          platform,
          accountId: `browser_${userId}_${platform}`,
          accountName: `${platform} Browser Session`,
          authMethod: 'browser_session',
          isActive: true
        });
      }

      return {
        success: true,
        message: `${platform} session saved successfully`
      };

    } catch (error: any) {
      console.error('Complete onboarding error:', error);
      return {
        success: false,
        message: `Failed to complete onboarding: ${error.message}`
      };
    }
  }

  /**
   * Load existing session for automation
   */
  private async loadSession(userId: number, platform: string): Promise<{
    browser: Browser;
    context: BrowserContext;
  }> {
    const userDataDir = this.getUserDataDir(userId, platform);
    const sessionExists = await this.hasExistingSession(userId, platform);
    
    if (!sessionExists) {
      throw new Error(`No browser session found for user ${userId} on ${platform}. Please complete onboarding first.`);
    }

    const sessionKey = `${userId}_${platform}`;
    
    // Check if session is already active
    const activeSession = this.activeSessions.get(sessionKey);
    if (activeSession) {
      return activeSession;
    }

    // Launch browser with existing session in headless mode
    const browser = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    const context = browser;
    this.activeSessions.set(sessionKey, { browser, context });

    return { browser, context };
  }

  /**
   * Post to LinkedIn using browser automation
   */
  async postToLinkedIn(post: Post, account: SocialAccount): Promise<string> {
    const { browser, context } = await this.loadSession(account.userId, 'linkedin');
    
    try {
      const page = await context.newPage();
      
      // Navigate to LinkedIn feed
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle' });
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Check if we're logged in
      const isLoggedIn = await this.verifyLinkedInLogin(page);
      if (!isLoggedIn) {
        throw new Error('LinkedIn session expired. Please re-authenticate.');
      }
      
      // Click "Start a post" button
      await page.waitForSelector('[data-control-name="feed_composer_post_button"]', { timeout: 10000 });
      await page.click('[data-control-name="feed_composer_post_button"]');
      
      // Wait for composer to open
      await page.waitForSelector('.ql-editor', { timeout: 10000 });
      
      // Type the post content
      await page.fill('.ql-editor', post.content);
      
      // Handle media uploads if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        // TODO: Implement media upload functionality
        console.log('Media upload not yet implemented for LinkedIn');
      }
      
      // Click Post button
      await page.waitForSelector('[data-control-name="publish_post"]', { timeout: 10000 });
      await page.click('[data-control-name="publish_post"]');
      
      // Wait for post to be published
      await page.waitForTimeout(3000);
      
      // Generate a post ID (LinkedIn doesn't easily expose the actual post ID)
      const postId = `linkedin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await page.close();
      return postId;
      
    } catch (error: any) {
      console.error('LinkedIn posting error:', error);
      throw new Error(`Failed to post to LinkedIn: ${error.message}`);
    }
  }

  /**
   * Post to Twitter using browser automation
   */
  async postToTwitter(post: Post, account: SocialAccount): Promise<string> {
    const { browser, context } = await this.loadSession(account.userId, 'twitter');
    
    try {
      const page = await context.newPage();
      
      // Navigate to Twitter home
      await page.goto('https://twitter.com/home', { waitUntil: 'networkidle' });
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Check if we're logged in
      const isLoggedIn = await this.verifyTwitterLogin(page);
      if (!isLoggedIn) {
        throw new Error('Twitter session expired. Please re-authenticate.');
      }
      
      // Click the tweet compose button
      await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      await page.click('[data-testid="tweetTextarea_0"]');
      
      // Type the tweet content
      await page.fill('[data-testid="tweetTextarea_0"]', post.content);
      
      // Handle media uploads if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        // TODO: Implement media upload functionality
        console.log('Media upload not yet implemented for Twitter');
      }
      
      // Click Tweet button
      await page.waitForSelector('[data-testid="tweetButtonInline"]', { timeout: 10000 });
      await page.click('[data-testid="tweetButtonInline"]');
      
      // Wait for tweet to be posted
      await page.waitForTimeout(3000);
      
      // Generate a tweet ID
      const tweetId = `twitter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await page.close();
      return tweetId;
      
    } catch (error: any) {
      console.error('Twitter posting error:', error);
      throw new Error(`Failed to post to Twitter: ${error.message}`);
    }
  }

  /**
   * Post to Facebook using browser automation
   */
  async postToFacebook(post: Post, account: SocialAccount): Promise<string> {
    const { browser, context } = await this.loadSession(account.userId, 'facebook');
    
    try {
      const page = await context.newPage();
      
      // Navigate to Facebook
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' });
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Check if we're logged in
      const isLoggedIn = await this.verifyFacebookLogin(page);
      if (!isLoggedIn) {
        throw new Error('Facebook session expired. Please re-authenticate.');
      }
      
      // Click "What's on your mind?" area
      await page.waitForSelector('[data-testid="status-attachment-mentions-input"]', { timeout: 10000 });
      await page.click('[data-testid="status-attachment-mentions-input"]');
      
      // Type the post content
      await page.fill('[data-testid="status-attachment-mentions-input"]', post.content);
      
      // Handle media uploads if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        // TODO: Implement media upload functionality
        console.log('Media upload not yet implemented for Facebook');
      }
      
      // Click Post button
      await page.waitForSelector('[data-testid="react-composer-post-button"]', { timeout: 10000 });
      await page.click('[data-testid="react-composer-post-button"]');
      
      // Wait for post to be published
      await page.waitForTimeout(3000);
      
      // Generate a post ID
      const postId = `facebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await page.close();
      return postId;
      
    } catch (error: any) {
      console.error('Facebook posting error:', error);
      throw new Error(`Failed to post to Facebook: ${error.message}`);
    }
  }

  /**
   * Validate session by checking if user is still logged in
   */
  async validateSession(userId: number, platform: string): Promise<{
    isValid: boolean;
    message: string;
  }> {
    try {
      const { browser, context } = await this.loadSession(userId, platform);
      const page = await context.newPage();
      
      // Navigate to platform-specific page
      const testUrl = this.getTestUrl(platform);
      await page.goto(testUrl, { waitUntil: 'networkidle' });
      
      // Check if logged in
      let isValid = false;
      switch (platform) {
        case 'linkedin':
          isValid = await this.verifyLinkedInLogin(page);
          break;
        case 'twitter':
          isValid = await this.verifyTwitterLogin(page);
          break;
        case 'facebook':
          isValid = await this.verifyFacebookLogin(page);
          break;
      }
      
      await page.close();
      
      return {
        isValid,
        message: isValid ? 'Session is valid' : 'Session expired, re-authentication required'
      };
      
    } catch (error: any) {
      return {
        isValid: false,
        message: `Session validation failed: ${error.message}`
      };
    }
  }

  /**
   * Close session for a specific user and platform
   */
  async closeSession(userId: number, platform: string): Promise<void> {
    const sessionKey = `${userId}_${platform}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (session) {
      try {
        await session.browser.close();
        this.activeSessions.delete(sessionKey);
      } catch (error) {
        console.error(`Error closing session for ${sessionKey}:`, error);
      }
    }
  }

  /**
   * Close all active sessions
   */
  async closeAllSessions(): Promise<void> {
    const closePromises = Array.from(this.activeSessions.entries()).map(
      ([sessionKey, session]) => session.browser.close().catch(console.error)
    );
    await Promise.all(closePromises);
    this.activeSessions.clear();
  }

  // Helper methods

  private getLoginUrl(platform: string): string {
    switch (platform) {
      case 'linkedin':
        return 'https://www.linkedin.com/login';
      case 'twitter':
        return 'https://twitter.com/login';
      case 'facebook':
        return 'https://www.facebook.com/login';
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private getTestUrl(platform: string): string {
    switch (platform) {
      case 'linkedin':
        return 'https://www.linkedin.com/feed/';
      case 'twitter':
        return 'https://twitter.com/home';
      case 'facebook':
        return 'https://www.facebook.com/';
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private isLoggedInUrl(platform: string, url: string): boolean {
    switch (platform) {
      case 'linkedin':
        return !url.includes('/login') && !url.includes('/signin');
      case 'twitter':
        return !url.includes('/login') && !url.includes('/signin');
      case 'facebook':
        return !url.includes('/login') && !url.includes('/signin');
      default:
        return false;
    }
  }

  private async verifyLinkedInLogin(page: Page): Promise<boolean> {
    try {
      // Check for LinkedIn-specific logged-in elements
      const loggedInSelectors = [
        '.global-nav__me',
        '[data-control-name="identity_profile_photo"]',
        '.global-nav__primary-link--me'
      ];
      
      for (const selector of loggedInSelectors) {
        const element = await page.$(selector);
        if (element) return true;
      }
      
      // Check if we're on login page (indicates not logged in)
      const url = page.url();
      return !url.includes('/login') && !url.includes('/signin');
    } catch {
      return false;
    }
  }

  private async verifyTwitterLogin(page: Page): Promise<boolean> {
    try {
      // Check for Twitter-specific logged-in elements
      const loggedInSelectors = [
        '[data-testid="SideNav_AccountSwitcher_Button"]',
        '[data-testid="AppTabBar_Profile_Link"]',
        '[data-testid="tweetTextarea_0"]'
      ];
      
      for (const selector of loggedInSelectors) {
        const element = await page.$(selector);
        if (element) return true;
      }
      
      const url = page.url();
      return !url.includes('/login') && !url.includes('/signin');
    } catch {
      return false;
    }
  }

  private async verifyFacebookLogin(page: Page): Promise<boolean> {
    try {
      // Check for Facebook-specific logged-in elements
      const loggedInSelectors = [
        '[data-testid="status-attachment-mentions-input"]',
        '[aria-label="Account"]',
        '[data-testid="react-composer-post-button"]'
      ];
      
      for (const selector of loggedInSelectors) {
        const element = await page.$(selector);
        if (element) return true;
      }
      
      const url = page.url();
      return !url.includes('/login') && !url.includes('/signin');
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const playwrightSocialService = new PlaywrightSocialService();