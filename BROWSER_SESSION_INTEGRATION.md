# Browser Session Integration Guide

This guide explains how the browser session service is integrated with Promotly to provide persistent, secure social media authentication.

## Overview

The browser session system replaces cookie-based authentication with a more reliable Python Playwright service that manages persistent browser sessions. This provides better security, reliability, and bypasses many API limitations.

## Architecture

### Components

1. **Python Browser Session Service** (`browser_session_service.py`)
   - FastAPI service running on port 8000
   - Uses Playwright for browser automation
   - Encrypts session data with Fernet encryption
   - Manages persistent browser profiles per user/platform

2. **Node.js Client** (`server/services/browser-session-client.ts`)
   - HTTP client that communicates with the Python service
   - Provides TypeScript interfaces for the frontend
   - Handles error management and retries

3. **Frontend Integration** (`client/src/pages/social-accounts.tsx`)
   - New "Browser Session" tab in social accounts page
   - User-friendly workflow for session creation
   - Real-time status updates and instructions

4. **Backend Routes** (`server/routes.ts`)
   - API endpoints for browser session operations
   - Integrates with existing social account management
   - Supports session validation and cleanup

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements-browser-service.txt
playwright install chromium
```

### 2. Start Browser Session Service

```bash
python browser_session_service.py
```

The service will start on `http://localhost:8000` with these endpoints:
- `POST /create-session` - Create new browser session
- `POST /confirm-login/{user_id}/{site_name}` - Confirm manual login
- `POST /execute-action` - Execute automated actions
- `GET /sessions` - List all sessions
- `DELETE /sessions/{user_id}/{site_name}` - Delete session

### 3. Environment Variables

The service uses these environment variables:
- `ENCRYPTION_KEY` - Fernet encryption key (auto-generated if missing)
- `SESSION_EXPIRY_DAYS` - Session expiry (default: 7 days)

## User Workflow

### Creating Browser Sessions

1. User selects "Browser Session" tab in Social Accounts
2. Clicks "Create Session" for desired platform
3. Browser window opens automatically for manual login
4. User completes normal login process
5. User confirms completion in Promotly interface
6. Session is encrypted and saved for future use

### Automated Posting

1. When scheduling posts, Promotly checks account authentication method
2. For `browser_session` accounts, posts are sent via Python service
3. Service validates session and executes posting action
4. Returns post ID and status for tracking

## Security Features

- **Encrypted Storage**: All session metadata encrypted with Fernet
- **File Permissions**: Session files stored with 600 permissions (owner only)
- **No Credential Storage**: Never stores actual passwords or tokens
- **Session Expiration**: Automatic cleanup of expired sessions
- **Isolated Profiles**: Each user gets separate browser context

## API Integration

### Social Media Service Updates

The `SocialMediaService` class now includes:

```typescript
// Create browser session for user
async initializeBrowserSession(userId: number, platform: string)

// Confirm manual login completion
async confirmBrowserSession(userId: number, platform: string)

// Post using browser session
async postWithBrowserSession(post: Post, account: SocialAccount)

// Validate existing session
async validateBrowserSession(userId: number, platform: string)

// Manage sessions
async listBrowserSessions(userId: number)
async deleteBrowserSession(userId: number, platform: string)
```

### Database Schema

Social accounts now support `authMethod: 'browser_session'`:

```sql
-- Social account with browser session authentication
{
  "userId": 123,
  "platform": "twitter",
  "accountId": "browser_123_twitter",
  "accountName": "username",
  "authMethod": "browser_session",
  "accessToken": null,
  "cookies": null
}
```

## Benefits Over Cookie Authentication

1. **More Reliable**: Persistent browser sessions don't break like cookies
2. **Better Security**: Encrypted session storage and no credential exposure
3. **Platform Independent**: Works consistently across all social platforms
4. **Rate Limit Bypass**: Uses browser automation instead of APIs
5. **Future Proof**: Less likely to break with platform updates

## Troubleshooting

### Service Not Starting
- Check Python dependencies are installed
- Verify Playwright browsers are installed: `playwright install`
- Check port 8000 is available

### Sessions Not Working
- Verify browser service is running on localhost:8000
- Check session hasn't expired (7-day default)
- Ensure platform login was completed successfully

### Connection Issues
- Verify firewall allows connections to port 8000
- Check browser session service logs for errors
- Validate account credentials manually

## Development Notes

### Testing
Run the example client to test the service:
```bash
python browser_client_example.py
```

### Extending Platforms
To add new platforms:
1. Add platform URLs to `loginUrls` in browser session client
2. Implement platform-specific actions in Python service
3. Add platform to frontend platform list

### Monitoring
The service provides:
- Health check endpoint: `GET /health`
- Session listing: `GET /sessions`
- Automatic cleanup of expired sessions

This integration provides a robust, secure foundation for social media automation that works reliably across platforms.