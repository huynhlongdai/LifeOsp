import { createTextCapture, findCaptureById, type CaptureRow, type DatabaseClient } from "@lifeos/db";
import type { CaptureId, CaptureKind, CaptureProcessingStatus, CaptureView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CaptureErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_capture" | "not_found";
  message: string;
};

function parseRawText(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "rawText")) return null;
  if (typeof record.rawText !== "string") return null;
  if (record.rawText.trim().length === 0) return null;

  return record.rawText;
}

function toCaptureView(capture: CaptureRow): CaptureView {
  return {
    id: capture.id as CaptureId,
    kind: capture.kind as CaptureKind,
    rawText: capture.rawText,
    processingStatus: capture.processingStatus as CaptureProcessingStatus,
    createdAt: capture.createdAt.toISOString()
  };
}

export function registerCaptureRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.post("/v1/captures", async (request, reply): Promise<CaptureView | CaptureErrorView> => {
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

    const rawText = parseRawText(request.body);
    if (rawText === null) {
      reply.code(400);
      return {
        error: "invalid_capture",
        message: "Body must contain only a non-blank rawText string"
      };
    }

    const capture = await createTextCapture(database, userId, rawText);
    reply.code(201);
    return toCaptureView(capture);
  });

  app.get<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId",
    async (request, reply): Promise<CaptureView | CaptureErrorView> => {
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

      const { captureId } = request.params;
      if (!UUID_PATTERN.test(captureId)) {
        reply.code(400);
        return { error: "invalid_capture", message: "captureId must be a UUID" };
      }

      const capture = await findCaptureById(database, userId, captureId);
      if (!capture) {
        reply.code(404);
        return { error: "not_found", message: "Capture not found" };
      }

      return toCaptureView(capture);
    }
  );
}
