import { sessionManager } from './sessionManager.js';

/**
 * Automation Module for Playwright Browser Actions
 * 
 * This module provides functions to perform automated actions using
 * previously saved browser sessions. All actions run in headless mode.
 */
export class AutomationEngine {
  constructor() {
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Navigate to LinkedIn home and extract profile information
   * This is a sample action that demonstrates session usage
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Profile information and page title
   */
  async performLinkedInAction(userId) {
    console.log(`🔄 Performing LinkedIn action for user: ${userId}`);
    
    let session = null;
    
    try {
      // Load the saved session
      session = await sessionManager.loadSession(userId);
      const { browser, context } = session;

      // Create new page
      const page = await context.newPage();
      
      // Navigate to LinkedIn home
      console.log(`🌐 Navigating to LinkedIn home...`);
      await page.goto('https://www.linkedin.com/feed/', { 
        waitUntil: 'networkidle',
        timeout: this.defaultTimeout 
      });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Extract page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);

      // Try to extract user's name (if available)
      let userName = null;
      try {
        // Look for common LinkedIn selectors for user name
        const nameSelectors = [
          '[data-test-id="identity-name"]',
          '.global-nav__me-photo',
          '[data-control-name="identity_profile_photo"]'
        ];
        
        for (const selector of nameSelectors) {
          const element = await page.$(selector);
          if (element) {
            userName = await element.getAttribute('alt') || await element.textContent();
            break;
          }
        }
      } catch (error) {
        console.log(`ℹ️ Could not extract user name: ${error.message}`);
      }

      // Take a screenshot for verification
      const screenshotPath = `./user_sessions/${userId}/linkedin_screenshot.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Check if we're actually logged in by looking for login indicators
      const isLoggedIn = await this.checkLinkedInLoginStatus(page);

      const result = {
        success: true,
        userId,
        pageTitle: title,
        userName,
        isLoggedIn,
        screenshotPath,
        currentUrl: page.url(),
        timestamp: new Date().toISOString()
      };

      console.log(`✅ LinkedIn action completed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Error performing LinkedIn action:`, error);
      
      const result = {
        success: false,
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      return result;
    } finally {
      // Always close the session when done
      if (session) {
        await sessionManager.closeSession(userId);
      }
    }
  }

  /**
   * Generic web scraping action
   * Navigate to any URL and extract basic information
   * 
   * @param {string} userId - User identifier
   * @param {string} url - Target URL
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Extracted information
   */
  async performGenericAction(userId, url, options = {}) {
    console.log(`🔄 Performing generic action for user: ${userId} on ${url}`);
    
    let session = null;
    
    try {
      // Load the saved session
      session = await sessionManager.loadSession(userId);
      const { browser, context } = session;

      // Create new page
      const page = await context.newPage();
      
      // Navigate to target URL
      console.log(`🌐 Navigating to: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.defaultTimeout 
      });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Extract basic information
      const title = await page.title();
      const currentUrl = page.url();
      
      // Extract text content if selector provided
      let extractedText = null;
      if (options.textSelector) {
        try {
          const element = await page.$(options.textSelector);
          if (element) {
            extractedText = await element.textContent();
          }
        } catch (error) {
          console.log(`ℹ️ Could not extract text with selector ${options.textSelector}: ${error.message}`);
        }
      }

      // Take screenshot if requested
      let screenshotPath = null;
      if (options.takeScreenshot) {
        screenshotPath = `./user_sessions/${userId}/screenshot_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: options.fullPageScreenshot || false });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      }

      const result = {
        success: true,
        userId,
        pageTitle: title,
        currentUrl,
        extractedText,
        screenshotPath,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Generic action completed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Error performing generic action:`, error);
      
      const result = {
        success: false,
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      return result;
    } finally {
      // Always close the session when done
      if (session) {
        await sessionManager.closeSession(userId);
      }
    }
  }

  /**
   * Perform a custom action with a user-provided function
   * This allows for flexible automation while maintaining session management
   * 
   * @param {string} userId - User identifier
   * @param {Function} actionFunction - Custom function to execute (receives page as parameter)
   * @returns {Promise<Object>} Result of the action
   */
  async performCustomAction(userId, actionFunction) {
    console.log(`🔄 Performing custom action for user: ${userId}`);
    
    let session = null;
    
    try {
      // Load the saved session
      session = await sessionManager.loadSession(userId);
      const { browser, context } = session;

      // Create new page
      const page = await context.newPage();
      
      // Execute the custom function
      const result = await actionFunction(page);

      console.log(`✅ Custom action completed successfully`);
      return {
        success: true,
        userId,
        result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error performing custom action:`, error);
      
      return {
        success: false,
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      // Always close the session when done
      if (session) {
        await sessionManager.closeSession(userId);
      }
    }
  }

  /**
   * Check if user is logged into LinkedIn
   * @private
   * @param {Page} page - Playwright page object
   * @returns {Promise<boolean>} True if logged in
   */
  async checkLinkedInLoginStatus(page) {
    try {
      // Check for LinkedIn login indicators
      const loginIndicators = [
        '.global-nav__me', // Profile menu
        '[data-control-name="identity_profile_photo"]', // Profile photo
        '.global-nav__primary-link--me' // Me link
      ];

      for (const selector of loginIndicators) {
        const element = await page.$(selector);
        if (element) {
          return true;
        }
      }

      // Check if we're on login page (indicates not logged in)
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        return false;
      }

      return false;
    } catch (error) {
      console.log(`ℹ️ Could not determine login status: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate that a session is still working
   * This can be used to check if cookies/session have expired
   * 
   * @param {string} userId - User identifier
   * @param {string} testUrl - URL to test (defaults to LinkedIn)
   * @returns {Promise<Object>} Validation result
   */
  async validateSession(userId, testUrl = 'https://www.linkedin.com/feed/') {
    console.log(`🔍 Validating session for user: ${userId}`);
    
    let session = null;
    
    try {
      // Load the saved session
      session = await sessionManager.loadSession(userId);
      const { browser, context } = session;

      // Create new page
      const page = await context.newPage();
      
      // Navigate to test URL
      await page.goto(testUrl, { 
        waitUntil: 'networkidle',
        timeout: this.defaultTimeout 
      });

      const currentUrl = page.url();
      const title = await page.title();
      
      // Check if we're redirected to login (indicates session expired)
      const isValid = !currentUrl.includes('/login') && !currentUrl.includes('/signin');

      const result = {
        success: true,
        userId,
        isValid,
        currentUrl,
        pageTitle: title,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Session validation completed - Valid: ${isValid}`);
      return result;

    } catch (error) {
      console.error(`❌ Error validating session:`, error);
      
      return {
        success: false,
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      // Always close the session when done
      if (session) {
        await sessionManager.closeSession(userId);
      }
    }
  }
}

// Export singleton instance
export const automation = new AutomationEngine();