import {
  deleteActionStep,
  findActionSteps,
  insertActionStep,
  setActionStepDone,
  type DatabaseClient
} from "@lifeos/db";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type StepsErrorView = { error: "unavailable" | "unauthenticated" | "not_found" | "invalid_title"; message: string };

/**
 * Steps belong to the user, never to the client: every route resolves the session user
 * and scopes each query by it, so an id from another account simply finds nothing.
 */
export function registerActionStepRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  const guard = async (request: Parameters<typeof resolveActorUserId>[0], reply: { code: (value: number) => unknown }) => {
    if (!database) {
      reply.code(503);
      return { error: { error: "unavailable" as const, message: "Step storage is unavailable" } };
    }
    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: { error: "unauthenticated" as const, message: "An active LifeOS session is required" } };
    }
    return { userId };
  };

  app.get<{ Params: { actionId: string } }>("/v1/actions/:actionId/steps", async (request, reply) => {
    reply.header("cache-control", "no-store");
    const guarded = await guard(request, reply);
    if ("error" in guarded) return guarded.error;
    return { steps: await findActionSteps(database!, guarded.userId, request.params.actionId) };
  });

  app.post<{ Params: { actionId: string }; Body: { title?: unknown } }>(
    "/v1/actions/:actionId/steps",
    async (request, reply): Promise<unknown> => {
      const guarded = await guard(request, reply);
      if ("error" in guarded) return guarded.error;

      const title = typeof request.body?.title === "string" ? request.body.title.trim() : "";
      if (title.length === 0 || title.length > 200) {
        reply.code(400);
        return { error: "invalid_title", message: "A step needs a title of 1-200 characters" } satisfies StepsErrorView;
      }

      const step = await insertActionStep(database!, guarded.userId, request.params.actionId, title);
      if (!step) {
        reply.code(404);
        return { error: "not_found", message: "Action not found" } satisfies StepsErrorView;
      }
      reply.code(201);
      return step;
    }
  );

  app.patch<{ Params: { stepId: string }; Body: { done?: unknown } }>(
    "/v1/action-steps/:stepId",
    async (request, reply): Promise<unknown> => {
      const guarded = await guard(request, reply);
      if ("error" in guarded) return guarded.error;

      const done = request.body?.done === true;
      const step = await setActionStepDone(database!, guarded.userId, request.params.stepId, done);
      if (!step) {
        reply.code(404);
        return { error: "not_found", message: "Step not found" } satisfies StepsErrorView;
      }
      return step;
    }
  );

  app.delete<{ Params: { stepId: string } }>("/v1/action-steps/:stepId", async (request, reply): Promise<unknown> => {
    const guarded = await guard(request, reply);
    if ("error" in guarded) return guarded.error;

    const removed = await deleteActionStep(database!, guarded.userId, request.params.stepId);
    if (!removed) {
      reply.code(404);
      return { error: "not_found", message: "Step not found" } satisfies StepsErrorView;
    }
    reply.code(204);
    return null;
  });
}
