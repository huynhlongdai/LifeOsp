import { createHash, randomBytes } from "node:crypto";
import { createAnonymousSession, resolveAnonymousSession, type DatabaseClient } from "@lifeos/db";
import type { SessionView } from "@lifeos/domain";
import type { FastifyInstance, FastifyRequest } from "fastify";

export const SESSION_COOKIE_NAME = "lifeos_session";
const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

export type IdentityOptions = {
  sessionTtlMs?: number;
  tokenFactory?: () => string;
  now?: () => Date;
  cookieSecure?: boolean;
};

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function readSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName !== SESSION_COOKIE_NAME) continue;

    const rawValue = rawValueParts.join("=");
    if (!rawValue) return null;

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return null;
    }
  }

  return null;
}

async function resolveRequestSession(
  request: FastifyRequest,
  database: DatabaseClient | null,
  now: Date
): Promise<{ userId: string; expiresAt: Date } | null> {
  if (!database) return null;

  const token = readSessionToken(request.headers.cookie);
  if (!token) return null;

  return resolveAnonymousSession(database, hashSessionToken(token), now);
}

export async function resolveActorUserId(
  request: FastifyRequest,
  database: DatabaseClient | null,
  now = new Date()
): Promise<string | null> {
  const session = await resolveRequestSession(request, database, now);
  return session?.userId ?? null;
}

function serializeSessionCookie(token: string, ttlMs: number, secure: boolean): string {
  const maxAgeSeconds = Math.max(1, Math.floor(ttlMs / 1_000));
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];

  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function registerIdentityRoutes(
  app: FastifyInstance,
  database: DatabaseClient | null,
  options: IdentityOptions = {}
) {
  const sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
  const tokenFactory = options.tokenFactory ?? (() => randomBytes(32).toString("base64url"));
  const clock = options.now ?? (() => new Date());
  const cookieSecure = options.cookieSecure ?? false;

  app.get("/v1/session", async (request, reply): Promise<SessionView> => {
    reply.header("cache-control", "no-store");

    if (!database) {
      reply.code(503);
      return { status: "unavailable" };
    }

    const session = await resolveRequestSession(request, database, clock());
    if (!session) {
      reply.code(401);
      return { status: "unauthenticated" };
    }

    return {
      status: "active",
      expiresAt: session.expiresAt.toISOString()
    };
  });

  app.post("/v1/session/bootstrap", async (request, reply): Promise<SessionView> => {
    reply.header("cache-control", "no-store");

    if (!database) {
      reply.code(503);
      return { status: "unavailable" };
    }

    const now = clock();
    const existing = await resolveRequestSession(request, database, now);
    if (existing) {
      return {
        status: "active",
        expiresAt: existing.expiresAt.toISOString()
      };
    }

    const token = tokenFactory();
    if (token.length < 32) {
      throw new Error("Session token factory returned an unsafe token");
    }

    const expiresAt = new Date(now.getTime() + sessionTtlMs);
    await createAnonymousSession(database, hashSessionToken(token), expiresAt);

    reply.header("set-cookie", serializeSessionCookie(token, sessionTtlMs, cookieSecure));
    reply.code(201);

    return {
      status: "active",
      expiresAt: expiresAt.toISOString()
    };
  });
}
