# Scalingo Deployment Guide

## Issue Analysis
Your build is failing on Scalingo likely due to:
1. Large dependency size (470MB node_modules)
2. Complex build process with many UI components
3. Build timeout on Scalingo's servers

## Solution Steps

### 1. Environment Variables Required
Make sure these are set in your Scalingo environment:
- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
- `CLERK_SECRET_KEY` - Your Clerk secret key
- `DATABASE_URL` - Your PostgreSQL database URL
- `NODE_ENV=production`

### 2. Build Optimization
The project includes these files for optimal deployment:
- `Procfile` - Tells Scalingo how to start your app
- `.nvmrc` - Specifies Node.js version 20
- `scalingo.json` - Scalingo-specific configuration
- `.buildpacks` - Uses Node.js buildpack

### 3. Build Process
Your app builds in two stages:
1. Frontend: `vite build` (creates static files)
2. Backend: `esbuild server/index.ts` (bundles server code)

### 4. Common Issues & Solutions

**Build Timeout:**
- Increase build timeout in Scalingo settings
- Consider using a larger container size during build

**Memory Issues:**
- The build process is memory-intensive due to many UI components
- Use at least 512MB RAM for build process

**Missing Dependencies:**
- All dependencies are properly configured
- Build includes both production and dev dependencies (needed for build process)

### 5. Manual Build Test
To test the build locally:
```bash
npm run build
```
This should create `dist/` folder with both frontend and backend code.

### 6. Deployment Command
```bash
git push scalingo main
```

### 7. Post-Deployment
After successful deployment, run:
```bash
scalingo --app your-app-name run npm run db:push
```

## Alternative: Use Replit Deployment
If Scalingo continues to have issues, consider using Replit's built-in deployment which is optimized for this project structure.