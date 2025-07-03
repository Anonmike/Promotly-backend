import { chromium, BrowserContext, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import type { Post, SocialAccount } from '@shared/schema';

/**
 * Playwright Browser Automation Service for Promotly
 * 
 * Integrates with existing social media service to provide browser-based posting
 * as an alternative to API-based posting when OAuth tokens fail or aren't available.
 */
export class PlaywrightAutomationService {
  private sessionsDir: string;
  private activeSessions: Map<string, BrowserContext>;

  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'user_sessions');
    this.activeSessions = new Map();
  }

  /**
   * Check if browser session exists for user and platform
   */
  async hasSession(userId: number, platform: string): Promise<boolean> {
    const userDataDir = path.join(this.sessionsDir, `${userId}_${platform}`);
    try {
      const stats = await fs.stat(userDataDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get browser context for user and platform
   */
  private async getContext(userId: number, platform: string): Promise<BrowserContext> {
    const sessionKey = `${userId}_${platform}`;
    
    // Return existing active session if available
    if (this.activeSessions.has(sessionKey)) {
      return this.activeSessions.get(sessionKey)!;
    }

    // Create sessions directory if it doesn't exist
    await fs.mkdir(this.sessionsDir, { recursive: true });

    const userDataDir = path.join(this.sessionsDir, sessionKey);
    
    try {
      // Launch persistent context
      const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      this.activeSessions.set(sessionKey, context);
      return context;
    } catch (error: any) {
      if (error.message?.includes('Executable doesn\'t exist') || error.message?.includes('playwright install')) {
        throw new Error('Playwright browsers not installed. Please run: npx playwright install chromium');
      }
      throw error;
    }
  }

  /**
   * Post to LinkedIn using browser automation
   */
  async postToLinkedIn(userId: number, content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const context = await this.getContext(userId, 'linkedin');
      const page = await context.newPage();
      
      // Navigate to LinkedIn feed
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle', timeout: 30000 });
      
      // Check if logged in
      const isLoggedIn = await page.$('.share-box-feed-entry__trigger') !== null;
      if (!isLoggedIn) {
        await page.close();
        return { success: false, error: 'LinkedIn session expired. Please re-authenticate.' };
      }
      
      // Start a post
      await page.click('.share-box-feed-entry__trigger');
      await page.waitForSelector('.ql-editor', { timeout: 10000 });
      
      // Fill content
      await page.fill('.ql-editor', content);
      
      // Post it
      await page.click('[data-control-name="publish_post"]');
      await page.waitForTimeout(3000);
      
      const postId = `linkedin_${Date.now()}`;
      await page.close();
      
      return { success: true, postId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Post to Twitter using browser automation
   */
  async postToTwitter(userId: number, content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const context = await this.getContext(userId, 'twitter');
      const page = await context.newPage();
      
      // Navigate to Twitter
      await page.goto('https://twitter.com/home', { waitUntil: 'networkidle', timeout: 30000 });
      
      // Check if logged in
      const isLoggedIn = await page.$('[data-testid="tweetTextarea_0"]') !== null;
      if (!isLoggedIn) {
        await page.close();
        return { success: false, error: 'Twitter session expired. Please re-authenticate.' };
      }
      
      // Compose tweet
      await page.click('[data-testid="tweetTextarea_0"]');
      await page.fill('[data-testid="tweetTextarea_0"]', content);
      
      // Post tweet
      await page.click('[data-testid="tweetButtonInline"]');
      await page.waitForTimeout(3000);
      
      const postId = `twitter_${Date.now()}`;
      await page.close();
      
      return { success: true, postId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Post to Facebook using browser automation
   */
  async postToFacebook(userId: number, content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const context = await this.getContext(userId, 'facebook');
      const page = await context.newPage();
      
      // Navigate to Facebook
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle', timeout: 30000 });
      
      // Check if logged in and find post composer
      const composer = await page.$('[data-testid="status-attachment-mentions-input"]');
      if (!composer) {
        await page.close();
        return { success: false, error: 'Facebook session expired. Please re-authenticate.' };
      }
      
      // Create post
      await page.click('[data-testid="status-attachment-mentions-input"]');
      await page.fill('[data-testid="status-attachment-mentions-input"]', content);
      
      // Post it
      await page.click('[data-testid="react-composer-post-button"]');
      await page.waitForTimeout(3000);
      
      const postId = `facebook_${Date.now()}`;
      await page.close();
      
      return { success: true, postId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate session for a platform
   */
  async validateSession(userId: number, platform: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const context = await this.getContext(userId, platform);
      const page = await context.newPage();
      
      let url: string;
      let checkSelector: string;
      
      switch (platform) {
        case 'linkedin':
          url = 'https://www.linkedin.com/feed/';
          checkSelector = '.global-nav__me';
          break;
        case 'twitter':
          url = 'https://twitter.com/home';
          checkSelector = '[data-testid="SideNav_AccountSwitcher_Button"]';
          break;
        case 'facebook':
          url = 'https://www.facebook.com/';
          checkSelector = '[data-testid="status-attachment-mentions-input"]';
          break;
        default:
          await page.close();
          return { isValid: false, error: 'Unsupported platform' };
      }
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const isValid = await page.$(checkSelector) !== null;
      
      await page.close();
      return { isValid };
    } catch (error: any) {
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Start onboarding session (opens visible browser for manual login)
   */
  async startOnboarding(userId: number, platform: string): Promise<{ success: boolean; message: string }> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      
      const userDataDir = path.join(this.sessionsDir, `${userId}_${platform}`);
      
      // Launch visible browser for manual login
      const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      let loginUrl: string;
      switch (platform) {
        case 'linkedin':
          loginUrl = 'https://www.linkedin.com/login';
          break;
        case 'twitter':
          loginUrl = 'https://twitter.com/login';
          break;
        case 'facebook':
          loginUrl = 'https://www.facebook.com/login';
          break;
        default:
          await context.close();
          return { success: false, message: 'Unsupported platform' };
      }
      
      await page.goto(loginUrl);
      
      return {
        success: true,
        message: `Browser opened for ${platform} login. Complete login manually, then the session will be saved for automation.`
      };
    } catch (error: any) {
      if (error.message?.includes('Executable doesn\'t exist') || error.message?.includes('playwright install')) {
        return { 
          success: false, 
          message: 'Playwright browsers not installed. Please run: npx playwright install chromium' 
        };
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Close session for a user and platform
   */
  async closeSession(userId: number, platform: string): Promise<void> {
    const sessionKey = `${userId}_${platform}`;
    const context = this.activeSessions.get(sessionKey);
    
    if (context) {
      try {
        await context.close();
        this.activeSessions.delete(sessionKey);
      } catch (error) {
        console.error(`Error closing session ${sessionKey}:`, error);
      }
    }
  }

  /**
   * Close all active sessions
   */
  async closeAllSessions(): Promise<void> {
    const promises = Array.from(this.activeSessions.values()).map(
      context => context.close().catch(console.error)
    );
    await Promise.all(promises);
    this.activeSessions.clear();
  }
}

export const playwrightAutomation = new PlaywrightAutomationService();