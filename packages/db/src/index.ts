import { and, desc, eq, gt } from "drizzle-orm";
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

export async function createTextCapture(
  database: DatabaseClient,
  userId: string,
  rawText: string
): Promise<schema.CaptureRow> {
  return database.db.transaction(async (transaction) => {
    const [capture] = await transaction
      .insert(schema.captures)
      .values({
        userId,
        kind: "text",
        rawText,
        processingStatus: "unprocessed"
      })
      .returning();

    if (!capture) {
      throw new Error("Failed to create Capture");
    }

    await transaction.insert(schema.lifeEvents).values({
      userId,
      type: "capture.created",
      source: "user",
      entityType: "capture",
      entityId: capture.id,
      payload: {
        kind: "text",
        processingStatus: "unprocessed"
      }
    });

    return capture;
  });
}

export async function findCaptureById(
  database: DatabaseClient,
  userId: string,
  captureId: string
): Promise<schema.CaptureRow | null> {
  const [capture] = await database.db
    .select()
    .from(schema.captures)
    .where(and(eq(schema.captures.id, captureId), eq(schema.captures.userId, userId)))
    .limit(1);

  return capture ?? null;
}

type InterpretationAppendKind = "generated" | "manual" | "correction";

type AppendCaptureInterpretationParams = {
  userId: string;
  captureId: string;
  contractId: string;
  contractVersion: number;
  author: "ai" | "user";
  content: unknown;
  kind: InterpretationAppendKind;
  expectedBaseVersion?: number;
};

export type AppendCaptureInterpretationResult =
  | { status: "created"; interpretation: schema.CaptureInterpretationRow }
  | { status: "not_found" }
  | { status: "version_conflict"; latestVersion: number };

export async function appendCaptureInterpretation(
  database: DatabaseClient,
  params: AppendCaptureInterpretationParams
): Promise<AppendCaptureInterpretationResult> {
  return database.db.transaction(async (transaction) => {
    const [capture] = await transaction
      .select({ id: schema.captures.id })
      .from(schema.captures)
      .where(and(eq(schema.captures.id, params.captureId), eq(schema.captures.userId, params.userId)))
      .limit(1)
      .for("update");

    if (!capture) return { status: "not_found" };

    const [latest] = await transaction
      .select({ version: schema.captureInterpretations.version })
      .from(schema.captureInterpretations)
      .where(
        and(
          eq(schema.captureInterpretations.captureId, params.captureId),
          eq(schema.captureInterpretations.userId, params.userId)
        )
      )
      .orderBy(desc(schema.captureInterpretations.version))
      .limit(1);

    const latestVersion = latest?.version ?? 0;
    if (params.expectedBaseVersion !== undefined && latestVersion !== params.expectedBaseVersion) {
      return { status: "version_conflict", latestVersion };
    }

    const version = latestVersion + 1;
    const [interpretation] = await transaction
      .insert(schema.captureInterpretations)
      .values({
        userId: params.userId,
        captureId: params.captureId,
        version,
        contractId: params.contractId,
        contractVersion: params.contractVersion,
        author: params.author,
        content: params.content
      })
      .returning();

    if (!interpretation) throw new Error("Failed to append Capture interpretation");

    const processingStatus = params.kind === "correction" ? "corrected" : "interpreted";
    await transaction
      .update(schema.captures)
      .set({ processingStatus })
      .where(and(eq(schema.captures.id, params.captureId), eq(schema.captures.userId, params.userId)));

    const eventType =
      params.kind === "generated"
        ? "capture.interpretation.generated"
        : params.kind === "manual"
          ? "capture.interpretation.manual"
          : "capture.interpretation.corrected";

    await transaction.insert(schema.lifeEvents).values({
      userId: params.userId,
      type: eventType,
      source: params.author === "ai" ? "ai" : "user",
      entityType: "capture_interpretation",
      entityId: interpretation.id,
      payload: {
        captureId: params.captureId,
        version,
        contractId: params.contractId,
        contractVersion: params.contractVersion,
        processingStatus
      }
    });

    return { status: "created", interpretation };
  });
}

export async function findLatestCaptureInterpretation(
  database: DatabaseClient,
  userId: string,
  captureId: string
): Promise<schema.CaptureInterpretationRow | null> {
  const [interpretation] = await database.db
    .select()
    .from(schema.captureInterpretations)
    .where(and(eq(schema.captureInterpretations.captureId, captureId), eq(schema.captureInterpretations.userId, userId)))
    .orderBy(desc(schema.captureInterpretations.version))
    .limit(1);

  return interpretation ?? null;
}

export * from "./action.js";
export * from "./execution-context.js";
export * from "./next-action.js";
export * from "./now.js";
export * from "./promotion.js";
export * from "./schema.js";
