import { deleteOperatingPreference, listOperatingPreferences, updateOperatingPreference, type DatabaseClient } from "@lifeos/db";
import { OPERATING_PREFERENCE_STATUSES, type OperatingPreferenceListView, type OperatingPreferenceView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

export type OperatingPreferenceErrorView = {
  error: "unavailable" | "unauthenticated" | "invalid_request" | "not_found";
  message: string;
};

export type DeletedView = { status: "deleted" };

// OperatingPreference (spec §14.2, DOMAIN_MODEL_V1.md §17). Edit/delete/
// disable-for-recommendations only — preferences are only ever created
// through Insight confirmation (see insight.ts), never directly here, so
// every stored preference has a traceable evidence origin.
export function registerOperatingPreferenceRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/operating-preferences", async (request, reply): Promise<OperatingPreferenceListView | OperatingPreferenceErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Operating Preference storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const preferences = await listOperatingPreferences(database, userId);
    return { generatedAt: new Date().toISOString(), preferences };
  });

  app.patch<{ Params: { preferenceId: string }; Body: { value?: number; status?: string } }>(
    "/v1/operating-preferences/:preferenceId",
    async (request, reply): Promise<OperatingPreferenceView | OperatingPreferenceErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Operating Preference storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const { value, status } = request.body ?? {};
      if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value))) {
        reply.code(400);
        return { error: "invalid_request", message: "value must be an integer" };
      }
      if (status !== undefined && !(OPERATING_PREFERENCE_STATUSES as readonly string[]).includes(status)) {
        reply.code(400);
        return { error: "invalid_request", message: `status must be one of ${OPERATING_PREFERENCE_STATUSES.join(", ")}` };
      }
      if (value === undefined && status === undefined) {
        reply.code(400);
        return { error: "invalid_request", message: "value and/or status is required" };
      }

      const outcome = await updateOperatingPreference(
        database,
        userId,
        request.params.preferenceId,
        { ...(value === undefined ? {} : { value }), ...(status === undefined ? {} : { status: status as OperatingPreferenceView["status"] }) },
        new Date()
      );
      if (outcome.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "This Operating Preference no longer exists" };
      }
      if (outcome.status === "invalid_value") {
        reply.code(400);
        return { error: "invalid_request", message: "value is out of the allowed range for this preference" };
      }
      return outcome.preference;
    }
  );

  app.delete<{ Params: { preferenceId: string } }>(
    "/v1/operating-preferences/:preferenceId",
    async (request, reply): Promise<DeletedView | OperatingPreferenceErrorView> => {
      reply.header("cache-control", "no-store");
      if (!database) {
        reply.code(503);
        return { error: "unavailable", message: "Operating Preference storage is unavailable" };
      }

      const userId = await resolveActorUserId(request, database);
      if (!userId) {
        reply.code(401);
        return { error: "unauthenticated", message: "An active LifeOS session is required" };
      }

      const outcome = await deleteOperatingPreference(database, userId, request.params.preferenceId, new Date());
      if (outcome.status === "not_found") {
        reply.code(404);
        return { error: "not_found", message: "This Operating Preference no longer exists" };
      }
      return { status: "deleted" };
    }
  );
}
