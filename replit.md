# Promotly

## Overview

Promotly is a full-stack social media scheduling platform built with React, Express.js, and TypeScript. The application allows users to create, schedule, and manage social media posts across multiple platforms (Twitter, Facebook, LinkedIn), with analytics tracking and a modern, responsive UI featuring the Promotly brand identity.

## System Architecture

The application follows a monorepo structure with clear separation between client and server code:

- **Frontend**: React with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for schema management
- **UI Framework**: Shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing

## Key Components

### Frontend Architecture
- **React SPA**: Single-page application with component-based architecture
- **Shadcn/ui**: Comprehensive UI component library with Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Form Management**: React Hook Form with Zod validation
- **Charts**: Recharts for analytics visualization
- **Toast Notifications**: Built-in toast system for user feedback

### Backend Architecture
- **Express.js API**: RESTful API with middleware for logging and error handling
- **JWT Authentication**: Token-based authentication system
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Social Media Integration**: Services for Twitter, Facebook, and LinkedIn APIs
- **Scheduler Service**: Cron-based job scheduler for automated posting
- **Storage Abstraction**: Interface-based storage layer with in-memory fallback

### Database Schema
- **Users**: Authentication and user management
- **Social Accounts**: Connected social media platform credentials
- **Posts**: Content management with multi-platform support
- **Analytics**: Performance tracking and engagement metrics

## Data Flow

1. **User Authentication**: JWT-based login/registration system
2. **Post Creation**: Users create content through a rich form interface
3. **Platform Selection**: Multi-platform targeting with individual customization
4. **Scheduling**: Posts are queued for future publication
5. **Automated Publishing**: Background scheduler processes queued posts
6. **Analytics Collection**: Real-time metrics gathering from social platforms
7. **Dashboard Visualization**: Charts and summaries of performance data

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **axios**: HTTP client for API requests
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT token handling

### UI Libraries
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: CSS framework
- **recharts**: Chart visualization
- **lucide-react**: Icon library

### Social Media APIs
- **twitter-api-v2**: Twitter/X integration
- **Facebook Graph API**: Facebook posting
- **LinkedIn API**: Professional network integration

## Deployment Strategy

### Development Environment
- **Vite**: Fast development server with HMR
- **tsx**: TypeScript execution for server development
- **Concurrent Development**: Client and server run simultaneously

### Production Build
- **Client**: Vite builds optimized React bundle
- **Server**: esbuild bundles Express server for Node.js
- **Static Assets**: Client builds to `/dist/public` for serving

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **JWT_SECRET**: Token signing secret
- **Platform API Keys**: Social media integration credentials

### Database Management
- **Drizzle Kit**: Schema migrations and database pushing
- **PostgreSQL**: Primary database with connection pooling
- **Neon Database**: Serverless PostgreSQL provider integration

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **January 03, 2025**: Migrated from in-memory storage to PostgreSQL database
  - Replaced MemStorage with DatabaseStorage using Drizzle ORM
  - Created comprehensive database schema for users, social accounts, posts, and analytics
  - All data is now persisted in PostgreSQL with proper relationships
  - Database tables created and schema pushed successfully
  - Application fully functional with persistent data storage

- **June 28, 2025**: Implemented Twitter OAuth authentication system
  - Replaced manual token input with secure OAuth 1.0a flow
  - Added session-based OAuth state management
  - Created manual OAuth completion interface for localhost development
  - Configured production callback URL for app.promotlyai.com
  - Twitter app requires callback URLs: `http://localhost:5000/api/auth/twitter/callback` (dev) and `https://app.promotlyai.com/api/auth/twitter/callback` (prod)

- **June 28, 2025**: Rebranded application to Promotly
  - Updated application name from "Social Media Scheduler" to "Promotly"
  - Integrated Promotly logo throughout the UI (navigation, favicon)
  - Updated page titles, headings, and descriptions to reflect Promotly branding
  - Maintained all existing functionality while enhancing brand identity

- **June 28, 2025**: Implemented animated dashboard welcome cards
  - Added personalized greeting cards with time-based salutations (Good morning/afternoon/evening)
  - Created three animated welcome cards: Personal Greeting, Quick Post, and Pro Tip
  - Implemented staggered entrance animations with CSS keyframes
  - Added floating and pulse animations for dynamic visual effects
  - Made Quick Post card clickable for direct navigation to schedule page
  - Dynamic Pro Tip content adapts based on user's account and post status

- **June 28, 2025**: Integrated Clerk authentication system
  - Added Clerk for user login and authentication (preserving social media OAuth)
  - Updated frontend to use Clerk's SignIn component and user management
  - Modified backend routes to accept and verify Clerk JWT tokens
  - Preserved all existing social media OAuth functionality (Twitter, Facebook, LinkedIn)
  - Users now sign in with Clerk but social account connections remain unchanged
  - All API routes now use Clerk authentication while maintaining social posting features

