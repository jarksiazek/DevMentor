import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EventBus } from "./event-bus.ts";

describe("EventBus", () => {
  it("delivers typed payloads until unsubscribed", async () => {
    const bus = new EventBus();
    const received: string[] = [];
    const off = bus.on("auth.user.created", ({ userId }) => {
      received.push(userId);
    });
    await bus.emit("auth.user.created", { userId: "a" });
    off();
    await bus.emit("auth.user.created", { userId: "b" });
    assert.deepEqual(received, ["a"]);
  });

  it("logs a failing listener without failing the emitter or skipping others", async (t) => {
    const errors = t.mock.method(console, "error", () => {});
    const bus = new EventBus();
    const received: string[] = [];
    bus.on("auth.user.created", () => {
      throw new Error("boom");
    });
    bus.on("auth.user.created", ({ userId }) => {
      received.push(userId);
    });
    await bus.emit("auth.user.created", { userId: "a" });
    assert.deepEqual(received, ["a"]);
    assert.equal(errors.mock.callCount(), 1);
  });
});
