# Promotly

## Overview

This is a full-stack social media scheduling application built with React, Express.js, and TypeScript. The application allows users to create, schedule, and manage social media posts across multiple platforms (Twitter, Facebook, LinkedIn), with analytics tracking and a modern, responsive UI.

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
- **Clerk Authentication**: Robust user management and authentication system
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

## Changelog

Changelog:
- June 27, 2025. Initial setup
- June 28, 2025. Implemented multi-platform OAuth authentication system for Twitter, Facebook, and LinkedIn
- June 28, 2025. Added comprehensive social media posting support across multiple platforms
- June 28, 2025. Enhanced platform selector to show connection status and dynamic availability
- June 28, 2025. Migrated from JWT authentication to Clerk authentication system for robust user management
- June 28, 2025. Implemented hybrid authentication: Clerk for user sign in/sign up, JWT for all API endpoints to restore scheduling functionality
- June 28, 2025. Fixed critical bugs: error handling middleware, scheduler service, and callback URLs for deployed domain (https://app.promotlyai.com)
- June 28, 2025. Rebranded application from "Social Media Scheduler" to "Promotly" throughout the codebase including UI, navigation, local storage keys, and HTML metadata