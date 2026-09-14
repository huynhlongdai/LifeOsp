import Fastify from "fastify";
import { checkDatabase, createDatabaseClient } from "@lifeos/db";
import type { HealthStatus, ReadinessStatus } from "@lifeos/domain";
import { registerAdminSettingsRoutes } from "./admin-settings.js";
import { registerCoachChatRoutes } from "./coach-chat.js";
import { registerDemoSeedRoutes } from "./demo-seed.js";
import { registerActionRoutes, type ActionOptions } from "./action.js";
import { registerCaptureRoutes } from "./capture.js";
import { registerCoachRoutes } from "./coach.js";
import { registerExecuteBoardRoutes } from "./execute-board.js";
import { registerExecutionContextRoutes } from "./execution-context.js";
import { registerFocusRoutes } from "./focus.js";
import { registerIdentityRoutes, type IdentityOptions } from "./identity.js";
import { registerInterpretationRoutes, type InterpretationOptions } from "./interpretation.js";
import { registerInboxRoutes } from "./inbox.js";
import { registerMeRoutes } from "./me.js";
import { registerNextActionRoutes } from "./next-action.js";
import { registerNowRoutes } from "./now.js";
import { registerPreferencesRoutes } from "./preferences.js";
import { registerPromotionRoutes } from "./promotion.js";
import { registerActionStepRoutes } from "./action-steps.js";
import { registerDirectionOutlookRoutes } from "./direction-outlook.js";
import { registerReflectAnalyticsRoutes } from "./reflect-analytics.js";
import { registerReflectWeekRoutes } from "./reflect-week.js";
import { registerResultRoutes } from "./result.js";

export type BuildAppOptions = {
  databaseUrl?: string;
  identity?: IdentityOptions;
  interpretation?: InterpretationOptions;
  action?: ActionOptions;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: true });
  const database = options.databaseUrl ? createDatabaseClient(options.databaseUrl) : null;

  app.get("/health", async (): Promise<HealthStatus> => ({
    status: "ok",
    service: "lifeos-api",
    timestamp: new Date().toISOString()
  }));

  app.get("/ready", async (_request, reply): Promise<ReadinessStatus> => {
    const databaseReady = database ? await checkDatabase(database.pool) : false;
    const status: ReadinessStatus = {
      status: databaseReady ? "ready" : "not_ready",
      service: "lifeos-api",
      checks: {
        api: "ok",
        database: databaseReady ? "ok" : "failed"
      },
      timestamp: new Date().toISOString()
    };

    if (!databaseReady) {
      reply.code(503);
    }

    return status;
  });

  registerIdentityRoutes(app, database, options.identity);
  registerCaptureRoutes(app, database);
  registerInterpretationRoutes(app, database, options.interpretation);
  registerPromotionRoutes(app, database);
  registerExecutionContextRoutes(app, database);
  registerExecuteBoardRoutes(app, database);
  registerActionRoutes(app, database, options.action);
  registerNextActionRoutes(app, database);
  registerMeRoutes(app, database);
  registerInboxRoutes(app, database);
  registerPreferencesRoutes(app, database);
  registerAdminSettingsRoutes(app, database);
  registerCoachChatRoutes(app, database);
  registerDemoSeedRoutes(app, database);
  registerCoachRoutes(app, database);
  registerReflectWeekRoutes(app, database);
  registerReflectAnalyticsRoutes(app, database);
  registerDirectionOutlookRoutes(app, database);
  registerActionStepRoutes(app, database);
  registerNowRoutes(app, database);
  registerFocusRoutes(app, database);
  registerResultRoutes(app, database);

  app.addHook("onClose", async () => {
    if (database) {
      await database.pool.end();
    }
  });

  return app;
}
