import { listCaptures, listIncubatorItems, type DatabaseClient } from "@lifeos/db";
import { CAPTURE_LIST_DEFAULT_LIMIT, CAPTURE_LIST_MAX_LIMIT, type CaptureListView, type IncubatorListView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

export type InboxErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_request";
  message: string;
};

// Read-only surfaces for Inbox (spec §3.1) and Incubator (spec §16.1).
// No writes here: promotion/archive of incubator items stays with A4/P1 flows.
export function registerInboxRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get<{ Querystring: { limit?: string } }>(
    "/v1/captures",
    async (request, reply): Promise<CaptureListView | InboxErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Capture storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const limit = parseLimit(request.query.limit);
      if (limit === null) {
        reply.code(400);
        return { error: "invalid_request", message: `limit must be an integer between 1 and ${CAPTURE_LIST_MAX_LIMIT}` };
      }

      return listCaptures(database, userId, limit, new Date());
    }
  );

  app.get("/v1/incubator", async (request, reply): Promise<IncubatorListView | InboxErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Incubator storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    return listIncubatorItems(database, userId, new Date());
  });
}

function parseLimit(value: string | undefined): number | null {
  if (value === undefined) return CAPTURE_LIST_DEFAULT_LIMIT;
  if (!/^\d{1,3}$/.test(value)) return null;
  const limit = Number(value);
  if (limit < 1 || limit > CAPTURE_LIST_MAX_LIMIT) return null;
  return limit;
}
