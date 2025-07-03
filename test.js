import { sessionManager } from './sessionManager.js';
import { automation } from './automation.js';

/**
 * Test script to verify Playwright installation and basic functionality
 */

async function testPlaywrightInstallation() {
  console.log('🧪 Testing Playwright installation...');
  
  try {
    // Test basic browser launch
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://www.example.com');
    const title = await page.title();
    
    await browser.close();
    
    console.log('✅ Playwright installation verified');
    console.log(`📄 Test page title: ${title}`);
    return true;
  } catch (error) {
    console.error('❌ Playwright installation failed:', error.message);
    return false;
  }
}

async function testSessionManager() {
  console.log('🧪 Testing SessionManager...');
  
  try {
    // Test session directory creation
    await sessionManager.ensureSessionsDirectory();
    
    // Test session listing
    const sessions = await sessionManager.listSessions();
    console.log(`📋 Found ${sessions.length} existing sessions`);
    
    // Test session existence check
    const hasSession = await sessionManager.hasExistingSession('test-user');
    console.log(`🔍 Test user session exists: ${hasSession}`);
    
    console.log('✅ SessionManager tests passed');
    return true;
  } catch (error) {
    console.error('❌ SessionManager tests failed:', error.message);
    return false;
  }
}

async function testAutomation() {
  console.log('🧪 Testing Automation (without session)...');
  
  try {
    // Test automation with non-existent session (should fail gracefully)
    const result = await automation.validateSession('non-existent-user');
    
    if (!result.success) {
      console.log('✅ Automation correctly handled missing session');
      return true;
    } else {
      console.log('⚠️  Unexpected success with missing session');
      return false;
    }
  } catch (error) {
    // This is expected for missing sessions
    console.log('✅ Automation correctly threw error for missing session');
    return true;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive tests...\n');
  
  const tests = [
    { name: 'Playwright Installation', fn: testPlaywrightInstallation },
    { name: 'Session Manager', fn: testSessionManager },
    { name: 'Automation Engine', fn: testAutomation }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const passed = await test.fn();
    results.push({ name: test.name, passed });
  }
  
  console.log('\n🏁 Test Results:');
  console.log('================');
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Summary: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! The system is ready for use.');
    console.log('\n📖 Next steps:');
    console.log('1. Run onboarding: node index.js onboard <userId> <loginUrl>');
    console.log('2. Perform automation: node index.js automate <userId>');
  } else {
    console.log('⚠️  Some tests failed. Please check the installation.');
  }
  
  // Clean up
  await sessionManager.closeAllSessions();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testPlaywrightInstallation, testSessionManager, testAutomation };