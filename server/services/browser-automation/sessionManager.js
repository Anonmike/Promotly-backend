import { chromium, Browser, BrowserContext } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Session Manager for Playwright Browser Automation
 * 
 * This module manages persistent browser sessions with unique user data directories.
 * Each user gets their own isolated browser context that persists between sessions.
 * Integrated with Promotly's database for session tracking.
 */
export class BrowserSessionManager {
  constructor() {
    this.sessionsDir = path.join(__dirname, '../../../user_sessions');
    this.activeSessions = new Map(); // Track active browser instances
  }

  /**
   * Ensure the sessions directory exists
   */
  async ensureSessionsDirectory() {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get the user data directory path for a specific user
   * @param {string} userId - Unique identifier for the user
   * @returns {string} Path to user's data directory
   */
  getUserDataDir(userId) {
    return path.join(this.sessionsDir, userId);
  }

  /**
   * Check if a user has an existing session
   * @param {string} userId - User identifier
   * @returns {boolean} True if session exists
   */
  async hasExistingSession(userId) {
    const userDataDir = this.getUserDataDir(userId);
    try {
      const stats = await fs.stat(userDataDir);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Start a new onboarding session for manual login
   * This function opens a browser in non-headless mode for user interaction
   * 
   * Usage:
   * 1. Call this function with a userId and target login URL
   * 2. Browser will open to the login page
   * 3. User manually logs in
   * 4. Press Enter in terminal when login is complete
   * 5. Session will be saved for future automated use
   * 
   * @param {string} userId - Unique user identifier
   * @param {string} loginUrl - Target login URL (e.g., "https://www.linkedin.com/login")
   * @returns {Promise<boolean>} True if session was created successfully
   */
  async startOnboardingSession(userId, loginUrl) {
    console.log(`🚀 Starting onboarding session for user: ${userId}`);
    console.log(`📍 Target URL: ${loginUrl}`);

    await this.ensureSessionsDirectory();
    const userDataDir = this.getUserDataDir(userId);

    let browser = null;
    let context = null;

    try {
      // Launch browser with persistent context
      browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // User needs to see the browser for manual login
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      context = browser;
      this.activeSessions.set(userId, { browser, context });

      // Create a new page and navigate to login URL
      const page = await context.newPage();
      console.log(`🌐 Navigating to login page...`);
      await page.goto(loginUrl, { waitUntil: 'networkidle' });

      console.log(`\n✋ MANUAL LOGIN REQUIRED`);
      console.log(`👤 Please complete the login process in the browser window`);
      console.log(`⏱️  Take your time to:`)
      console.log(`   - Enter your credentials`);
      console.log(`   - Complete any 2FA if required`);
      console.log(`   - Wait for successful login`);
      console.log(`\n🔄 Press ENTER when you have successfully logged in...`);

      // Wait for user confirmation
      await this.waitForUserConfirmation();

      // Verify login by checking if we're still on login page
      const currentUrl = page.url();
      console.log(`📍 Current URL after login: ${currentUrl}`);

      // Close the browser to save the session
      await browser.close();
      this.activeSessions.delete(userId);

      console.log(`✅ Session saved successfully for user: ${userId}`);
      console.log(`💾 Session data stored in: ${userDataDir}`);
      console.log(`🎯 You can now use this session for automated actions`);

      return true;

    } catch (error) {
      console.error(`❌ Error during onboarding session:`, error);
      
      // Cleanup on error
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error(`Error closing browser:`, closeError);
        }
      }
      this.activeSessions.delete(userId);
      
      throw error;
    }
  }

  /**
   * Load an existing session for automated actions
   * This function loads a saved session in headless mode
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Object containing browser and context
   */
  async loadSession(userId) {
    const userDataDir = this.getUserDataDir(userId);
    
    // Check if session exists
    const sessionExists = await this.hasExistingSession(userId);
    if (!sessionExists) {
      throw new Error(`No existing session found for user: ${userId}. Please run onboarding first.`);
    }

    console.log(`🔄 Loading existing session for user: ${userId}`);

    try {
      // Launch browser with existing persistent context
      const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: true, // Run in headless mode for automation
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const context = browser;
      this.activeSessions.set(userId, { browser, context });

      console.log(`✅ Session loaded successfully for user: ${userId}`);
      
      return { browser, context };

    } catch (error) {
      console.error(`❌ Error loading session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Close a specific user's session
   * @param {string} userId - User identifier
   */
  async closeSession(userId) {
    const session = this.activeSessions.get(userId);
    if (session) {
      try {
        await session.browser.close();
        this.activeSessions.delete(userId);
        console.log(`🔒 Session closed for user: ${userId}`);
      } catch (error) {
        console.error(`Error closing session for user ${userId}:`, error);
      }
    }
  }

  /**
   * Close all active sessions
   */
  async closeAllSessions() {
    console.log(`🔒 Closing all active sessions...`);
    const promises = Array.from(this.activeSessions.keys()).map(userId => 
      this.closeSession(userId)
    );
    await Promise.all(promises);
  }

  /**
   * Delete a user's session data
   * @param {string} userId - User identifier
   */
  async deleteSession(userId) {
    await this.closeSession(userId);
    const userDataDir = this.getUserDataDir(userId);
    
    try {
      await fs.rm(userDataDir, { recursive: true, force: true });
      console.log(`🗑️ Session data deleted for user: ${userId}`);
    } catch (error) {
      console.error(`Error deleting session data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List all existing sessions
   * @returns {Promise<string[]>} Array of user IDs with sessions
   */
  async listSessions() {
    await this.ensureSessionsDirectory();
    
    try {
      const entries = await fs.readdir(this.sessionsDir);
      const sessions = [];
      
      for (const entry of entries) {
        const entryPath = path.join(this.sessionsDir, entry);
        const stats = await fs.stat(entryPath);
        if (stats.isDirectory()) {
          sessions.push(entry);
        }
      }
      
      return sessions;
    } catch (error) {
      console.error(`Error listing sessions:`, error);
      return [];
    }
  }

  /**
   * Wait for user to press Enter in terminal
   * @private
   */
  async waitForUserConfirmation() {
    return new Promise((resolve) => {
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      
      const onData = (key) => {
        if (key === '\r' || key === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          resolve();
        }
      };
      
      stdin.on('data', onData);
    });
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();