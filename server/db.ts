import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please provide your external database connection string.",
  );
}

// Parse Supabase connection string manually to avoid SASL issues
const parseSupabaseUrl = (url: string) => {
  const dbUrl = new URL(url);
  return {
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 6543,
    database: dbUrl.pathname.slice(1),
    user: dbUrl.username,
    password: dbUrl.password
  };
};

const createDatabaseConnection = () => {
  try {
    const { host, port, database, user, password } = parseSupabaseUrl(process.env.DATABASE_URL!);
    
    const pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl: {
        rejectUnauthorized: false
      },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      application_name: 'promotly-app'
    });

    pool.on('error', (err) => {
      console.error('Database pool error:', err.message);
    });

    return pool;
  } catch (error) {
    console.error('Failed to create database connection:', error);
    throw error;
  }
};

export const pool = createDatabaseConnection();

// Create a wrapper for database operations with retry logic
const createDrizzleDb = () => {
  return drizzle(pool, { 
    schema,
    logger: false // Disable query logging to reduce noise
  });
};

export const db = createDrizzleDb();

// Test connection with retry logic
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Successfully connected to Supabase database');
      return true;
    } catch (error) {
      console.error(`Connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error('❌ All connection attempts failed. Continuing with degraded functionality.');
        return false;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
};

// Test connection on startup
testConnection().catch((error) => {
  console.error('Database connection test failed:', error.message);
});