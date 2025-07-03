# Database Connection Fix for SASL Authentication Issue

## Problem
The application is experiencing a DNS resolution error when connecting to Supabase:
```
getaddrinfo ENOTFOUND db.lscynxekmdxaatysdgdn.supabase.co
```

## Root Cause Analysis
DNS testing revealed the issue:
- ✅ IPv6 DNS lookup works (returns `2600:1f1c:f9:4d08:328d:7565:eab9:8063`)
- ❌ IPv4 DNS lookup fails with `ENOTFOUND`
- The hostname `db.lscynxekmdxaatysdgdn.supabase.co` only has IPv6 records
- PostgreSQL client defaults to IPv4 which fails

## Cause
The connection string hostname appears to be incorrect or incomplete. This could be:
- Wrong project reference ID in the hostname
- Incomplete project setup in Supabase
- Incorrect connection string format copied from dashboard

## Solution Options

### Option 1: Use Direct Connection (Recommended)
Switch from the transaction pooler to the direct connection:

1. In Supabase Dashboard → Settings → Database
2. Copy the "Direct connection" string instead of "Transaction pooler"
3. The direct connection uses port 5432 instead of 6543
4. Format: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`

### Option 2: Disable Scheduler (Temporary Fix)
The application works fine except for the scheduled post processing. You can:
1. Use the app normally for manual posting
2. Disable automatic scheduling until database is fixed

### Option 3: Alternative Database Provider
Consider switching to:
- Railway PostgreSQL
- PlanetScale (MySQL)
- Neon Database
- AWS RDS

## Current Status
- Application runs successfully
- All features work except automatic post scheduling
- Manual operations (posts, analytics, accounts) function normally
- Error is contained and doesn't crash the application

## Recommendation
Use the direct connection option from Supabase as it bypasses the transaction pooler where the SASL issue occurs.