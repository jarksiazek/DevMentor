import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

vi.mock("@devmentor/db", () => ({
  User: class User {},
  UniqueConstraintViolationException: class UniqueConstraintViolationException extends Error {},
}));

import { UniqueConstraintViolationException, User, type EntityManager } from "@devmentor/db";

import { EventBus } from "../../events/event-bus.ts";
import { ConflictError, NotFoundError } from "../../http/errors.ts";

import { UserService } from "./user.service.ts";

const USER = { id: "8f7b5b3e-3c1a-4c55-9d7e-2b8f0f6a1c11", name: "Ada", email: "ada@example.com" };

function setup({ found = USER as object | null } = {}) {
  const em = {
    findAndCount: vi.fn(async () => [[USER], 7]),
    findOne: vi.fn(async () => (found ? { ...found } : null)),
    create: vi.fn((_entity: unknown, data: object) => ({ id: USER.id, ...data })),
    assign: vi.fn((target: object, data: object) => Object.assign(target, data)),
    remove: vi.fn(),
    flush: vi.fn(async () => {}),
  };
  const eventBus = new EventBus();
  const emit = vi.spyOn(eventBus, "emit");
  const service = new UserService({ em: em as unknown as EntityManager, eventBus });
  return { em, emit, service };
}

function uniqueViolation(): Error {
  const Exception = UniqueConstraintViolationException as unknown as new () => Error;
  return new Exception();
}

describe("UserService", () => {
  it("lists newest first with offset pagination", async () => {
    const { em, service } = setup();
    assert.deepEqual(await service.list({ page: 3, pageSize: 5 }), { items: [USER], total: 7, page: 3, pageSize: 5 });
    assert.deepEqual(em.findAndCount.mock.calls[0], [User, {}, { orderBy: { createdAt: "desc" }, limit: 5, offset: 10 }]);
  });

  it("gets a user by id or throws NotFoundError", async () => {
    const { em, service } = setup();
    assert.deepEqual(await service.get(USER.id), USER);
    assert.deepEqual(em.findOne.mock.calls[0], [User, { id: USER.id }]);

    const missing = setup({ found: null });
    await assert.rejects(missing.service.get(USER.id), (error: unknown) => {
      assert.ok(error instanceof NotFoundError);
      assert.equal(error.message, "User not found");
      return true;
    });
  });

  it("creates only from name and email, flushes, then emits auth.user.created", async () => {
    const { em, emit, service } = setup();
    const user = await service.create({ name: "Ada", email: "ada@example.com" });
    assert.deepEqual(user, USER);
    assert.deepEqual(em.create.mock.calls[0], [User, { name: "Ada", email: "ada@example.com" }]);
    assert.equal(em.flush.mock.calls.length, 1);
    assert.deepEqual(emit.mock.calls, [["auth.user.created", { userId: USER.id }]]);
    assert.ok(em.flush.mock.invocationCallOrder[0] < emit.mock.invocationCallOrder[0]);
  });

  it("maps a unique email violation to ConflictError and emits nothing", async () => {
    const { em, emit, service } = setup();
    em.flush.mockRejectedValueOnce(uniqueViolation());
    await assert.rejects(service.create({ name: "Ada", email: "ada@example.com" }), (error: unknown) => {
      assert.ok(error instanceof ConflictError);
      assert.equal(error.message, "A user with this email already exists");
      return true;
    });
    assert.equal(emit.mock.calls.length, 0);
  });

  it("rethrows other flush errors unchanged", async () => {
    const { em, service } = setup();
    const failure = new Error("connection lost");
    em.flush.mockRejectedValueOnce(failure);
    await assert.rejects(service.create({ name: "Ada", email: "ada@example.com" }), (error: unknown) => error === failure);
  });

  it("updates name and email of an existing user", async () => {
    const { em, service } = setup();
    const user = await service.update(USER.id, { name: "Grace", email: "grace@example.com" });
    assert.deepEqual(user, { ...USER, name: "Grace", email: "grace@example.com" });
    assert.deepEqual(em.assign.mock.calls[0][1], { name: "Grace", email: "grace@example.com" });
    assert.equal(em.flush.mock.calls.length, 1);
  });

  it("maps a unique violation on update to ConflictError", async () => {
    const { em, service } = setup();
    em.flush.mockRejectedValueOnce(uniqueViolation());
    await assert.rejects(service.update(USER.id, { name: "Ada", email: "taken@example.com" }), ConflictError);
  });

  it("deletes an existing user and returns its id", async () => {
    const { em, service } = setup();
    assert.deepEqual(await service.delete(USER.id), { id: USER.id });
    assert.deepEqual(em.remove.mock.calls[0][0], USER);
    assert.equal(em.flush.mock.calls.length, 1);
  });

  it("does not delete a missing user", async () => {
    const { em, service } = setup({ found: null });
    await assert.rejects(service.delete(USER.id), NotFoundError);
    assert.equal(em.remove.mock.calls.length, 0);
  });
});
