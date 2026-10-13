import assert from "node:assert/strict";

import { afterEach, beforeEach, describe, it, vi } from "vitest";

const init = vi.hoisted(() => vi.fn());

vi.mock("@mikro-orm/postgresql", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mikro-orm/postgresql")>();
  return { ...actual, MikroORM: { init } };
});

const { closeOrm, getOrm } = await import("./orm.ts");

const globalForOrm = globalThis as typeof globalThis & { __devmentorOrm?: Promise<unknown> };

function fakeOrm() {
  return { close: vi.fn(async () => {}) };
}

describe("getOrm / closeOrm", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:1/devmentor_test");
    init.mockReset();
    globalForOrm.__devmentorOrm = undefined;
  });

  afterEach(() => {
    globalForOrm.__devmentorOrm = undefined;
  });

  it("initializes one ORM per process and caches it on globalThis", async () => {
    const orm = fakeOrm();
    init.mockResolvedValue(orm);
    assert.equal(await getOrm(), orm);
    assert.equal(await getOrm(), orm);
    assert.equal(init.mock.calls.length, 1);
    assert.equal(init.mock.calls[0][0].clientUrl, "postgresql://user:pass@127.0.0.1:1/devmentor_test");
    assert.equal(await globalForOrm.__devmentorOrm, orm);
  });

  it("forgets a failed initialization so the next call retries", async () => {
    init.mockRejectedValueOnce(new Error("connection refused"));
    await assert.rejects(getOrm(), /connection refused/);
    assert.equal(globalForOrm.__devmentorOrm, undefined);

    const orm = fakeOrm();
    init.mockResolvedValueOnce(orm);
    assert.equal(await getOrm(), orm);
    assert.equal(init.mock.calls.length, 2);
  });

  it("closes the cached ORM and clears the cache", async () => {
    const orm = fakeOrm();
    init.mockResolvedValue(orm);
    await getOrm();
    await closeOrm();
    assert.equal(orm.close.mock.calls.length, 1);
    assert.equal(globalForOrm.__devmentorOrm, undefined);
  });

  it("is a no-op when no ORM is open", async () => {
    await closeOrm();
    assert.equal(init.mock.calls.length, 0);
  });
});
