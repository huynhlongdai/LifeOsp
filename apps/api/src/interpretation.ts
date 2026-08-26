import {
  createCaptureInterpretationInputV1,
  validateCaptureInterpretationOutputV1,
  type CaptureInterpretationProvider
} from "@lifeos/ai";
import {
  appendCaptureInterpretation,
  findCaptureById,
  findLatestCaptureInterpretation,
  type CaptureInterpretationRow,
  type DatabaseClient
} from "@lifeos/db";
import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  type CaptureId,
  type CaptureInterpretationContentV1,
  type CaptureInterpretationId,
  type CaptureInterpretationView
} from "@lifeos/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { resolveActorUserId } from "./identity.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type InterpretationRouteRequest = FastifyRequest<{ Params: { captureId: string } }>;

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
    | "provider_unavailable"
    | "provider_failed"
    | "invalid_provider_output"
    | "invalid_interpretation"
    | "version_conflict";
  message: string;
  manualFallback?: boolean;
  validationErrors?: string[];
  latestVersion?: number;
};

function toInterpretationView(row: CaptureInterpretationRow): CaptureInterpretationView {
  return {
    id: row.id as CaptureInterpretationId,
    captureId: row.captureId as CaptureId,
    version: row.version,
    contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    author: row.author as "ai" | "user",
    content: row.content as CaptureInterpretationContentV1,
    createdAt: row.createdAt.toISOString()
  };
}

function parseUserInterpretationBody(body: unknown): { baseVersion: number; content: unknown } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "baseVersion" && key !== "content")) return null;
  if (!Number.isInteger(record.baseVersion) || (record.baseVersion as number) < 0) return null;
  return { baseVersion: record.baseVersion as number, content: record.content };
}

function validateUserContent(rawText: string, content: unknown) {
  return validateCaptureInterpretationOutputV1(rawText, {
    contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    content
  });
}

export function registerInterpretationRoutes(
  app: FastifyInstance,
  database: DatabaseClient | null,
  options: InterpretationOptions = {}
) {
  app.post<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/interpretations/generate",
    async (request, reply): Promise<CaptureInterpretationView | InterpretationErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Interpretation storage is unavailable", manualFallback: true };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const captureId = request.params.captureId;
      if (!UUID_PATTERN.test(captureId)) {
        reply.code(400);
        return { error: "invalid_capture", message: "captureId must be a UUID" };
      }

      const capture = await findCaptureById(database, userId, captureId);
      if (!capture) {
        reply.code(404);
        return { error: "not_found", message: "Capture not found" };
      }

      if (!options.provider) {
        reply.code(503);
        return {
          error: "provider_unavailable",
          message: "AI interpretation is unavailable; classify this Capture manually",
          manualFallback: true
        };
      }

      let providerResult;
      try {
        providerResult = await options.provider.interpret(
          createCaptureInterpretationInputV1(capture.id as CaptureId, capture.rawText),
          { signal: AbortSignal.timeout(options.timeoutMs ?? 8_000) }
        );
      } catch (error) {
        request.log.warn({ error }, "capture interpretation provider failed");
        reply.code(503);
        return {
          error: "provider_failed",
          message: "AI interpretation failed; the saved Capture is still available for manual classification",
          manualFallback: true
        };
      }

      const validation = validateCaptureInterpretationOutputV1(capture.rawText, providerResult.output);
      if (!validation.ok) {
        request.log.warn({ validationErrors: validation.errors }, "capture interpretation provider returned invalid output");
        reply.code(422);
        return {
          error: "invalid_provider_output",
          message: "AI output did not match the safe interpretation contract",
          manualFallback: true,
          validationErrors: validation.errors
        };
      }

      if (providerResult.runtime) {
        request.log.info({ aiRuntime: providerResult.runtime }, "capture interpretation provider completed");
      }

      const appended = await appendCaptureInterpretation(database, {
        userId,
        captureId,
        contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
        contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
        author: "ai",
        content: validation.content,
        kind: "generated",
        expectedBaseVersion: 0
      });

      if (appended.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "Capture not found" };
      }
      if (appended.status === "version_conflict") {
        reply.code(409);
        return {
          error: "version_conflict",
          message: "Interpretation changed before this write completed",
          latestVersion: appended.latestVersion
        };
      }

      reply.code(201);
      return toInterpretationView(appended.interpretation);
    }
  );

  app.post<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/interpretations/manual",
    async (request, reply): Promise<CaptureInterpretationView | InterpretationErrorView> =>
      persistUserInterpretation(request, reply, database, "manual")
  );

  app.post<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/interpretations/correct",
    async (request, reply): Promise<CaptureInterpretationView | InterpretationErrorView> =>
      persistUserInterpretation(request, reply, database, "correction")
  );

  app.get<{ Params: { captureId: string } }>(
    "/v1/captures/:captureId/interpretations/latest",
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

      const captureId = request.params.captureId;
      if (!UUID_PATTERN.test(captureId)) {
        reply.code(400);
        return { error: "invalid_capture", message: "captureId must be a UUID" };
      }

      const interpretation = await findLatestCaptureInterpretation(database, userId, captureId);
      if (!interpretation) {
        const capture = await findCaptureById(database, userId, captureId);
        reply.code(404);
        return {
          error: "not_found",
          message: capture ? "Capture has no interpretation yet" : "Capture not found"
        };
      }

      return toInterpretationView(interpretation);
    }
  );
}

