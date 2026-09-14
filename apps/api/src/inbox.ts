import { findInbox, type CaptureRow, type DatabaseClient, type IncubatorItemRow } from "@lifeos/db";
import type { CaptureId, IncubatorItemId, IncubatorItemView, InboxView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type InboxErrorView = { error: "unavailable" | "unauthenticated"; message: string };

export function registerInboxRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/inbox", async (request, reply): Promise<InboxView | InboxErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Inbox storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const inbox = await findInbox(database, userId);
    return {
      captures: inbox.captures.map(({ capture, hasInterpretation }) => toCaptureView(capture, hasInterpretation)),
      incubated: inbox.incubated.map(toIncubatorView),
      counts: inbox.counts
    };
  });
}

function toCaptureView(row: CaptureRow, hasInterpretation: boolean): InboxView["captures"][number] {
  return {
    id: row.id as CaptureId,
    rawText: row.rawText,
    processingStatus: row.processingStatus,
    createdAt: row.createdAt.toISOString(),
    hasInterpretation
  };
}

function toIncubatorView(row: IncubatorItemRow): IncubatorItemView {
  return {
    id: row.id as IncubatorItemId,
    ...(row.sourceCaptureId === null ? {} : { sourceCaptureId: row.sourceCaptureId as CaptureId }),
    title: row.title,
    ...(row.notes === null ? {} : { notes: row.notes }),
    kind: row.kind as IncubatorItemView["kind"],
    status: row.status as IncubatorItemView["status"],
    ...(row.revisitOn === null ? {} : { revisitOn: row.revisitOn }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
