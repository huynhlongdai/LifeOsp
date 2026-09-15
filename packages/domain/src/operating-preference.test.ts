import assert from "node:assert/strict";
import test from "node:test";
import { activePreferenceValue, isValidOperatingPreferenceValue } from "./operating-preference.js";

test("isValidOperatingPreferenceValue enforces a distinct range per known key", () => {
  assert.equal(isValidOperatingPreferenceValue("next_action.target_max_minutes", 45), true);
  assert.equal(isValidOperatingPreferenceValue("next_action.target_max_minutes", 4), false);
  assert.equal(isValidOperatingPreferenceValue("next_action.target_max_minutes", 481), false);
  assert.equal(isValidOperatingPreferenceValue("projects.max_primary_active", 2), true);
  assert.equal(isValidOperatingPreferenceValue("projects.max_primary_active", 0), false);
  assert.equal(isValidOperatingPreferenceValue("projects.max_primary_active", 3.5), false);
});

test("activePreferenceValue ignores disabled preferences and invalid values", () => {
  assert.equal(
    activePreferenceValue([{ key: "next_action.target_max_minutes", status: "disabled", value: 45 }], "next_action.target_max_minutes"),
    undefined
  );
  assert.equal(
    activePreferenceValue([{ key: "next_action.target_max_minutes", status: "active", value: "not a number" }], "next_action.target_max_minutes"),
    undefined
  );
  assert.equal(
    activePreferenceValue([{ key: "next_action.target_max_minutes", status: "active", value: 30 }], "next_action.target_max_minutes"),
    30
  );
});
