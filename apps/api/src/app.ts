import Fastify from "fastify";
import { checkDatabase, createDatabaseClient } from "@lifeos/db";
import type { HealthStatus, ReadinessStatus } from "@lifeos/domain";
import { registerCaptureRoutes } from "./capture.js";
import { registerIdentityRoutes, type IdentityOptions } from "./identity.js";
import { registerInterpretationRoutes, type InterpretationOptions } from "./interpretation.js";
import { registerPromotionRoutes } from "./promotion.js";

export type BuildAppOptions = {
  databaseUrl?: string;
  identity?: IdentityOptions;
  interpretation?: InterpretationOptions;
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

  app.addHook("onClose", async () => {
    if (database) {
      await database.pool.end();
    }
  });

  return app;
}
