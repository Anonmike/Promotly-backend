import { sessionManager } from './sessionManager.js';
import { automation } from './automation.js';

/**
 * Main Entry Point for Playwright Browser Automation
 * 
 * This module provides examples and utilities for managing browser sessions
 * and performing automated actions using Playwright with persistent contexts.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install dependencies: npm install playwright
 * 2. Install Chromium: npx playwright install chromium
 * 3. Run onboarding: node index.js onboard <userId> <loginUrl>
 * 4. Run automation: node index.js automate <userId>
 * 
 * USAGE EXAMPLES:
 * 
 * # Start onboarding for LinkedIn
 * node index.js onboard user123 https://www.linkedin.com/login
 * 
 * # Perform automated LinkedIn action
 * node index.js automate user123
 * 
 * # Validate existing session
 * node index.js validate user123
 * 
 * # List all sessions
 * node index.js list
 * 
 * # Delete a session
 * node index.js delete user123
 */

/**
 * Handle onboarding process
 * Opens browser for manual login and saves session
 */
async function handleOnboarding(userId, loginUrl) {
  console.log(`🚀 Starting onboarding process...`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`🔗 Login URL: ${loginUrl}`);
  
  try {
    // Check if session already exists
    const existingSession = await sessionManager.hasExistingSession(userId);
    if (existingSession) {
      console.log(`⚠️  Session already exists for user: ${userId}`);
      console.log(`🔄 Use 'node index.js validate ${userId}' to check if it's still valid`);
      console.log(`🗑️  Use 'node index.js delete ${userId}' to remove it and start fresh`);
      return;
    }

    // Start onboarding session
    const success = await sessionManager.startOnboardingSession(userId, loginUrl);
    
    if (success) {
      console.log(`\n🎉 Onboarding completed successfully!`);
      console.log(`✅ Session saved for user: ${userId}`);
      console.log(`🤖 You can now run automated actions with:`);
      console.log(`   node index.js automate ${userId}`);
    } else {
      console.log(`❌ Onboarding failed for user: ${userId}`);
    }
    
  } catch (error) {
    console.error(`❌ Onboarding error:`, error.message);
  }
}

/**
 * Handle automation actions
 * Performs automated actions using saved session
 */
async function handleAutomation(userId, actionType = 'linkedin') {
  console.log(`🤖 Starting automation for user: ${userId}`);
  
  try {
    // Check if session exists
    const sessionExists = await sessionManager.hasExistingSession(userId);
    if (!sessionExists) {
      console.log(`❌ No session found for user: ${userId}`);
      console.log(`🔄 Run onboarding first: node index.js onboard ${userId} <loginUrl>`);
      return;
    }

    let result;
    
    switch (actionType) {
      case 'linkedin':
        result = await automation.performLinkedInAction(userId);
        break;
      case 'generic':
        result = await automation.performGenericAction(userId, 'https://www.example.com', {
          takeScreenshot: true,
          textSelector: 'h1'
        });
        break;
      default:
        result = await automation.performLinkedInAction(userId);
    }
    
    console.log(`\n📊 Automation Results:`);
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`❌ Automation error:`, error.message);
  }
}

/**
 * Validate a session
 * Checks if saved session is still valid
 */
async function handleValidation(userId) {
  console.log(`🔍 Validating session for user: ${userId}`);
  
  try {
    const result = await automation.validateSession(userId);
    
    console.log(`\n📊 Validation Results:`);
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.isValid) {
      console.log(`✅ Session is valid and ready for automation`);
    } else if (result.success && !result.isValid) {
      console.log(`❌ Session appears to be expired or invalid`);
      console.log(`🔄 Consider running onboarding again`);
    } else {
      console.log(`❌ Validation failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Validation error:`, error.message);
  }
}

/**
 * List all existing sessions
 */
async function handleList() {
  console.log(`📋 Listing all sessions...`);
  
  try {
    const sessions = await sessionManager.listSessions();
    
    if (sessions.length === 0) {
      console.log(`📭 No sessions found`);
      console.log(`🔄 Create a session with: node index.js onboard <userId> <loginUrl>`);
    } else {
      console.log(`📊 Found ${sessions.length} session(s):`);
      sessions.forEach((userId, index) => {
        console.log(`  ${index + 1}. ${userId}`);
      });
    }
    
  } catch (error) {
    console.error(`❌ List error:`, error.message);
  }
}

