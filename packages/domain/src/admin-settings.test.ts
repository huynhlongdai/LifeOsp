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
