import assert from "node:assert/strict";
import test from "node:test";
import { isExecuteBoardEmpty } from "./execute-board.js";

test("Execute board is empty only when every section has no Actions", () => {
  assert.equal(isExecuteBoardEmpty({ ready: [], candidates: [], blocked: [], recentlyFinished: [] }), true);
});

test("Execute board is not empty when any single section has an Action", () => {
  const anAction = { id: "a" } as never;
  assert.equal(isExecuteBoardEmpty({ ready: [anAction], candidates: [], blocked: [], recentlyFinished: [] }), false);
  assert.equal(isExecuteBoardEmpty({ ready: [], candidates: [anAction], blocked: [], recentlyFinished: [] }), false);
  assert.equal(isExecuteBoardEmpty({ ready: [], candidates: [], blocked: [anAction], recentlyFinished: [] }), false);
  assert.equal(isExecuteBoardEmpty({ ready: [], candidates: [], blocked: [], recentlyFinished: [anAction] }), false);
});