async function persistUserInterpretation(
  request: InterpretationRouteRequest,
  reply: FastifyReply,
  database: DatabaseClient | null,
  kind: "manual" | "correction"
): Promise<CaptureInterpretationView | InterpretationErrorView> {
  reply.header("cache-control", "no-store");
  if (!database) {
    reply.code(503);
    return { error: "unavailable", message: "Interpretation storage is unavailable", manualFallback: true };
  }

  const userId = await resolveActorUserId(request, database);
  if (!userId) {
    reply.code(401);
    return { error: "unauthenticated", message: "An active LifeOS session is required" };
  }

  const captureId = request.params.captureId;
  if (!UUID_PATTERN.test(captureId)) {
    reply.code(400);
    return { error: "invalid_capture", message: "captureId must be a UUID" };
  }

  const capture = await findCaptureById(database, userId, captureId);
  if (!capture) {
    reply.code(404);
    return { error: "not_found", message: "Capture not found" };
  }

  const parsed = parseUserInterpretationBody(request.body);
  if (!parsed || (kind === "correction" && parsed.baseVersion < 1)) {
    reply.code(400);
    return {
      error: "invalid_interpretation",
      message: "Body must contain baseVersion and canonical interpretation content"
    };
  }

  const validation = validateUserContent(capture.rawText, parsed.content);
  if (!validation.ok) {
    reply.code(400);
    return {
      error: "invalid_interpretation",
      message: "Interpretation content did not match the V1 contract",
      validationErrors: validation.errors
    };
  }

  const appended = await appendCaptureInterpretation(database, {
    userId,
    captureId,
    contractId: CAPTURE_INTERPRETATION_CONTRACT_ID,
    contractVersion: CAPTURE_INTERPRETATION_CONTRACT_VERSION,
    author: "user",
    content: validation.content,
    kind,
    expectedBaseVersion: parsed.baseVersion
  });

  if (appended.status === "not_found") {
    reply.code(404);
    return { error: "not_found", message: "Capture not found" };
  }
  if (appended.status === "version_conflict") {
    reply.code(409);
    return {
      error: "version_conflict",
      message: "Interpretation changed; reload the latest version before saving this correction",
      latestVersion: appended.latestVersion
    };
  }

  reply.code(201);
  return toInterpretationView(appended.interpretation);
}
