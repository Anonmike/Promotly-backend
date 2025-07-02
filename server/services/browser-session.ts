import { CookieData } from './browser-automation.js';

interface BrowserSession {
  sessionId: string;
  platform: string;
  userId: number;
  status: 'pending' | 'logged_in' | 'completed' | 'failed';
  loginUrl: string;
  createdAt: Date;
  expiresAt: Date;
  instructions: string[];
}

export class BrowserSessionService {
  private sessions: Map<string, BrowserSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  generateSession(platform: string, userId: number): BrowserSession {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let loginUrl: string;
    let instructions: string[];
    
    switch (platform) {
      case 'twitter':
        loginUrl = 'https://x.com/login';
        instructions = [
          'Open the login URL in a new browser tab',
          'Log in to your Twitter/X account',
          'Navigate to your home feed',
          'Open browser developer tools (F12)',
          'Go to Application/Storage → Cookies',
          'Select x.com domain',
          'Copy all cookies as JSON',
          'Return here and paste the cookies'
        ];
        break;
      case 'facebook':
        loginUrl = 'https://www.facebook.com/login';
        instructions = [
          'Open the login URL in a new browser tab',
          'Log in to your Facebook account',
          'Navigate to your home feed',
          'Open browser developer tools (F12)',
          'Go to Application/Storage → Cookies',
          'Select facebook.com domain',
          'Copy all cookies as JSON',
          'Return here and paste the cookies'
        ];
        break;
      case 'linkedin':
        loginUrl = 'https://www.linkedin.com/login';
        instructions = [
          'Open the login URL in a new browser tab',
          'Log in to your LinkedIn account',
          'Navigate to your home feed',
          'Open browser developer tools (F12)',
          'Go to Application/Storage → Cookies',
          'Select linkedin.com domain',
          'Copy all cookies as JSON',
          'Return here and paste the cookies'
        ];
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const session: BrowserSession = {
      sessionId,
      platform,
      userId,
      status: 'pending',
      loginUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
      instructions
    };

    this.sessions.set(sessionId, session);
    
    // Auto-cleanup expired sessions
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, this.SESSION_TIMEOUT);

    return session;
  }

  getSession(sessionId: string): BrowserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    if (session) {
      this.sessions.delete(sessionId);
    }
    return undefined;
  }

  updateSessionStatus(sessionId: string, status: BrowserSession['status']): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      return true;
    }
    return false;
  }

  completeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  validateCookies(cookies: any[], platform: string): { valid: boolean; message: string } {
    if (!Array.isArray(cookies)) {
      return { valid: false, message: 'Cookies must be an array' };
    }

    const requiredDomains = {
      twitter: ['x.com', 'twitter.com'],
      facebook: ['facebook.com'],
      linkedin: ['linkedin.com']
    };

    const domains = requiredDomains[platform as keyof typeof requiredDomains];
    if (!domains) {
      return { valid: false, message: `Unsupported platform: ${platform}` };
    }

    const relevantCookies = cookies.filter(cookie => 
      domains.some(domain => cookie.domain && cookie.domain.includes(domain))
    );

    if (relevantCookies.length === 0) {
      return { 
        valid: false, 
        message: `No ${platform} cookies found. Make sure you copied cookies from the correct domain (${domains.join(' or ')})` 
      };
    }

    // Check for essential cookies based on platform
    const essentialCookies = {
      twitter: ['auth_token', 'ct0'],
      facebook: ['c_user', 'xs'],
      linkedin: ['li_at', 'JSESSIONID']
    };

    const required = essentialCookies[platform as keyof typeof essentialCookies];
    const foundEssential = required?.some(name => 
      relevantCookies.some(cookie => cookie.name === name)
    );

    if (required && !foundEssential) {
      return {
        valid: false,
        message: `Missing essential ${platform} authentication cookies. Make sure you're logged in and copied all cookies.`
      };
    }

    return { valid: true, message: 'Cookies validated successfully' };
  }

  formatCookies(cookies: any[], platform: string): CookieData[] {
    const relevantDomains = {
      twitter: ['x.com', 'twitter.com'],
      facebook: ['facebook.com'],
      linkedin: ['linkedin.com']
    };

    const domains = relevantDomains[platform as keyof typeof relevantDomains];
    
    return cookies
      .filter(cookie => 
        cookie.name && 
        cookie.value && 
        cookie.domain &&
        domains.some(domain => cookie.domain.includes(domain))
      )
      .map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires ? (typeof cookie.expires === 'number' ? cookie.expires : Date.parse(cookie.expires) / 1000) : undefined,
        httpOnly: Boolean(cookie.httpOnly),
        secure: cookie.secure !== false,
        sameSite: (cookie.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax'
      }));
  }

  // Clean up expired sessions periodically
  startCleanupJob(): void {
    setInterval(() => {
      const now = new Date();
      this.sessions.forEach((session, sessionId) => {
        if (session.expiresAt <= now) {
          this.sessions.delete(sessionId);
        }
      });
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }
}

export const browserSessionService = new BrowserSessionService();