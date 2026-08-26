import { existsSync } from "node:fs";
import process from "node:process";
import { loadLifeOSEnv, pnpmCommand, run, start, stop } from "./runtime.mjs";

loadLifeOSEnv();
process.env.HOST = "127.0.0.1";
process.env.PORT = "4000";

const requiredArtifacts = ["apps/api/dist/server.js", "apps/web/dist/index.html"];
for (const artifact of requiredArtifacts) {
  if (!existsSync(artifact)) {
    throw new Error(`Missing built artifact ${artifact}; run pnpm build before foundation:smoke`);
  }
}

async function fetchWithTimeout(url) {
  return fetch(url, { signal: AbortSignal.timeout(1_000) });
}

async function waitForJson(url, predicate, label) {
  let lastError;
  for (let attempt = 1; attempt <= 25; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      const body = await response.json();
      if (predicate(response, body)) return body;
      lastError = new Error(`${label} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become healthy: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function waitForWeb() {
  let lastError;
  for (let attempt = 1; attempt <= 25; attempt += 1) {
    try {
      const response = await fetchWithTimeout("http://127.0.0.1:4322/");
      const html = await response.text();
      if (response.ok && html.includes("<title>LifeOS</title>")) return;
      lastError = new Error(`Web returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Built Web preview did not become healthy: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

let apiProcess;
let webProcess;

try {
  process.stdout.write("[foundation-smoke] applying migrations (idempotency check)\n");
  run(pnpmCommand, ["--filter", "@lifeos/db", "db:migrate"]);

  process.stdout.write("[foundation-smoke] starting built API\n");
  apiProcess = start(process.execPath, ["apps/api/dist/server.js"], { stdio: "inherit" });

  await waitForJson(
    "http://127.0.0.1:4000/ready",
    (response, body) => response.ok && body?.status === "ready" && body?.checks?.database === "ok",
    "API readiness"
  );

  process.stdout.write("[foundation-smoke] starting built Web preview\n");
  webProcess = start(pnpmCommand, ["--filter", "@lifeos/web", "preview"], { stdio: "inherit" });
  await waitForWeb();

  const health = await waitForJson(
    "http://127.0.0.1:4322/health",
    (response, body) => response.ok && body?.status === "ok" && body?.service === "lifeos-api",
    "Web-origin API health"
  );

  const readiness = await waitForJson(
    "http://127.0.0.1:4322/ready",
    (response, body) => response.ok && body?.status === "ready" && body?.checks?.database === "ok",
    "Web-origin API readiness"
  );

  process.stdout.write(`[foundation-smoke] Web → API health OK at ${health.timestamp}\n`);
  process.stdout.write(`[foundation-smoke] Web → API → DB readiness OK at ${readiness.timestamp}\n`);
} finally {
  await stop(webProcess);
  await stop(apiProcess);
}
