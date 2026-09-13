import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "./app.js";

test("GET /health is live without downstream dependencies", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/health" });
    assert.equal(response.statusCode, 200);

    const body = response.json();
    assert.equal(body.status, "ok");
    assert.equal(body.service, "lifeos-api");
  } finally {
    await app.close();
  }
});

test("GET /ready reports not ready when database is not configured", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/ready" });
    assert.equal(response.statusCode, 503);

    const body = response.json();
    assert.equal(body.status, "not_ready");
    assert.equal(body.checks.api, "ok");
    assert.equal(body.checks.database, "failed");
  } finally {
    await app.close();
  }
});

test("session bootstrap reports unavailable without database while health remains live", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { status: "unavailable" });
    assert.equal(response.headers["cache-control"], "no-store");

    const health = await app.inject({ method: "GET", url: "/health" });
    assert.equal(health.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("Capture create reports unavailable without database", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/captures",
      payload: { rawText: "A thought I do not want to lose" }
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), {
      error: "unavailable",
      message: "Capture storage is unavailable"
    });
    assert.equal(response.headers["cache-control"], "no-store");
  } finally {
    await app.close();
  }
});

test("B5 routes remain available and fail safely without result storage", async () => {
  const app = buildApp();

  try {
    for (const request of [
      { method: "GET" as const, url: "/v1/actions" },
      { method: "POST" as const, url: "/v1/daily-closes", payload: { date: "2026-09-13" } },
      { method: "GET" as const, url: "/v1/daily-closes/2026-09-13" }
    ]) {
      const response = await app.inject(request);
      assert.equal(response.statusCode, 503);
      assert.equal(response.headers["cache-control"], "no-store");
    }
  } finally {
    await app.close();
  }
});
