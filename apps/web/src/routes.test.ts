import assert from "node:assert/strict";
import test from "node:test";
import { resolveRoute } from "./routes";

test("NOW is the default root route", () => {
  assert.equal(resolveRoute("/")?.key, "now");
});

test("foundation routes resolve deterministically", () => {
  assert.equal(resolveRoute("/direction")?.key, "direction");
  assert.equal(resolveRoute("/execute/")?.key, "execute");
  assert.equal(resolveRoute("/reflect")?.key, "reflect");
  assert.equal(resolveRoute("/me")?.key, "me");
  assert.equal(resolveRoute("/unknown"), null);
});
