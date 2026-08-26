import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  type CaptureInterpretationContentV1
} from "@lifeos/domain";
import { buildApp } from "./app.js";
import { SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Vertical Slice A container smoke");

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const composeArgs = ["compose", "-f", "compose.dev.yml"];

function docker(args: string[], options: { quiet?: boolean } = {}) {
  return execFileSync("docker", [...composeArgs, ...args], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    stdio: options.quiet ? ["ignore", "pipe", "pipe"] : "inherit"
  });
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const containerId = docker(["ps", "-q", "postgres"], { quiet: true }).trim();
      if (containerId) {
        const health = execFileSync(
          "docker",
          ["inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}", containerId],
          { encoding: "utf8" }
        ).trim();
        if (health === "healthy") return;
      }
    } catch {
      // The container can briefly disappear between rm and up; retry deterministically.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("PostgreSQL did not become healthy after container recreation");
}

function cookieHeader(setCookieHeader: string | string[] | undefined): string {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie, "expected session Set-Cookie header");
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1], "expected LifeOS session cookie");
  return `${SESSION_COOKIE_NAME}=${match[1]}`;
}

const rawText = "I need one direction. Focus LifeOS, maintain family time, keep the side project for later.";
const manualContent: CaptureInterpretationContentV1 = {
  concerns: [],
  ideas: [],
  commitments: [
    { text: "Maintain family time", confidence: "high", sourceExcerpt: "maintain family time" }
  ],
  possibleProjects: [
    { text: "Side project", confidence: "high", sourceExcerpt: "side project for later" }
  ],
  possibleDirections: [
    { text: "Focus LifeOS", confidence: "high", sourceExcerpt: "Focus LifeOS" }
  ],
  questions: [],
  uncertainties: []
};

let app = buildApp({ databaseUrl });
try {
  const session = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
  assert.equal(session.statusCode, 201);
  const cookie = cookieHeader(session.headers["set-cookie"]);

  const capture = await app.inject({
    method: "POST",
    url: "/v1/captures",
    headers: { cookie },
    payload: { rawText }
  });
  assert.equal(capture.statusCode, 201);
  const captureId = capture.json().id as string;

  const manual = await app.inject({
    method: "POST",
    url: `/v1/captures/${captureId}/interpretations/manual`,
    headers: { cookie },
    payload: { baseVersion: 0, content: manualContent }
  });
  assert.equal(manual.statusCode, 201);
  assert.equal(manual.json().contractVersion, CAPTURE_INTERPRETATION_CONTRACT_VERSION);

  const prepared = await app.inject({
    method: "POST",
    url: `/v1/captures/${captureId}/promotion/prepare`,
    headers: { cookie },
    payload: {
      interpretationVersion: 1,
      activeText: "Focus LifeOS",
      maintainTexts: ["Maintain family time"],
      notNowItems: [{ text: "Side project", kind: "project_candidate" }],
      direction: { title: "Focus LifeOS" },
      season: {
        title: "Protect one clear focus",
        purpose: "Prove the durable LifeOS loop survives database container recreation.",
        primaryFocusText: "Focus LifeOS"
      }
    }
  });
  assert.equal(prepared.statusCode, 201);

  const confirmed = await app.inject({
    method: "POST",
    url: `/v1/clarity-promotions/${prepared.json().recommendationId as string}/confirm`,
    headers: { cookie },
    payload: {
      direction: { title: "Focus LifeOS" },
      season: {
        title: "Protect one clear focus",
        purpose: "Prove the durable LifeOS loop survives database container recreation.",
        primaryFocusText: "Focus LifeOS"
      }
    }
  });
  assert.equal(confirmed.statusCode, 200);

  await app.close();

  docker(["stop", "postgres"]);
  docker(["rm", "-f", "postgres"]);
  docker(["up", "-d", "postgres"]);
  await waitForPostgres();

  app = buildApp({ databaseUrl });

  const restoredCapture = await app.inject({
    method: "GET",
    url: `/v1/captures/${captureId}`,
    headers: { cookie }
  });
  assert.equal(restoredCapture.statusCode, 200);
  assert.equal(restoredCapture.json().rawText, rawText);
  assert.equal(restoredCapture.json().processingStatus, "promoted");

  const restoredInterpretation = await app.inject({
    method: "GET",
    url: `/v1/captures/${captureId}/interpretations/latest`,
    headers: { cookie }
  });
  assert.equal(restoredInterpretation.statusCode, 200);
  assert.equal(restoredInterpretation.json().version, 1);
  assert.equal(restoredInterpretation.json().author, "user");

  const restoredDirection = await app.inject({
    method: "GET",
    url: "/v1/direction/current",
    headers: { cookie }
  });
  assert.equal(restoredDirection.statusCode, 200);
  assert.equal(restoredDirection.json().direction.title, "Focus LifeOS");
  assert.equal(restoredDirection.json().season.title, "Protect one clear focus");

  console.log(
    JSON.stringify({
      status: "ok",
      captureId,
      directionId: restoredDirection.json().direction.id,
      seasonId: restoredDirection.json().season.id
    })
  );
} finally {
  await app.close().catch(() => undefined);
}
