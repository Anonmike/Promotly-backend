# Manual Supabase Table Creation

Since we're experiencing SASL authentication issues with the direct connection, here's how to create the tables manually using the Supabase web interface:

## Steps to Create Tables

### 1. Open Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select your project
3. Click on **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### 2. Copy and Run This SQL
Copy the entire SQL script below and paste it into the SQL Editor, then click **"Run"**:

```sql
-- Create users table
CREATE TABLE "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "username" text NOT NULL,
    "password" text NOT NULL,
    CONSTRAINT "users_username_unique" UNIQUE("username")
);

-- Create social_accounts table
CREATE TABLE "social_accounts" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "platform" text NOT NULL,
    "account_id" text NOT NULL,
    "access_token" text,
    "access_token_secret" text,
    "refresh_token" text,
    "cookies" text,
    "auth_method" text DEFAULT 'oauth',
    "expires_at" timestamp,
    "account_name" text NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now()
);

-- Create posts table
CREATE TABLE "posts" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "content" text NOT NULL,
    "platforms" json NOT NULL,
    "media_urls" json DEFAULT '[]'::json,
    "scheduled_for" timestamp NOT NULL,
    "status" text DEFAULT 'scheduled' NOT NULL,
    "published_at" timestamp,
    "error_message" text,
    "social_post_ids" json DEFAULT '{}'::json,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create analytics table
CREATE TABLE "analytics" (
    "id" serial PRIMARY KEY NOT NULL,
    "post_id" integer NOT NULL,
    "platform" text NOT NULL,
    "likes" integer DEFAULT 0,
    "shares" integer DEFAULT 0,
    "comments" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "engagement_rate" integer DEFAULT 0,
    "last_updated" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;
```

### 3. Verify Tables Created
After running the SQL:
1. Go to **"Table Editor"** in the left sidebar
2. You should see 4 tables: `users`, `social_accounts`, `posts`, `analytics`
3. Each table should have the correct columns and structure

### 4. Test the Connection
Once the tables are created, your Promotly application should work properly with the Supabase database.

## What Each Table Does

- **users**: Stores user accounts and authentication
- **social_accounts**: Connected social media platform credentials
- **posts**: Scheduled and published content with metadata
- **analytics**: Performance metrics and engagement data

## Next Steps

After creating the tables manually:
1. Your Promotly app should automatically connect to the Supabase database
2. You can create accounts, connect social media, and schedule posts
3. All data will be stored in your Supabase database
4. You can view and manage data through the Supabase Table Editor

The application will automatically handle the database connections and operations once the tables are in place.