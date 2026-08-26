import Fastify from "fastify";
import type { HealthStatus, ReadinessStatus } from "@lifeos/domain";

const app = Fastify({ logger: true });

app.get("/health", async (): Promise<HealthStatus> => ({
  status: "ok",
  service: "lifeos-api",
  timestamp: new Date().toISOString()
}));

app.get("/ready", async (): Promise<ReadinessStatus> => ({
  status: "ready",
  service: "lifeos-api",
  checks: {
    api: "ok"
  },
  timestamp: new Date().toISOString()
}));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void start();
