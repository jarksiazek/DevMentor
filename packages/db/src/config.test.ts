import assert from "node:assert/strict";

import { describe, it, vi } from "vitest";

import { createOrmConfig } from "./config.ts";
import { User } from "./entities/index.ts";

const URL = "postgresql://user:pass@127.0.0.1:1/devmentor_test";

describe("createOrmConfig", () => {
  it("fails fast when DATABASE_URL is not set", () => {
    vi.stubEnv("DATABASE_URL", "");
    assert.throws(() => createOrmConfig(), /DATABASE_URL is not set/);
  });

  it("uses DATABASE_URL, every entity and the default pool bounds", () => {
    vi.stubEnv("DATABASE_URL", URL);
    vi.stubEnv("DATABASE_POOL_MIN", undefined);
    vi.stubEnv("DATABASE_POOL_MAX", "");
    vi.stubEnv("DATABASE_DEBUG", undefined);
    const config = createOrmConfig();
    assert.equal(config.clientUrl, URL);
    assert.deepEqual(config.entities, [User]);
    assert.deepEqual(config.pool, { min: 0, max: 10 });
    assert.equal(config.debug, false);
  });

  it("reads pool bounds and the debug flag from the environment", () => {
    vi.stubEnv("DATABASE_URL", URL);
    vi.stubEnv("DATABASE_POOL_MIN", "2");
    vi.stubEnv("DATABASE_POOL_MAX", "25");
    vi.stubEnv("DATABASE_DEBUG", "true");
    const config = createOrmConfig();
    assert.deepEqual(config.pool, { min: 2, max: 25 });
    assert.equal(config.debug, true);
  });

  it("lets overrides win over the defaults", () => {
    vi.stubEnv("DATABASE_URL", URL);
    const config = createOrmConfig({ debug: true, pool: { min: 1, max: 1 } });
    assert.equal(config.debug, true);
    assert.deepEqual(config.pool, { min: 1, max: 1 });
  });
});
