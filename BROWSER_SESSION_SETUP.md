# Browser Session Service Setup Guide

A Python service for managing persistent browser sessions using Playwright, replacing cookie-based authentication with secure browser profile sessions.

## Features

- **Persistent Browser Sessions**: Each user gets a unique, encrypted browser profile stored on disk
- **Manual Login Support**: Opens browser for user to login manually, then saves the authenticated session
- **Automated Actions**: Execute actions using saved sessions without re-authentication
- **Security**: Sessions are encrypted and stored with restricted file permissions
- **Session Management**: List, validate, and clean up expired sessions
- **Modular Design**: Easily extendable to support different websites

## Installation

### 1. Install Python Dependencies

```bash
# Install required packages
pip install -r requirements-browser-service.txt

# Install Playwright browsers
playwright install chromium
```

### 2. System Requirements (Linux)

```bash
# Install system dependencies for Playwright
sudo apt-get update
sudo apt-get install -y \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2
```

### 3. Start the Service

```bash
# Run the browser session service
python browser_session_service.py

# Or with custom host/port
uvicorn browser_session_service:app --host 0.0.0.0 --port 8000 --reload
```

The service will start on `http://localhost:8000`

## Usage Guide

### 1. Onboarding Process (Manual Login)

Create a new session for a user to login to a site:

```python
import aiohttp
import asyncio

async def onboard_user():
    async with aiohttp.ClientSession() as session:
        # Step 1: Create session
        async with session.post("http://localhost:8000/create-session", json={
            "user_id": "user123",
            "site_name": "linkedin", 
            "login_url": "https://www.linkedin.com/login"
        }) as response:
            result = await response.json()
            print(result["message"])
        
        # Step 2: User completes login manually in opened browser
        input("Complete login in browser, then press Enter...")
        
        # Step 3: Confirm login completion
        async with session.post("http://localhost:8000/confirm-login/user123/linkedin") as response:
            result = await response.json()
            print(f"Session saved: {result['session_saved']}")

asyncio.run(onboard_user())
```

### 2. Execute Automated Actions

Use saved sessions for automation:

```python
async def automate_actions():
    async with aiohttp.ClientSession() as session:
        # Get profile information
        async with session.post("http://localhost:8000/execute-action", json={
            "user_id": "user123",
            "site_name": "linkedin",
            "action_type": "get_profile",
            "action_data": {"profile_url": "https://www.linkedin.com/feed/"}
        }) as response:
            result = await response.json()
            print(f"Page title: {result['result']['page_title']}")
        
        # Take screenshot
        async with session.post("http://localhost:8000/execute-action", json={
            "user_id": "user123", 
            "site_name": "linkedin",
            "action_type": "screenshot"
        }) as response:
            result = await response.json()
            print(f"Screenshot: {result['result']['screenshot_path']}")

asyncio.run(automate_actions())
```

### 3. Session Management

```python
# List all sessions
async with aiohttp.ClientSession() as session:
    async with session.get("http://localhost:8000/sessions") as response:
        result = await response.json()
        for s in result['sessions']:
            print(f"{s['user_id']}:{s['site_name']} - Valid: {s['is_valid']}")

# Delete a session
async with aiohttp.ClientSession() as session:
    async with session.delete("http://localhost:8000/sessions/user123/linkedin") as response:
        result = await response.json()
        print(result['message'])
```

## API Endpoints

### POST `/create-session`
Create new session for manual login
```json
{
  "user_id": "user123",
  "site_name": "linkedin", 
  "login_url": "https://www.linkedin.com/login"
}
```

### POST `/confirm-login/{user_id}/{site_name}`
Confirm manual login completion and save session

### POST `/execute-action`
Execute automated action using saved session
```json
{
  "user_id": "user123",
  "site_name": "linkedin",
  "action_type": "get_profile",
  "action_data": {"profile_url": "https://www.linkedin.com/feed/"}
}
```

### GET `/sessions?user_id=user123`
List sessions (optionally filter by user)

### DELETE `/sessions/{user_id}/{site_name}`
Delete a specific session

### GET `/health`
Health check endpoint

## Available Actions

### `get_profile`
- Navigate to profile page and extract basic information
- Parameters: `profile_url` (optional)

### `screenshot` 
- Take screenshot of current page
- Returns: `screenshot_path`

### `post_message`
- Post a message (implementation site-specific)
- Parameters: `message` (required)

## Security Features

- **Encryption**: All session metadata is encrypted using Fernet symmetric encryption
- **File Permissions**: Session files stored with restricted permissions (600)
- **Session Expiration**: Sessions automatically expire after 7 days
- **No Credential Logging**: Service never logs or exposes user credentials
- **Isolated Sessions**: Each user gets a unique, isolated browser profile

## Directory Structure

```
./user_sessions/
├── user123_abc123_linkedin/        # User session directory
│   ├── session_metadata.json       # Encrypted session metadata
│   └── [browser profile files]     # Chromium profile data
└── session_encryption.key          # Encryption key (auto-generated)
```

## Integration with Promotly

To integrate with your existing Promotly application:

1. **Replace Cookie Extraction**: Replace the existing cookie-based authentication with calls to this service
2. **User Onboarding**: Use the `/create-session` endpoint when users add new social accounts
3. **Automated Posting**: Use `/execute-action` for scheduled posts instead of cookie-based posting
4. **Session Management**: Add UI to list and manage user sessions

Example integration:

```javascript
// Replace existing cookie extraction
async function connectSocialAccount(userId, platform) {
  const response = await fetch('http://localhost:8000/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      site_name: platform,
      login_url: getPlatformLoginUrl(platform)
    })
  });
  
  // Open browser session, wait for user completion
  const result = await response.json();
  
  // After user completes login manually:
  await fetch(`http://localhost:8000/confirm-login/${userId}/${platform}`, {
    method: 'POST'
  });
}

// Replace existing posting logic
async function publishPost(userId, platform, content) {
  const response = await fetch('http://localhost:8000/execute-action', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      site_name: platform,
      action_type: 'post_message',
      action_data: { message: content }
    })
  });
  
  return await response.json();
}
```

## Extending to New Sites

To add support for new social media sites:

1. **Add Action Types**: Extend the `_perform_action` method in `BrowserSessionManager`
2. **Site-Specific Logic**: Implement posting/interaction logic for the new platform
3. **Login URLs**: Add appropriate login URLs for the platform
4. **Testing**: Test the onboarding and automation flow

Example for Twitter/X:

```python
async def _perform_action(self, page: Page, action_type: str, action_data: Dict) -> Dict:
    if action_type == "post_tweet" and "twitter" in page.url:
        tweet_text = action_data.get("message", "")
        
        # Navigate to compose tweet
        await page.goto("https://twitter.com/compose/tweet")
        await page.wait_for_selector('[data-testid="tweetTextarea_0"]')
        
        # Type tweet content
        await page.fill('[data-testid="tweetTextarea_0"]', tweet_text)
        
        # Click tweet button
        await page.click('[data-testid="tweetButton"]')
        
        return {"posted": True, "content": tweet_text}
```

## Production Considerations

- **Resource Management**: Monitor disk usage for session storage
- **Session Cleanup**: Run periodic cleanup of expired sessions
- **Scaling**: Consider running multiple service instances with shared storage
- **Monitoring**: Add logging and metrics for session usage
- **Backup**: Backup session encryption key securely