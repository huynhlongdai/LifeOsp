import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("A4 stylesheet uses real newlines and keeps clarity promotion selectors", () => {
  assert.equal(
    stylesheet.includes("\\n"),
    false,
    "styles.css must not contain literal escaped newline sequences"
  );
  assert.match(stylesheet, /\.tradeoff-list\s*\{/);
  assert.match(stylesheet, /\.bucket-button\.selected\.active\s*\{/);
  assert.match(stylesheet, /\.current-season-card\s*\{/);
});
