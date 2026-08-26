import assert from "node:assert/strict";
import test from "node:test";
import { hashSessionToken, readSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

test("session token hashing is deterministic and never returns the raw token", () => {
  const token = "a".repeat(43);
  const hash = hashSessionToken(token);

  assert.equal(hash, hashSessionToken(token));
  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
});

test("session cookie parser reads only the LifeOS cookie", () => {
  const token = "session-token-value";
  const header = `other=ignored; ${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; theme=dark`;

  assert.equal(readSessionToken(header), token);
  assert.equal(readSessionToken("other=value"), null);
  assert.equal(readSessionToken(undefined), null);
  assert.equal(readSessionToken(`${SESSION_COOKIE_NAME}=`), null);
});

test("malformed cookie encoding is treated as unauthenticated", () => {
  assert.equal(readSessionToken(`${SESSION_COOKIE_NAME}=%E0%A4%A`), null);
});
