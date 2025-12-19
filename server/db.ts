import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSQLite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { Pool } from "pg";
import * as schema from "@shared/schema";

let db: any;

if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL?.includes('supabase')) {
  // Use SQLite for local development
  const sqlite = new Database('./dev.db');
  db = drizzleSQLite(sqlite, { schema });
} else {
  // Use PostgreSQL for production or Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  db = drizzle(pool, { schema });
}

export { db };
