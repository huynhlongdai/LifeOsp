import { findMeSnapshot, type DatabaseClient } from "@lifeos/db";
import type { MeView, SeasonId } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type MeErrorView = { error: "unavailable" | "unauthenticated" | "not_found"; message: string };

export function registerMeRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/me", async (request, reply): Promise<MeView | MeErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Profile storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const snapshot = await findMeSnapshot(database, userId);
    if (!snapshot) {
      reply.code(404);
      return { error: "not_found", message: "Profile not found" };
    }

    return {
      memberSince: snapshot.memberSince.toISOString(),
      ...(snapshot.season
        ? {
            season: {
              id: snapshot.season.id as SeasonId,
              title: snapshot.season.title,
              purpose: snapshot.season.purpose,
              ...(snapshot.season.startsOn === null ? {} : { startsOn: snapshot.season.startsOn }),
              ...(snapshot.season.targetEndsOn === null ? {} : { targetEndsOn: snapshot.season.targetEndsOn })
            }
          }
        : {}),
      ...(snapshot.directionTitle === undefined ? {} : { directionTitle: snapshot.directionTitle }),
      stats: {
        focusSessionsTotal: snapshot.stats.focusSessionsTotal,
        focusMinutesLast7Days: snapshot.stats.focusMinutesLast7Days,
        actionsCompletedLast7Days: snapshot.stats.actionsCompletedLast7Days,
        actionsOpen: snapshot.stats.actionsOpen,
        capturesTotal: snapshot.stats.capturesTotal,
        dailyCloseStreak: snapshot.stats.dailyCloseStreak,
        ...(snapshot.stats.lastDailyCloseOn === null ? {} : { lastDailyCloseOn: snapshot.stats.lastDailyCloseOn })
      }
    };
  });
}
