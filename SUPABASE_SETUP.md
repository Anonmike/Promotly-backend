# Supabase Database Setup for Promotly

## Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com/dashboard/projects)
2. Create a new project if you haven't already
3. Wait for the project to finish setting up (2-3 minutes)

### 2. Get Database Connection String

**For Direct Connection (Recommended to fix SASL issues):**
1. In your Supabase project dashboard, click **"Connect"** in the top toolbar
2. Go to **"Connection string"** → **"Direct connection"**
3. Copy the URI value (it should look like this):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the database password you set when creating the project

**Alternative - Transaction Pooler:**
If direct connection doesn't work, try the pooler:
1. Go to **"Connection string"** → **"Transaction pooler"**
2. Copy the URI (format: `postgresql://postgres.xxxxx:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`)

**Connection String Troubleshooting:**
- Direct connection uses port `5432` and hostname like `db.xxxxx.supabase.co`
- Transaction pooler uses port `6543` and hostname like `aws-0-region.pooler.supabase.com`
- Make sure the hostname resolves properly
- Verify your project ID is correct in the connection string

### 3. Update Replit Environment
1. In your Replit project, go to **Secrets** (lock icon in sidebar)
2. Find the `DATABASE_URL` secret and update it with your Supabase connection string
3. The final URL should look like:
   ```
   postgresql://postgres.xxxxx:your_actual_password@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

### 4. Create Database Tables
After updating the `DATABASE_URL`, run this command in the Replit console:
```bash
npm run db:push
```

This will create all required tables in your Supabase database:
- `users` - User accounts and authentication
- `social_accounts` - Connected social media platforms  
- `posts` - Scheduled and published content
- `analytics` - Performance metrics and engagement data

### 5. Verify Connection
Restart your application to confirm the connection works:
- The app should start without database errors
- You can verify tables were created in Supabase dashboard → **Table Editor**

## Supabase Benefits for Promotly

- **Real-time capabilities** - Built-in real-time subscriptions
- **Built-in authentication** - Alternative to Clerk if needed
- **Automatic backups** - Point-in-time recovery
- **Dashboard access** - Visual database management
- **Generous free tier** - 500MB database, 2GB bandwidth
- **Global CDN** - Fast worldwide access

## Database Management

You can manage your data through:
- **Supabase Dashboard** - Visual interface for viewing/editing data
- **SQL Editor** - Run custom queries directly
- **API** - RESTful API automatically generated
- **Replit Console** - Using `npm run db:push` for schema changes

## Security Notes

- Your connection string includes authentication credentials
- Supabase handles SSL/TLS encryption automatically
- Connection pooling is included for better performance
- Row Level Security (RLS) can be enabled for additional protection

Your Promotly app will seamlessly switch to Supabase once you update the `DATABASE_URL` secret!