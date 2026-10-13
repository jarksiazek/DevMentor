import assert from "node:assert/strict";

import { Migrator } from "@mikro-orm/migrations";
import { describe, it, vi } from "vitest";

const loadRootEnv = vi.hoisted(() => vi.fn());
vi.mock("./env.ts", () => ({ loadRootEnv }));

describe("mikro-orm.config (CLI)", () => {
  it("loads the root env, then adds the migrator and fixed migration settings", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:1/devmentor_test");
    const { default: config } = await import("./mikro-orm.config.ts");
    assert.equal(loadRootEnv.mock.calls.length, 1);
    assert.equal(config.clientUrl, "postgresql://user:pass@127.0.0.1:1/devmentor_test");
    assert.deepEqual(config.extensions, [Migrator]);
    assert.equal(config.migrations?.path, "./src/migrations");
    assert.equal(config.migrations?.emit, "ts");
    assert.equal(config.migrations?.snapshotName, ".snapshot-devmentor-schema");
  });
});
