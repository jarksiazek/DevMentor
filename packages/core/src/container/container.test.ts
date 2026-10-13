import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const { getOrm } = vi.hoisted(() => ({ getOrm: vi.fn() }));

vi.mock("@devmentor/db", () => ({
  getOrm,
  User: class User {},
  UniqueConstraintViolationException: class UniqueConstraintViolationException extends Error {},
}));

import { EventBus } from "../events/event-bus.ts";
import { UserService } from "../services/auth/user.service.ts";
import { HealthService } from "../services/health/health.service.ts";

import { createRequestScope, getContainer, withRequestScope, type AppContainer } from "./container.ts";

const globalForContainer = globalThis as typeof globalThis & { __devmentorContainer?: Promise<AppContainer> };

function fakeOrm() {
  let forks = 0;
  return { em: { fork: vi.fn(() => ({ fork: (forks += 1) })) } };
}

afterEach(() => {
  globalForContainer.__devmentorContainer = undefined;
});

describe("getContainer", () => {
  it("builds the root container once and caches it on globalThis", async () => {
    const orm = fakeOrm();
    getOrm.mockResolvedValue(orm);
    const first = getContainer();
    assert.equal(getContainer(), first);
    assert.equal(globalForContainer.__devmentorContainer, first);
    const container = await first;
    assert.equal(getOrm.mock.calls.length, 1);
    assert.equal(container.cradle.orm, orm);
    assert.ok(container.cradle.eventBus instanceof EventBus);
    assert.ok(container.cradle.healthService instanceof HealthService);
  });

  it("registers the event subscribers", async () => {
    getOrm.mockResolvedValue(fakeOrm());
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const container = await getContainer();
    await container.cradle.eventBus.emit("auth.user.created", { userId: "u1" });
    assert.equal(info.mock.calls.length, 1);
    assert.match(String(info.mock.calls[0][0]), /User created.*u1/);
  });

  it("forgets a failed build so the next call retries", async () => {
    getOrm.mockRejectedValueOnce(new Error("DATABASE_URL is not set"));
    await assert.rejects(getContainer(), /DATABASE_URL is not set/);
    assert.equal(globalForContainer.__devmentorContainer, undefined);
    getOrm.mockResolvedValueOnce(fakeOrm());
    assert.ok(await getContainer());
  });
});

describe("request scopes", () => {
  it("gives every scope its own EntityManager fork and UserService", async () => {
    const orm = fakeOrm();
    getOrm.mockResolvedValue(orm);
    const a = await createRequestScope();
    const b = await createRequestScope();
    assert.equal(a.cradle.em, a.cradle.em);
    assert.notEqual(a.cradle.em, b.cradle.em);
    assert.equal(orm.em.fork.mock.calls.length, 2);
    assert.ok(a.cradle.userService instanceof UserService);
    assert.notEqual(a.cradle.userService, b.cradle.userService);
    assert.equal(a.cradle.eventBus, b.cradle.eventBus);
  });

  async function spyOnScopes() {
    getOrm.mockResolvedValue(fakeOrm());
    const container = await getContainer();
    const createScope = container.createScope.bind(container);
    const disposals: unknown[] = [];
    vi.spyOn(container, "createScope").mockImplementation(() => {
      const scope = createScope();
      const dispose = scope.dispose.bind(scope);
      vi.spyOn(scope, "dispose").mockImplementation(async () => {
        disposals.push(scope);
        return dispose();
      });
      return scope;
    });
    return disposals;
  }

  it("withRequestScope returns the callback result and disposes the scope", async () => {
    const disposals = await spyOnScopes();
    const result = await withRequestScope(async (cradle) => {
      assert.ok(cradle.userService instanceof UserService);
      return "done";
    });
    assert.equal(result, "done");
    assert.equal(disposals.length, 1);
  });

  it("withRequestScope disposes the scope when the callback throws", async () => {
    const disposals = await spyOnScopes();
    await assert.rejects(
      withRequestScope(async () => {
        throw new Error("boom");
      }),
      /boom/,
    );
    assert.equal(disposals.length, 1);
  });
});
