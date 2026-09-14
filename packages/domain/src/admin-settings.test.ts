import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAdminSettingsError, maskKey, parseAdminSettingsUpdate } from "./admin-settings.js";

test("accepts a provider, model and key", () => {
  const parsed = parseAdminSettingsUpdate({
    aiProvider: "openai",
    aiModel: "gpt-4o-mini",
    aiApiKey: "sk-1234567890abcdefghij"
  });
  assert.equal(isAdminSettingsError(parsed), false);
  if (isAdminSettingsError(parsed)) return;
  assert.equal(parsed.aiProvider, "openai");
  assert.equal(parsed.aiModel, "gpt-4o-mini");
  assert.equal(parsed.aiApiKey, "sk-1234567890abcdefghij");
});

test("rejects an unknown provider", () => {
  const parsed = parseAdminSettingsUpdate({ aiProvider: "gemini" });
  assert.equal(isAdminSettingsError(parsed), true);
});

test("rejects a key that is too short or contains spaces", () => {
  assert.equal(isAdminSettingsError(parseAdminSettingsUpdate({ aiApiKey: "sk-short" })), true);
  assert.equal(isAdminSettingsError(parseAdminSettingsUpdate({ aiApiKey: "sk-1234567890 abcdefghij" })), true);
});

test("empty strings clear the stored value", () => {
  const parsed = parseAdminSettingsUpdate({ aiApiKey: "   ", aiModel: "" });
  assert.equal(isAdminSettingsError(parsed), false);
  if (isAdminSettingsError(parsed)) return;
  assert.equal(parsed.aiApiKey, null);
  assert.equal(parsed.aiModel, null);
});

test("an empty body is rejected", () => {
  assert.equal(isAdminSettingsError(parseAdminSettingsUpdate({})), true);
  assert.equal(isAdminSettingsError(parseAdminSettingsUpdate(null)), true);
});

test("maskKey shows only the last four characters", () => {
  assert.equal(maskKey("sk-1234567890abcdefghij"), "••••ghij");
});

test("custom provider requires a base url", () => {
  const parsed = parseAdminSettingsUpdate({ aiProvider: "custom", aiBaseUrl: "" });
  assert.equal(isAdminSettingsError(parsed), true);
});

test("custom provider keeps a normalised base url", () => {
  const parsed = parseAdminSettingsUpdate({ aiProvider: "custom", aiBaseUrl: "https://openrouter.ai/api/v1/" });
  assert.equal(isAdminSettingsError(parsed), false);
  if (isAdminSettingsError(parsed)) return;
  assert.equal(parsed.aiBaseUrl, "https://openrouter.ai/api/v1");
});

test("base url must be an absolute http(s) url", () => {
  for (const value of ["openrouter.ai/api", "ftp://x.dev/v1", "https://x.dev/v1?key=1"]) {
    assert.equal(isAdminSettingsError(parseAdminSettingsUpdate({ aiBaseUrl: value })), true, value);
  }
});

test("model names may be namespaced like openrouter models", () => {
  const parsed = parseAdminSettingsUpdate({ aiModel: "meta-llama/llama-3.1-8b-instruct" });
  assert.equal(isAdminSettingsError(parsed), false);
  if (isAdminSettingsError(parsed)) return;
  assert.equal(parsed.aiModel, "meta-llama/llama-3.1-8b-instruct");
});
