# Scalingo Deployment Guide

## Current Deployment Issue Fix

The deployment failure is likely due to several factors:

### 1. Playwright Browser Installation
The buildpack compilation fails because Playwright tries to download browsers during the build process. This is fixed by:
- Adding `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to environment variables
- The app will gracefully fall back to OAuth and cookie authentication methods

### 2. Build Process Optimization
The build process might be timing out due to large dependencies. To fix this:
- Set `NPM_CONFIG_PRODUCTION=false` to ensure devDependencies are installed
- Use Node.js version 20.18.0 specified in `.nvmrc`

### 3. Updated Configuration Files

#### scalingo.json
```json
{
  "formation": {
    "web": {
      "amount": 1,
      "size": "S"
    }
  },
  "env": {
    "NODE_ENV": "production",
    "NPM_CONFIG_PRODUCTION": "false",
    "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "1"
  },
  "scripts": {
    "postdeploy": "npm run db:push"
  },
  "buildpacks": [
    "https://github.com/Scalingo/nodejs-buildpack.git"
  ]
}
```

#### .nvmrc
```
20.18.0
```

### 4. Required Environment Variables

Set these in your Scalingo app settings:

**Database:**
- `DATABASE_URL` - Your PostgreSQL connection string

**Clerk Authentication:**
- `CLERK_SECRET_KEY` - Your Clerk secret key
- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key

**Optional (for enhanced social media features):**
- `TWITTER_CLIENT_ID` - Twitter/X API client ID
- `TWITTER_CLIENT_SECRET` - Twitter/X API client secret
- `FACEBOOK_APP_ID` - Facebook App ID
- `FACEBOOK_APP_SECRET` - Facebook App Secret
- `LINKEDIN_CLIENT_ID` - LinkedIn API client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn API client secret

### 5. Deployment Steps

1. **Configure Environment Variables:**
   ```bash
   scalingo env-set NODE_ENV=production
   scalingo env-set NPM_CONFIG_PRODUCTION=false
   scalingo env-set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
   scalingo env-set DATABASE_URL=your_database_url
   scalingo env-set CLERK_SECRET_KEY=your_clerk_secret
   scalingo env-set VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   ```

2. **Deploy:**
   ```bash
   git add .
   git commit -m "Fix Scalingo deployment configuration"
   git push scalingo main
   ```

### 6. Post-Deployment

After successful deployment:
- The database schema will be automatically created via the `postdeploy` script
- Users can authenticate using Clerk
- Social media posting will work via OAuth and cookie methods (browser automation will be disabled)

### 7. Troubleshooting

If deployment still fails:
1. Check logs: `scalingo logs`
2. Verify all environment variables are set
3. Ensure your database URL is correct and accessible
4. Check that the build process completes within Scalingo's timeout limits

The application is designed to work gracefully without browser automation, using the fallback authentication methods for social media posting.