- **June 28, 2025**: Implemented functional notification system
  - Removed "Service Active" indicator from navigation header
  - Created real-time notification system for post-related events
  - Added toast notifications for successful post publishing, failures, and scheduling
  - Implemented notification bell with dynamic badge showing failed posts and recent successes
  - Created notification hook that polls for post status changes every 10 seconds
  - Users receive immediate feedback for all post operations with descriptive messages

- **June 28, 2025**: Added direct authentication routing
  - Created dedicated /signin and /signup pages with Promotly branding
  - Implemented proper routing to handle direct authentication URLs
  - Added cross-linking between signin and signup pages for better UX
  - Users can now access authentication pages directly via browser URLs
  - Maintained seamless authentication flow with proper redirect handling

- **June 28, 2025**: Fixed desktop header layout issues
  - Resolved overlapping navigation elements on desktop screens
  - Implemented proper flex layout with centered navigation links
  - Added flex-shrink-0 to logo and right-side actions to prevent compression
  - Improved mobile navigation with integrated notification bell and user controls
  - Optimized responsive padding for better spacing across all screen sizes

- **June 28, 2025**: Implementing comprehensive analytics and reporting
  - Enhanced analytics page with tabbed interface for different report types
  - Added platform filtering and extended time period options (7d, 30d, 90d, 6m, 1y)
  - Implemented CSV and JSON export functionality for analytics data
  - Created dedicated tabs: Overview, Engagement, Platforms, Post Performance
  - Added performance indicators and growth metrics visualization
  - Integrated detailed post-level analytics with engagement tracking

- **June 28, 2025**: Fixed header duplicate items
  - Removed duplicate notification bell and user controls from mobile navigation
  - Cleaned up header layout to show proper responsive design
  - Desktop shows full controls in right-side actions, mobile shows only menu toggle
  - Eliminated overlapping elements and improved header organization

- **June 28, 2025**: Styled notification and settings modals
  - Replaced basic browser alerts with branded modal components
  - Created professional notification modal with different states for failed/successful posts
  - Designed settings modal with coming soon message and feature preview
  - Added proper icons, colors, and styling matching Promotly's design system
  - Improved user experience with smooth animations and better accessibility

- **January 01, 2025**: Fixed Twitter OAuth session persistence
  - Implemented robust Twitter token validation system with automatic disconnection detection
  - Added token validation before posting to prevent failed posts due to expired/invalid tokens
  - Enhanced error handling with specific Twitter API error codes (401, 403, 429, duplicates)
  - Created account refresh functionality to check connection status on-demand
  - Added visual indicators for disconnected accounts with red badges and alerts
  - Implemented connection warnings in post scheduler when accounts are disconnected
  - Users now get immediate feedback about account status and can refresh connections manually

- **January 01, 2025**: Added headless browser automation with cookie authentication
  - Built comprehensive Puppeteer-based automation for Twitter, Facebook, and LinkedIn posting
  - Implemented cookie-based authentication as primary method or OAuth fallback
  - Added intelligent automatic fallback from OAuth to cookies when tokens fail
  - Extended database schema with cookie storage and authentication method tracking
  - Created user-friendly cookie authentication interface with extraction instructions
  - Added cookie validation before account creation to ensure successful authentication
  - Enhanced account status monitoring with real-time connection validation
  - Provides robust alternative when OAuth tokens expire or API access is limited

- **January 02, 2025**: Implemented automatic cookie extraction system
  - Fixed Puppeteer protocol errors with partitionKey parameters in cookie handling
  - Created automatic cookie extraction service that opens browser for user login
  - Added three-tab authentication interface: OAuth, Auto Cookie Extract, Manual Cookies
  - Built seamless user experience where users just log in normally and cookies are extracted automatically
  - Added proper error handling for individual cookie failures during extraction
  - Implemented session-based tracking for cookie extraction processes
  - Enhanced UI with step-by-step instructions and completion dialogs
  - Provides most user-friendly method for social media account authentication

- **January 03, 2025**: Created comprehensive Playwright browser automation system
  - Built complete replacement for cookie-based authentication using persistent browser contexts
  - Implemented SessionManager class for managing isolated user browser sessions
  - Created AutomationEngine class for performing automated actions in headless mode
  - Added support for manual login onboarding followed by automated task execution
  - Each user gets unique browser context stored in ./user_sessions/{userId} directories
  - Sessions persist between application restarts with full cookies and localStorage
  - Supports LinkedIn, Twitter, Facebook and any web platform through unified interface
  - Comprehensive CLI tool (index.js) with commands: onboard, automate, validate, list, delete
  - Modular architecture with clean separation: sessionManager.js, automation.js, index.js
  - Full error handling, session validation, and graceful cleanup of browser processes
  - Ready to replace existing cookie extraction system with more robust automation

## Changelog

- June 27, 2025: Initial setup
- June 28, 2025: Twitter OAuth implementation and production configuration