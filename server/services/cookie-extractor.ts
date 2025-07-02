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

  async extractCookiesFromPlatform(platform: string): Promise<{ cookies: CookieData[]; sessionId: string; loginUrl: string }> {
    let baseUrl: string;
    
    switch (platform) {
      case 'twitter':
        baseUrl = 'https://x.com/login';
        break;
      case 'facebook':
        baseUrl = 'https://www.facebook.com/login';
        break;
      case 'linkedin':
        baseUrl = 'https://www.linkedin.com/login';
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Generate a unique session ID for this extraction
    const sessionId = `cookie-extract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store session info for later completion
    (global as any).cookieExtractionSessions = (global as any).cookieExtractionSessions || {};
    (global as any).cookieExtractionSessions[sessionId] = { platform, created: Date.now() };
    
    return { 
      cookies: [], 
      sessionId,
      loginUrl: baseUrl
    };
  }

  async completeCookieExtraction(sessionId: string, cookiesJson: string): Promise<CookieData[]> {
    const sessions = (global as any).cookieExtractionSessions || {};
    const session = sessions[sessionId];
    
    if (!session) {
      throw new Error('Invalid or expired session ID');
    }
    
    const { platform } = session;
    
    try {
      // Parse the cookies JSON provided by the user
      let cookies: any[];
      try {
        cookies = JSON.parse(cookiesJson);
      } catch (parseError) {
        throw new Error('Invalid cookies format. Please provide valid JSON.');
      }
      
      if (!Array.isArray(cookies)) {
        throw new Error('Cookies must be an array');
      }
      
      // Filter and format cookies for the specific platform
      const relevantCookies: CookieData[] = cookies
        .filter((cookie: any) => {
          if (!cookie.name || !cookie.value || !cookie.domain) {
            return false;
          }
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
        .map((cookie: any) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          expires: cookie.expires ? cookie.expires : undefined,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure !== false,
          sameSite: (cookie.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax'
        }));
      
      // Clean up session
      delete sessions[sessionId];
      
      if (relevantCookies.length === 0) {
        throw new Error(`No relevant ${platform} cookies found. Make sure you logged in to the correct platform and extracted cookies from the right domain.`);
      }
      
      return relevantCookies;
      
    } catch (error) {
      // Clean up session on error
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