import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import type { CookieData } from './browser-automation';

export class CookieExtractorService {
  private browser: puppeteer.Browser | null = null;

  private findChromiumPath(): string | null {
    try {
      const result = execSync('which chromium', { encoding: 'utf8' });
      return result.trim();
    } catch (error) {
      return null;
    }
  }

  async initBrowser(): Promise<void> {
    if (!this.browser) {
      const chromiumPath = this.findChromiumPath();
      
      this.browser = await puppeteer.launch({
        headless: false, // Show browser for user login
        executablePath: chromiumPath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
  }

  async extractCookiesFromPlatform(platform: string): Promise<{ cookies: CookieData[]; sessionId: string }> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    try {
      let baseUrl: string;
      let loginIndicators: string[];
      
      switch (platform) {
        case 'twitter':
          baseUrl = 'https://x.com/login';
          loginIndicators = ['[data-testid="tweetTextarea_0"]', '[aria-label*="Tweet text"]', '[data-testid="primaryColumn"]'];
          break;
        case 'facebook':
          baseUrl = 'https://www.facebook.com/login';
          loginIndicators = ['[data-testid="status-attachment-mentions-input"]', '[aria-label*="What\'s on your mind"]'];
          break;
        case 'linkedin':
          baseUrl = 'https://www.linkedin.com/login';
          loginIndicators = ['.share-box-feed-entry__trigger', '[data-test-id="share-box-header"]'];
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Navigate to login page
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      // Generate a unique session ID for this extraction
      const sessionId = `cookie-extract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store page reference for later cookie extraction
      (global as any).cookieExtractionSessions = (global as any).cookieExtractionSessions || {};
      (global as any).cookieExtractionSessions[sessionId] = { page, platform };
      
      return { cookies: [], sessionId };
      
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async completeCookieExtraction(sessionId: string): Promise<CookieData[]> {
    const sessions = (global as any).cookieExtractionSessions || {};
    const session = sessions[sessionId];
    
    if (!session) {
      throw new Error('Invalid or expired session ID');
    }
    
    const { page, platform } = session;
    
    try {
      // Wait for login completion by checking for platform-specific indicators
      let loginIndicators: string[];
      
      switch (platform) {
        case 'twitter':
          loginIndicators = ['[data-testid="tweetTextarea_0"]', '[aria-label*="Tweet text"]', '[data-testid="primaryColumn"]'];
          break;
        case 'facebook':
          loginIndicators = ['[data-testid="status-attachment-mentions-input"]', '[aria-label*="What\'s on your mind"]'];
          break;
        case 'linkedin':
          loginIndicators = ['.share-box-feed-entry__trigger', '[data-test-id="share-box-header"]'];
          break;
        default:
          loginIndicators = [];
      }
      
      // Check if user is logged in by looking for these indicators
      let isLoggedIn = false;
      for (const indicator of loginIndicators) {
        try {
          await page.waitForSelector(indicator, { timeout: 2000 });
          isLoggedIn = true;
          break;
        } catch (e) {
          // Continue checking other indicators
        }
      }
      
      if (!isLoggedIn) {
        throw new Error('User does not appear to be logged in. Please complete the login process first.');
      }
      
      // Extract all cookies from the page
      const cookies = await page.cookies();
      
      // Filter and format cookies for the specific platform
      const relevantCookies: CookieData[] = cookies
        .filter(cookie => {
          // Filter cookies based on platform domain
          switch (platform) {
            case 'twitter':
              return cookie.domain.includes('x.com') || cookie.domain.includes('twitter.com');
            case 'facebook':
              return cookie.domain.includes('facebook.com');
            case 'linkedin':
              return cookie.domain.includes('linkedin.com');
            default:
              return false;
          }
        })
        .map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires > 0 ? cookie.expires : undefined,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None'
        }));
      
      // Clean up
      await page.close();
      delete sessions[sessionId];
      
      return relevantCookies;
      
    } catch (error) {
      // Clean up on error
      await page.close();
      delete sessions[sessionId];
      throw error;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async cancelCookieExtraction(sessionId: string): Promise<void> {
    const sessions = (global as any).cookieExtractionSessions || {};
    const session = sessions[sessionId];
    
    if (session) {
      await session.page.close();
      delete sessions[sessionId];
    }
  }
}

export const cookieExtractor = new CookieExtractorService();