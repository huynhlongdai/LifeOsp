import { buildApp } from "./app.js";
import { loadApiConfig } from "./config.js";

let config;
try {
  config = loadApiConfig(process.env);
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown configuration error";
  process.stderr.write(`[lifeos-api] configuration error: ${message}\n`);
  process.exit(1);
}

const app = buildApp(config.databaseUrl ? { databaseUrl: config.databaseUrl } : {});

const start = async () => {
  try {
    await app.listen({ port: config.port, host: config.host });
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
