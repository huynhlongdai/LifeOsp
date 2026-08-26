import assert from "node:assert/strict";
import test from "node:test";
import { ApiConfigError, loadApiConfig } from "./config.js";

test("API config uses deterministic foundation defaults", () => {
  assert.deepEqual(loadApiConfig({}), {
    host: "0.0.0.0",
    port: 4000
  });
});

test("API config accepts a valid PostgreSQL URL", () => {
  assert.deepEqual(
    loadApiConfig({
      HOST: "127.0.0.1",
      PORT: "4100",
      DATABASE_URL: "postgresql://lifeos:secret@localhost:5432/lifeos"
    }),
    {
      host: "127.0.0.1",
      port: 4100,
      databaseUrl: "postgresql://lifeos:secret@localhost:5432/lifeos"
    }
  );
});

test("API config rejects invalid ports before Fastify starts", () => {
  for (const port of ["abc", "0", "65536", "40.5", ""]) {
    assert.throws(
      () => loadApiConfig({ PORT: port }),
      (error: unknown) => error instanceof ApiConfigError && error.message.includes("PORT")
    );
  }
});

test("API config rejects empty host and non-PostgreSQL database URLs", () => {
  assert.throws(() => loadApiConfig({ HOST: "   " }), /HOST must not be empty/);
  assert.throws(() => loadApiConfig({ DATABASE_URL: "not a url" }), /valid PostgreSQL URL/);
  assert.throws(() => loadApiConfig({ DATABASE_URL: "https://example.com/db" }), /protocol must be/);
});
