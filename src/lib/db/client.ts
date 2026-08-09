import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * The ONE place the app talks to Postgres — import `db` from here, never
 * create another Pool. Vercel functions are serverless and Railway Postgres
 * has a low connection limit, so the pool is kept deliberately small.
 * (`DATABASE_URL` presence is enforced at server startup in instrumentation.ts;
 * the Pool itself only connects on first query.)
 */

const globalForDb = globalThis as unknown as { roocPool?: Pool };

const pool =
  globalForDb.roocPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

// Reuse the pool across dev hot reloads instead of leaking connections.
if (process.env.NODE_ENV !== "production") globalForDb.roocPool = pool;

export const db = drizzle(pool, { schema });
