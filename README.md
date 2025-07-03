# Playwright Browser Automation with Persistent Sessions

A Node.js backend project that provides browser automation capabilities using Playwright with persistent Chromium sessions. Each user gets their own isolated browser context that persists between sessions, allowing for manual login followed by automated actions.

## Features

- **Persistent Browser Sessions**: Each user gets a unique browser context saved to disk
- **Manual Login Support**: Non-headless mode for manual authentication
- **Automated Actions**: Headless mode for scripted interactions
- **Session Management**: Create, validate, list, and delete user sessions
- **Error Handling**: Comprehensive error handling and session cleanup
- **Modular Architecture**: Clean separation of concerns across multiple modules

## Project Structure

```
├── sessionManager.js    # Manages persistent browser sessions
├── automation.js        # Performs automated actions using saved sessions
├── index.js            # Main entry point with CLI interface
├── user_sessions/      # Directory containing user session data
│   ├── user1/          # Browser context for user1
│   ├── user2/          # Browser context for user2
│   └── ...
└── README.md           # This documentation
```

## Installation

1. Install dependencies:
```bash
npm install playwright
```

2. Install Chromium browser:
```bash
npx playwright install chromium
```

## Usage

### Command Line Interface

The project provides a comprehensive CLI for managing browser sessions:

```bash
# Show help
node index.js help

# Start onboarding for LinkedIn
node index.js onboard user123 https://www.linkedin.com/login

# Start onboarding for other platforms
node index.js onboard user456 https://twitter.com/login
node index.js onboard user789 https://www.facebook.com/login

# Perform automated actions
node index.js automate user123

# Validate existing session
node index.js validate user123

# List all sessions
node index.js list

# Delete a session
node index.js delete user123
```

### Typical Workflow

1. **Onboarding**: Run the onboarding process to manually log in
   ```bash
   node index.js onboard myuser https://www.linkedin.com/login
   ```
   - Browser opens in visible mode
   - User manually completes login process
   - Press Enter in terminal when done
   - Session is saved for future use

2. **Automation**: Use the saved session for automated actions
   ```bash
   node index.js automate myuser
   ```
   - Browser runs in headless mode
   - Automated actions are performed
   - Results are displayed

3. **Validation**: Check if session is still valid
   ```bash
   node index.js validate myuser
   ```
   - Tests if saved session still works
   - Indicates if re-authentication is needed

## API Reference

### SessionManager Class

The `SessionManager` class handles all session-related operations:

#### Methods

- `startOnboardingSession(userId, loginUrl)`: Start manual login process
- `loadSession(userId)`: Load existing session for automation
- `hasExistingSession(userId)`: Check if user has saved session
- `closeSession(userId)`: Close active session
- `closeAllSessions()`: Close all active sessions
- `deleteSession(userId)`: Delete session data
- `listSessions()`: Get list of all saved sessions

#### Example Usage

```javascript
import { sessionManager } from './sessionManager.js';

// Start onboarding
await sessionManager.startOnboardingSession('user123', 'https://www.linkedin.com/login');

// Load session for automation
const { browser, context } = await sessionManager.loadSession('user123');

// Clean up
await sessionManager.closeSession('user123');
```

### AutomationEngine Class

The `AutomationEngine` class provides methods for automated actions:

#### Methods

- `performLinkedInAction(userId)`: LinkedIn-specific automation
- `performGenericAction(userId, url, options)`: Generic web automation
- `performCustomAction(userId, actionFunction)`: Custom automation with user-defined function
- `validateSession(userId, testUrl)`: Validate session functionality

#### Example Usage

```javascript
import { automation } from './automation.js';

// Perform LinkedIn automation
const result = await automation.performLinkedInAction('user123');

// Perform generic automation
const result = await automation.performGenericAction('user123', 'https://example.com', {
  takeScreenshot: true,
  textSelector: 'h1'
});

// Custom automation
const result = await automation.performCustomAction('user123', async (page) => {
  await page.goto('https://example.com');
  const title = await page.title();
  return { title };
});
```

## Configuration

### Browser Settings

The project uses the following Chromium configuration:

- **User Data Directory**: `./user_sessions/{userId}`
- **Viewport**: 1280x720
- **User Agent**: Chrome 120 on Windows
- **Args**: Optimized for Replit environment

### Session Storage

Sessions are stored in the `user_sessions` directory:
- Each user gets a unique subdirectory
- All cookies, localStorage, and other session data is preserved
- Sessions persist between script runs

## Error Handling

The project includes comprehensive error handling:

- **Missing Sessions**: Clear error messages when sessions don't exist
- **Expired Sessions**: Detection and reporting of invalid sessions
- **Browser Errors**: Graceful handling of browser crashes
- **Network Issues**: Timeout and retry logic
- **Cleanup**: Automatic cleanup of resources on errors

## Security Considerations

- **Isolated Sessions**: Each user has completely isolated browser context
- **No Data Sharing**: Sessions cannot access each other's data
- **Local Storage**: All session data is stored locally
- **Process Cleanup**: Proper cleanup of browser processes

## Replit Integration

The project is optimized for Replit environment:

- **Node.js 18+**: Uses modern JavaScript features
- **ES Modules**: Modern import/export syntax
- **Process Management**: Proper handling of Replit's process lifecycle
- **Resource Management**: Efficient use of memory and CPU

## Troubleshooting

### Common Issues

1. **Browser Installation**: If Chromium is not installed, run:
   ```bash
   npx playwright install chromium
   ```

2. **Permission Errors**: Ensure write permissions for `user_sessions` directory

3. **Session Expired**: If automation fails, validate the session:
   ```bash
   node index.js validate username
   ```

4. **Browser Crashes**: Check system resources and restart the process

### Debug Mode

For debugging, you can modify the browser launch options in `sessionManager.js`:

```javascript
// Add debugging options
const browser = await chromium.launchPersistentContext(userDataDir, {
  headless: false,  // Make visible for debugging
  devtools: true,   // Open DevTools
  slowMo: 1000,     // Add delay between actions
  // ... other options
});
```

## Performance Considerations

- **Memory Usage**: Each browser context uses ~50-100MB memory
- **Disk Space**: Session data typically uses 10-50MB per user
- **Concurrent Sessions**: Limit concurrent sessions based on system resources
- **Cleanup**: Regularly clean up unused sessions

## License

This project is provided as-is for educational and development purposes.

## Contributing

Feel free to submit issues and enhancement requests. The modular architecture makes it easy to extend functionality.