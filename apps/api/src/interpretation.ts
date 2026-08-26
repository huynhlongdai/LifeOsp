import {
  createEmptyCaptureInterpretationV1,
  runCaptureInterpretationV1,
  validateCaptureInterpretationV1,
  type CaptureInterpretationProvider
} from "@lifeos/ai";
import {
  appendCaptureInterpretation,
  findCaptureById,
  listCaptureInterpretations,
  type CaptureInterpretationRow,
  type DatabaseClient
} from "@lifeos/db";
import {
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  type CaptureId,
  type CaptureInterpretationContentV1,
  type CaptureInterpretationId,
  type CaptureInterpretationSource,
  type CaptureInterpretationView
} from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InterpretationOptions = {
  provider?: CaptureInterpretationProvider;
  timeoutMs?: number;
};

type InterpretationErrorView = {
  error:
    | "unavailable"
    | "unauthenticated"
    | "invalid_capture"
    | "not_found"
    | "invalid_interpretation"
    | "interpretation_exists";
  message: string;
};

type ManualRequiredView = {
  status: "manual_required";
  reason: "provider_unavailable" | "invalid_output" | "provider_error" | "timeout";
  template: CaptureInterpretationContentV1;
};

function parseManualContent(body: unknown, rawText: string): CaptureInterpretationContentV1 | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "content") return null;
  return validateCaptureInterpretationV1(record.content, rawText);
}

function toView(
  row: CaptureInterpretationRow,
  content: CaptureInterpretationContentV1
): CaptureInterpretationView {
  return {
    id: row.id as CaptureInterpretationId,
    captureId: row.captureId as CaptureId,
    version: row.version,
    source: row.source as CaptureInterpretationSource,
    content,
    createdAt: row.createdAt.toISOString()
  };
}

export function registerInterpretationRoutes(
  app: FastifyInstance,
  database: DatabaseClient | null,
  options: InterpretationOptions = {}
) {
  const provider = options.provider;
  const timeoutMs = options.timeoutMs ?? 8_000;

  app.post<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/interpret",
    async (request, reply): Promise<CaptureInterpretationView | ManualRequiredView | InterpretationErrorView> => {
      reply.header("cache-control", "no-store");

      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Interpretation storage is unavailable" };
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

      const existing = await listCaptureInterpretations(database, userId, captureId);
      if (existing.length > 0) {
        reply.code(409);
        return {
          error: "interpretation_exists",
          message: "Use the user correction flow to create a new interpretation version"
        };
      }

      if (!provider) {
        return {
          status: "manual_required",
          reason: "provider_unavailable",
          template: createEmptyCaptureInterpretationV1()
        };
      }

      const result = await runCaptureInterpretationV1(
        provider,
        {
          contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
          captureId,
          rawText: capture.rawText
        },
        timeoutMs
      );

      if (result.status === "manual_required") {
        return {
          status: "manual_required",
          reason: result.reason,
          template: createEmptyCaptureInterpretationV1()
        };
      }

      const persisted = await appendCaptureInterpretation(database, userId, captureId, "ai", result.content);
      if (persisted.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Capture not found" };
      }
      if (persisted.status === "interpretation_exists") {
        reply.code(409);
        return {
          error: "interpretation_exists",
          message: "Use the user correction flow to create a new interpretation version"
        };
      }

      reply.code(201);
      return toView(persisted.interpretation, result.content);
    }
  );

  app.post<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/interpretations",
    async (request, reply): Promise<CaptureInterpretationView | InterpretationErrorView> => {
      reply.header("cache-control", "no-store");

      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Interpretation storage is unavailable" };
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

      const content = parseManualContent(request.body, capture.rawText);
      if (!content) {
        reply.code(400);
        return {
          error: "invalid_interpretation",
          message: "Interpretation must match capture_interpretation.v1 and reference valid source spans"
        };
      }

      const persisted = await appendCaptureInterpretation(database, userId, captureId, "user", content);
      if (persisted.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Capture not found" };
      }
      if (persisted.status === "interpretation_exists") {
        reply.code(409);
        return {
          error: "interpretation_exists",
          message: "An AI-only first-version constraint was violated"
        };
      }

      reply.code(201);
      return toView(persisted.interpretation, content);
    }
  );

  app.get<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/interpretations",
    async (request, reply): Promise<CaptureInterpretationView[] | InterpretationErrorView> => {
      reply.header("cache-control", "no-store");

      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Interpretation storage is unavailable" };
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

      const rows = await listCaptureInterpretations(database, userId, captureId);
      return rows.map((row) => {
        const content = validateCaptureInterpretationV1(row.content, capture.rawText);
        if (!content) {
          throw new Error(`Persisted Capture interpretation ${row.id} failed contract validation`);
        }
        return toView(row, content);
      });
    }
  );
}
