import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

import { logger, redactForLog } from "./logger.ts";

it("redacts sensitive keys at any depth", () => {
  const redacted = redactForLog({
    email: "a@b.c",
    password: "hunter2",
    nested: { accessToken: "t", headers: { Authorization: "Bearer x", cookie: "s=1" } },
  });
  assert.deepEqual(redacted, {
    email: "a@b.c",
    password: "[redacted]",
    nested: { accessToken: "[redacted]", headers: { Authorization: "[redacted]", cookie: "[redacted]" } },
  });
});

it("serializes errors, walks arrays and stops at the depth limit", () => {
  const error = new Error("boom");
  assert.deepEqual(redactForLog(error), { name: "Error", message: "boom", stack: error.stack });
  assert.deepEqual(redactForLog([{ token: "t" }, 1, null]), [{ token: "[redacted]" }, 1, null]);
  const deep = { password: "p" };
  assert.deepEqual(redactForLog({ a: { b: { c: { d: { e: deep } } } } }), { a: { b: { c: { d: { e: deep } } } } });
});

describe("logger", () => {
  for (const level of ["info", "warn", "error"] as const) {
    it(`writes ${level} JSON lines to console.${level} with redaction`, () => {
      const write = vi.spyOn(console, level).mockImplementation(() => {});
      logger[level]("hello", { userId: "u1", secret: "s" });
      assert.equal(write.mock.calls.length, 1);
      const line = JSON.parse(String(write.mock.calls[0][0]));
      assert.equal(line.level, level);
      assert.equal(line.message, "hello");
      assert.equal(line.userId, "u1");
      assert.equal(line.secret, "[redacted]");
      assert.ok(!Number.isNaN(Date.parse(line.time)));
    });
  }

  it("writes lines without context", () => {
    const write = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("plain");
    assert.deepEqual(Object.keys(JSON.parse(String(write.mock.calls[0][0]))), ["level", "time", "message"]);
  });
});