/**
 * Delete a session
 */
async function handleDelete(userId) {
  console.log(`🗑️  Deleting session for user: ${userId}`);
  
  try {
    const sessionExists = await sessionManager.hasExistingSession(userId);
    if (!sessionExists) {
      console.log(`❌ No session found for user: ${userId}`);
      return;
    }
    
    await sessionManager.deleteSession(userId);
    console.log(`✅ Session deleted successfully for user: ${userId}`);
    
  } catch (error) {
    console.error(`❌ Delete error:`, error.message);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🎭 Playwright Browser Automation Tool

COMMANDS:
  onboard <userId> <loginUrl>  - Start onboarding process for manual login
  automate <userId> [action]   - Perform automated action (default: linkedin)
  validate <userId>            - Check if session is still valid
  list                        - List all existing sessions
  delete <userId>             - Delete a specific session
  help                        - Show this help message

EXAMPLES:
  # LinkedIn onboarding
  node index.js onboard user123 https://www.linkedin.com/login

  # Twitter onboarding
  node index.js onboard user456 https://twitter.com/login

  # Facebook onboarding
  node index.js onboard user789 https://www.facebook.com/login

  # Run LinkedIn automation
  node index.js automate user123

  # Run generic automation
  node index.js automate user123 generic

  # Validate session
  node index.js validate user123

  # List all sessions
  node index.js list

  # Delete session
  node index.js delete user123

WORKFLOW:
  1. First, run onboarding to manually log in and save session
  2. Then, run automation to perform actions using saved session
  3. Use validation to check if session is still working
  4. Use delete to remove expired or unwanted sessions

NOTES:
  - Sessions are saved in ./user_sessions/<userId>/ directories
  - Onboarding runs in visible browser mode for manual login
  - Automation runs in headless mode for automated actions
  - Each user gets an isolated browser context
  - Sessions persist between script runs
  `);
}

/**
 * Main function - handles command line arguments
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'onboard':
        if (args.length < 3) {
          console.log(`❌ Usage: node index.js onboard <userId> <loginUrl>`);
          console.log(`📝 Example: node index.js onboard user123 https://www.linkedin.com/login`);
          return;
        }
        await handleOnboarding(args[1], args[2]);
        break;
        
      case 'automate':
        if (args.length < 2) {
          console.log(`❌ Usage: node index.js automate <userId> [actionType]`);
          console.log(`📝 Example: node index.js automate user123`);
          return;
        }
        await handleAutomation(args[1], args[2]);
        break;
        
      case 'validate':
        if (args.length < 2) {
          console.log(`❌ Usage: node index.js validate <userId>`);
          console.log(`📝 Example: node index.js validate user123`);
          return;
        }
        await handleValidation(args[1]);
        break;
        
      case 'list':
        await handleList();
        break;
        
      case 'delete':
        if (args.length < 2) {
          console.log(`❌ Usage: node index.js delete <userId>`);
          console.log(`📝 Example: node index.js delete user123`);
          return;
        }
        await handleDelete(args[1]);
        break;
        
      case 'help':
        showHelp();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
    }
    
  } catch (error) {
    console.error(`❌ Fatal error:`, error.message);
  } finally {
    // Clean up any remaining sessions
    await sessionManager.closeAllSessions();
    process.exit(0);
  }
}

/**
 * Handle process termination gracefully
 */
process.on('SIGINT', async () => {
  console.log(`\n🛑 Received SIGINT, closing all sessions...`);
  await sessionManager.closeAllSessions();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`\n🛑 Received SIGTERM, closing all sessions...`);
  await sessionManager.closeAllSessions();
  process.exit(0);
});

// Export functions for programmatic use
export {
  handleOnboarding,
  handleAutomation,
  handleValidation,
  handleList,
  handleDelete,
  sessionManager,
  automation
};

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}