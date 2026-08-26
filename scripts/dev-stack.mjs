import { spawnSync } from "node:child_process";
import process from "node:process";
import { loadLifeOSEnv, pnpmCommand, run, start, stop } from "./runtime.mjs";

loadLifeOSEnv();

const composeArgs = ["compose", "-f", "compose.dev.yml"];

function compose(args, options = {}) {
  run("docker", [...composeArgs, ...args], options);
}

function databaseReady() {
  const result = spawnSync(
    "docker",
    [
      ...composeArgs,
      "exec",
      "-T",
      "postgres",
      "pg_isready",
      "-U",
      process.env.POSTGRES_USER,
      "-d",
      process.env.POSTGRES_DB
    ],
    { stdio: "ignore", env: process.env }
  );
  return result.status === 0;
}

async function waitForDatabase() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (databaseReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("PostgreSQL did not become ready within 30 seconds");
}

let devProcess;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (signal) process.stderr.write(`[lifeos-dev] received ${signal}; stopping application processes\n`);
  await stop(devProcess);
}

try {
  process.stdout.write("[lifeos-dev] starting PostgreSQL\n");
  compose(["up", "-d", "postgres"]);
  await waitForDatabase();

  process.stdout.write("[lifeos-dev] applying database migrations\n");
  run(pnpmCommand, ["--filter", "@lifeos/db", "db:migrate"]);

  process.stdout.write("[lifeos-dev] starting Web + API + shared package watchers\n");
  devProcess = start(pnpmCommand, ["dev"], { stdio: "inherit" });

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  const exitCode = await new Promise((resolve, reject) => {
    devProcess.once("error", reject);
    devProcess.once("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });

  await shutdown();
  process.exitCode = exitCode;
} catch (error) {
  await shutdown();
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[lifeos-dev] startup failed: ${message}\n`);
  process.exitCode = 1;
}
