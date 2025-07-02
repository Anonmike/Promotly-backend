import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import type { Post, SocialAccount } from "@shared/schema";

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export class BrowserAutomationService {
  private browser: puppeteer.Browser | null = null;

  private findChromiumPath(): string | null {
    try {
      // Try to find chromium in the system
      const result = execSync('which chromium', { encoding: 'utf8' });
      return result.trim();
    } catch (error) {
      return null;
    }
  }

  async initBrowser(): Promise<void> {
    if (!this.browser) {
      const chromiumPath = this.findChromiumPath();
      
      try {
        // Try to launch with system Chromium first
        this.browser = await puppeteer.launch({
          headless: true,
          executablePath: chromiumPath || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        });
      } catch (error) {
        // Fallback to default Puppeteer Chrome
        try {
          this.browser = await puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu'
            ]
          });
        } catch (fallbackError) {
          throw new Error(`Failed to launch browser: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}. Please ensure Chrome is installed or run: npx puppeteer browsers install chrome`);
        }
      }
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Twitter/X posting using cookies
  async postToTwitterWithCookies(post: Post, cookies: CookieData[]): Promise<string> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    try {
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to Twitter
      await page.goto('https://x.com', { waitUntil: 'networkidle0' });
      
      // Set cookies
      await page.setCookie(...cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || true,
        sameSite: cookie.sameSite || 'None'
      })));
      
      // Reload page with cookies
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Check if logged in by looking for compose button
      const composeButton = await page.$('[data-testid="SideNav_NewTweet_Button"]');
      if (!composeButton) {
        throw new Error('Not logged in to Twitter - cookies may be invalid');
      }
      
      // Click compose button
      await composeButton.click();
      await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      
      // Type the tweet content
      const textArea = await page.$('[data-testid="tweetTextarea_0"]');
      if (!textArea) {
        throw new Error('Could not find tweet textarea');
      }
      
      await textArea.click();
      await textArea.type(post.content);
      
      // Handle media uploads if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        // For now, we'll skip media upload in headless mode
        // This can be enhanced later to download and upload images
        console.log('Media URLs present but skipped in headless mode:', post.mediaUrls);
      }
      
      // Post the tweet
      const tweetButton = await page.$('[data-testid="tweetButtonInline"]');
      if (!tweetButton) {
        throw new Error('Could not find tweet button');
      }
      
      await tweetButton.click();
      
      // Wait for successful post (tweet button disappears or success indicator)
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="tweetButtonInline"]') || 
              document.querySelector('[data-testid="toast"]'),
        { timeout: 10000 }
      );
      
      // Try to extract tweet ID from URL change or success indicator
      const currentUrl = page.url();
      const tweetIdMatch = currentUrl.match(/\/status\/(\d+)/);
      const tweetId = tweetIdMatch ? tweetIdMatch[1] : `headless_${Date.now()}`;
      
      console.log('Tweet posted successfully via headless browser');
      return tweetId;
      
    } catch (error) {
      console.error('Headless Twitter posting error:', error);
      throw new Error(`Headless Twitter posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  // LinkedIn posting using cookies
  async postToLinkedInWithCookies(post: Post, cookies: CookieData[]): Promise<string> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto('https://www.linkedin.com', { waitUntil: 'networkidle0' });
      
      // Set LinkedIn cookies
      await page.setCookie(...cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || true,
        sameSite: cookie.sameSite || 'None'
      })));
      
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Navigate to feed and start a post
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle0' });
      
      // Click "Start a post" button
      const startPostButton = await page.$('.share-box-feed-entry__trigger');
      if (!startPostButton) {
        throw new Error('Not logged in to LinkedIn - cookies may be invalid');
      }
      
      await startPostButton.click();
      await page.waitForSelector('.ql-editor', { timeout: 10000 });
      
      // Type the post content
      const editor = await page.$('.ql-editor');
      if (!editor) {
        throw new Error('Could not find LinkedIn post editor');
      }
      
      await editor.click();
      await editor.type(post.content);
      
      // Post the update
      const postButton = await page.$('[data-control-name="share.post"]');
      if (!postButton) {
        throw new Error('Could not find LinkedIn post button');
      }
      
      await postButton.click();
      
      // Wait for successful post
      await page.waitForSelector('.artdeco-toast-message', { timeout: 10000 });
      
      const postId = `linkedin_headless_${Date.now()}`;
      console.log('LinkedIn post published successfully via headless browser');
      return postId;
      
    } catch (error) {
      console.error('Headless LinkedIn posting error:', error);
      throw new Error(`Headless LinkedIn posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  // Facebook posting using cookies
  async postToFacebookWithCookies(post: Post, cookies: CookieData[]): Promise<string> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto('https://www.facebook.com', { waitUntil: 'networkidle0' });
      
      // Set Facebook cookies
      await page.setCookie(...cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || true,
        sameSite: cookie.sameSite || 'None'
      })));
      
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Look for the "What's on your mind?" input
      const postInput = await page.$('[data-testid="status-attachment-mentions-input"]') ||
                       await page.$('[aria-label*="What\'s on your mind"]') ||
                       await page.$('[placeholder*="What\'s on your mind"]');
                       
      if (!postInput) {
        throw new Error('Not logged in to Facebook - cookies may be invalid');
      }
      
      await postInput.click();
      await page.waitForTimeout(2000); // Wait for post composer to open
      
      // Type the post content
      const composer = await page.$('[data-testid="status-attachment-mentions-input"]') ||
                      await page.$('[aria-label*="What\'s on your mind"]');
                      
      if (!composer) {
        throw new Error('Could not find Facebook post composer');
      }
      
      await composer.type(post.content);
      
      // Find and click post button
      const postButton = await page.$('[data-testid="react-composer-post-button"]') ||
                         await page.$('[aria-label="Post"]');
                         
      if (!postButton) {
        throw new Error('Could not find Facebook post button');
      }
      
      await postButton.click();
      
      // Wait for post to be published
      await page.waitForTimeout(3000);
      
      const postId = `facebook_headless_${Date.now()}`;
      console.log('Facebook post published successfully via headless browser');
      return postId;
      
    } catch (error) {
      console.error('Headless Facebook posting error:', error);
      throw new Error(`Headless Facebook posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  // Validate cookies by attempting to access the platform
  async validateCookies(platform: string, cookies: CookieData[]): Promise<boolean> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      let baseUrl: string;
      let loginIndicator: string;
      
      switch (platform) {
        case 'twitter':
          baseUrl = 'https://x.com';
          loginIndicator = '[data-testid="SideNav_NewTweet_Button"]';
          break;
        case 'linkedin':
          baseUrl = 'https://www.linkedin.com/feed/';
          loginIndicator = '.share-box-feed-entry__trigger';
          break;
        case 'facebook':
          baseUrl = 'https://www.facebook.com';
          loginIndicator = '[data-testid="status-attachment-mentions-input"], [aria-label*="What\'s on your mind"]';
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      await page.setCookie(...cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || true,
        sameSite: cookie.sameSite || 'None'
      })));
      
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Check if we can find login indicators
      const loginElement = await page.$(loginIndicator);
      return !!loginElement;
      
    } catch (error) {
      console.error(`Cookie validation error for ${platform}:`, error);
      return false;
    } finally {
      await page.close();
    }
  }
}

export const browserAutomationService = new BrowserAutomationService();