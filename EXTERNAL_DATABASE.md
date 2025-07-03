# External Database Setup Guide

Your Promotly application is now configured to work with any external PostgreSQL database. Here's how to connect it:

## Database Configuration

The application now uses the standard PostgreSQL driver (`pg`) which works with:
- **AWS RDS PostgreSQL**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **DigitalOcean Managed Databases**
- **Heroku Postgres**
- **Supabase**
- **PlanetScale** (MySQL - would need driver change)
- **Any self-hosted PostgreSQL**

## Connection Setup

### 1. Get Your Database URL
Your external database provider will give you a connection string in this format:
```
postgresql://username:password@host:port/database_name
```

Or with SSL:
```
postgresql://username:password@host:port/database_name?ssl=true
```

### 2. Set Environment Variable
In your Replit Secrets, update or add:
- **Key:** `DATABASE_URL`
- **Value:** Your external database connection string

### 3. SSL Configuration
The application automatically enables SSL for production environments. For development with SSL-required databases, your connection string should include `?ssl=true` or `?sslmode=require`.

## Database Schema Setup

After connecting your external database, run this command to create the required tables:
```bash
npm run db:push
```

This will create these tables in your external database:
- `users` - User accounts and authentication
- `social_accounts` - Connected social media platforms
- `posts` - Scheduled and published content
- `analytics` - Performance metrics and engagement data

## Popular External Database Options

### Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Settings → Database
3. Copy the "Connection string" under "Connection parameters"
4. Replace `[YOUR-PASSWORD]` with your database password
5. Add this as your `DATABASE_URL` in Replit Secrets

### AWS RDS
1. Create a PostgreSQL instance in AWS RDS
2. Configure security groups to allow connections
3. Use connection string format: `postgresql://username:password@your-rds-endpoint:5432/database_name`

### Heroku Postgres
1. Add Heroku Postgres addon to your Heroku app
2. Copy the `DATABASE_URL` from Heroku config vars
3. Use directly in Replit Secrets

## Testing Connection

After setting up your external database, restart the application. If successful, you'll see:
- No database connection errors in logs
- Application starts normally on port 5000
- Database tables are created when you run `npm run db:push`

## Migration from Current Database

If you want to migrate data from the current Replit database to your external database:
1. Export data from current database
2. Set up new external database
3. Import data to external database
4. Update `DATABASE_URL` to point to external database

The application will seamlessly switch to your external database once the `DATABASE_URL` is updated.