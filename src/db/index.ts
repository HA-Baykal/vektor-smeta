import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || "";

// During build (Vercel) DATABASE_URL may be missing - don't crash build, create dummy pool
// Runtime will fail gracefully if still missing, but build will pass
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createPool() {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }

  // Use dummy connection string for build time if real one missing
  const connectionString = databaseUrl || "postgresql://dummy:dummy@localhost:5432/dummy";

  const newPool = new Pool({
    connectionString,
    // Don't crash on build - connection will be attempted only at runtime
    connectionTimeoutMillis: 5000,
  });

  // Suppress error during build if dummy
  if (!databaseUrl) {
    newPool.on("error", () => {
      // ignore - will be configured at runtime via env
    });
  }

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = newPool;
  }

  return newPool;
}

export const pool = createPool();
export const db = drizzle(pool);
