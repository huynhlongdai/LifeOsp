import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

export const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

export function loadLifeOSEnv() {
  if (existsSync(".env")) {
    process.loadEnvFile(".env");
  }

  process.env.POSTGRES_DB ??= "lifeos";
  process.env.POSTGRES_USER ??= "lifeos";
  process.env.POSTGRES_PASSWORD ??= "lifeos_dev_only";
  process.env.POSTGRES_PORT ??= "5432";
  process.env.DATABASE_URL ??= `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@127.0.0.1:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
  process.env.HOST ??= "0.0.0.0";
  process.env.PORT ??= "4000";

  return process.env;
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    ...options
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${result.status ?? "unknown"}`);
  }
}

export function start(command, args, options = {}) {
  return spawn(command, args, {
    env: process.env,
    ...options
  });
}

export async function stop(child) {
  if (!child || child.exitCode !== null || child.killed) return;

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);

  if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
}
