import assert from "node:assert/strict";
import { it } from "node:test";

import { redactForLog } from "./logger.ts";

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
