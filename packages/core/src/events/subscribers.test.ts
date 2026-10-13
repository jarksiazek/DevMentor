import assert from "node:assert/strict";
import { it, vi } from "vitest";

import { EventBus } from "./event-bus.ts";
import { registerSubscribers } from "./subscribers.ts";

it("logs auth.user.created", async () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const bus = new EventBus();
  registerSubscribers(bus);
  await bus.emit("auth.user.created", { userId: "u1" });
  assert.equal(info.mock.calls.length, 1);
  const line = JSON.parse(String(info.mock.calls[0][0]));
  assert.equal(line.message, "User created");
  assert.equal(line.userId, "u1");
});
