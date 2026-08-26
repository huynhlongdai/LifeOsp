import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

export function createDatabaseClient(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 30_000
  });

  const db = drizzle(pool, { schema });

  return { db, pool };
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export async function checkDatabase(pool: Pool): Promise<boolean> {
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}

export async function createAnonymousSession(
  database: DatabaseClient,
  tokenHash: string,
  expiresAt: Date
): Promise<{ userId: string; expiresAt: Date }> {
  return database.db.transaction(async (transaction) => {
    const [user] = await transaction.insert(schema.users).values({}).returning({ id: schema.users.id });
    if (!user) {
      throw new Error("Failed to create anonymous LifeOS user");
    }

    await transaction.insert(schema.sessions).values({
      tokenHash,
      userId: user.id,
      expiresAt
    });

    return { userId: user.id, expiresAt };
  });
}

export async function resolveAnonymousSession(
  database: DatabaseClient,
  tokenHash: string,
  now: Date
): Promise<{ userId: string; expiresAt: Date } | null> {
  const [session] = await database.db
    .select({
      userId: schema.sessions.userId,
      expiresAt: schema.sessions.expiresAt
    })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, now)))
    .limit(1);

  return session ?? null;
}

export * from "./schema.js";
