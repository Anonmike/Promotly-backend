import { sessionManager, automation } from './index.js';

/**
 * Demonstration Script for Playwright Browser Automation
 * 
 * This script shows how to use the new Playwright-based automation system
 * to replace the cookie-based authentication approach.
 */

async function demonstrateLinkedInAutomation() {
  const userId = 'demo-user';
  const loginUrl = 'https://www.linkedin.com/login';
  
  console.log('🎭 LinkedIn Automation Demo');
  console.log('===========================\n');
  
  try {
    // Check if user already has a session
    const hasSession = await sessionManager.hasExistingSession(userId);
    
    if (!hasSession) {
      console.log('📋 No existing session found for demo user');
      console.log('🔄 To create a session, run:');
      console.log(`   node index.js onboard ${userId} ${loginUrl}`);
      console.log('\n⚠️  This will open a browser window where you can manually log in');
      console.log('   Once logged in, press Enter to save the session');
      console.log('\n🤖 After onboarding, you can run automated actions with:');
      console.log(`   node index.js automate ${userId}`);
      return;
    }
    
    console.log('✅ Found existing session for demo user');
    console.log('🚀 Running automated LinkedIn action...\n');
    
    // Perform automated LinkedIn action
    const result = await automation.performLinkedInAction(userId);
    
    console.log('📊 Automation Results:');
    console.log('======================');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ LinkedIn automation completed successfully!');
      if (result.screenshotPath) {
        console.log(`📸 Screenshot saved to: ${result.screenshotPath}`);
      }
      if (result.userName) {
        console.log(`👤 Detected user: ${result.userName}`);
      }
    } else {
      console.log('\n❌ LinkedIn automation failed');
      console.log('🔄 You may need to refresh the session:');
      console.log(`   node index.js onboard ${userId} ${loginUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Demo error:', error.message);
  }
}

async function demonstrateSessionManagement() {
  console.log('\n🔧 Session Management Demo');
  console.log('===========================\n');
  
  try {
    // List all sessions
    const sessions = await sessionManager.listSessions();
    console.log(`📋 Found ${sessions.length} existing sessions:`);
    
    if (sessions.length === 0) {
      console.log('   (No sessions found)');
    } else {
      sessions.forEach((userId, index) => {
        console.log(`   ${index + 1}. ${userId}`);
      });
    }
    
    // Validate sessions
    console.log('\n🔍 Validating sessions...');
    for (const userId of sessions) {
      try {
        console.log(`   Checking ${userId}...`);
        const result = await automation.validateSession(userId);
        const status = result.success && result.isValid ? '✅ Valid' : '❌ Invalid';
        console.log(`   ${status}: ${userId}`);
      } catch (error) {
        console.log(`   ❌ Error: ${userId} - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Session management demo error:', error.message);
  }
}

async function demonstrateCustomAutomation() {
  const userId = 'demo-user';
  
  console.log('\n🛠️  Custom Automation Demo');
  console.log('===========================\n');
  
  try {
    const hasSession = await sessionManager.hasExistingSession(userId);
    
    if (!hasSession) {
      console.log('📋 No session found for custom automation demo');
      console.log('🔄 Create a session first with onboarding');
      return;
    }
    
    console.log('🎯 Running custom automation example...');
    
    // Custom automation example
    const result = await automation.performCustomAction(userId, async (page) => {
      // Navigate to LinkedIn profile edit page
      await page.goto('https://www.linkedin.com/in/me/');
      await page.waitForTimeout(2000);
      
      // Extract profile information
      const profileData = {};
      
      try {
        // Get profile headline
        const headline = await page.$eval('.text-body-medium', el => el.textContent?.trim());
        profileData.headline = headline;
      } catch (error) {
        profileData.headline = 'Not found';
      }
      
      try {
        // Get profile name
        const name = await page.$eval('h1', el => el.textContent?.trim());
        profileData.name = name;
      } catch (error) {
        profileData.name = 'Not found';
      }
      
      return {
        url: page.url(),
        title: await page.title(),
        profileData
      };
    });
    
    console.log('📊 Custom Automation Results:');
    console.log('==============================');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Custom automation demo error:', error.message);
  }
}

async function showIntegrationExample() {
  console.log('\n🔗 Integration Example');
  console.log('======================\n');
  
  console.log('Here\'s how to integrate this with your existing social media scheduler:\n');
  
  console.log('// Replace cookie-based authentication with Playwright sessions');
  console.log('import { sessionManager, automation } from "./index.js";');
  console.log('');
  console.log('// In your social media service:');
  console.log('async function postToLinkedIn(userId, content) {');
  console.log('  // Check if user has valid session');
  console.log('  const hasSession = await sessionManager.hasExistingSession(userId);');
  console.log('  if (!hasSession) {');
  console.log('    throw new Error("User needs to complete onboarding first");');
  console.log('  }');
  console.log('  ');
  console.log('  // Use custom automation to post');
  console.log('  const result = await automation.performCustomAction(userId, async (page) => {');
  console.log('    await page.goto("https://www.linkedin.com/feed/");');
  console.log('    ');
  console.log('    // Click start post button');
  console.log('    await page.click(\'.share-box-feed-entry__trigger\');');
  console.log('    ');
  console.log('    // Type content');
  console.log('    await page.fill(\'.ql-editor\', content);');
  console.log('    ');
  console.log('    // Click post button');
  console.log('    await page.click(\'[data-control-name="publish_post"]\');');
  console.log('    ');
  console.log('    return { success: true, posted: true };');
  console.log('  });');
  console.log('  ');
  console.log('  return result;');
  console.log('}');
  console.log('');
  console.log('// Benefits of this approach:');
  console.log('// - No need to handle cookies manually');
  console.log('// - Each user has isolated browser session');
  console.log('// - Can handle complex authentication flows');
  console.log('// - Works with any website, not just APIs');
  console.log('// - Persistent sessions between application restarts');
}

async function runFullDemo() {
  console.log('🎭 Playwright Browser Automation - Full Demo');
  console.log('=============================================\n');
  
  await demonstrateLinkedInAutomation();
  await demonstrateSessionManagement();
  await demonstrateCustomAutomation();
  await showIntegrationExample();
  
  console.log('\n🎉 Demo completed!');
  console.log('\n📚 Next Steps:');
  console.log('1. Run: node index.js onboard <userId> <loginUrl>');
  console.log('2. Run: node index.js automate <userId>');
  console.log('3. Integrate with your existing social media scheduler');
  console.log('4. Replace cookie-based auth with Playwright sessions');
  
  // Clean up
  await sessionManager.closeAllSessions();
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullDemo().catch(console.error);
}

export { 
  demonstrateLinkedInAutomation, 
  demonstrateSessionManagement, 
  demonstrateCustomAutomation, 
  showIntegrationExample,
  runFullDemo 
};