import test from "node:test";
import assert from "node:assert/strict";
import { isCoachChatError, parseCoachChatRequest } from "./coach-chat.js";

test("accepts a conversation that ends with a user question", () => {
  const parsed = parseCoachChatRequest({
    messages: [
      { role: "user", content: "Chiều nay tôi hay mất tập trung" },
      { role: "assistant", content: "Bạn đã ghi nhận 3 phiên focus" },
      { role: "user", content: " Tôi nên làm gì? " }
    ]
  });
  assert.equal(isCoachChatError(parsed), false);
  if (isCoachChatError(parsed)) return;
  assert.equal(parsed.messages.length, 3);
  assert.equal(parsed.messages[2]?.content, "Tôi nên làm gì?");
});

test("rejects an empty conversation", () => {
  const parsed = parseCoachChatRequest({ messages: [] });
  assert.equal(isCoachChatError(parsed), true);
});

test("rejects a conversation that does not end with the user", () => {
  const parsed = parseCoachChatRequest({
    messages: [{ role: "assistant", content: "Xin chào" }]
  });
  assert.equal(isCoachChatError(parsed), true);
});

test("rejects blank message content", () => {
  const parsed = parseCoachChatRequest({ messages: [{ role: "user", content: "   " }] });
  assert.equal(isCoachChatError(parsed), true);
});
