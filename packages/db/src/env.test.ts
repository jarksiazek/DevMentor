import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, it, vi } from "vitest";

const loadEnvConfig = vi.hoisted(() => vi.fn());
vi.mock("@next/env", () => ({ default: { loadEnvConfig } }));

const { loadRootEnv, repoRoot } = await import("./env.ts");

describe("env", () => {
  it("resolves repoRoot to the monorepo root", () => {
    assert.ok(existsSync(join(repoRoot, "packages", "db", "package.json")));
    assert.ok(existsSync(join(repoRoot, "package-lock.json")));
  });

  it("loads the root .env files in dev mode outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    loadRootEnv();
    assert.deepEqual(loadEnvConfig.mock.calls.at(-1), [repoRoot, true]);
  });

  it("loads the root .env files in production mode in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    loadRootEnv();
    assert.deepEqual(loadEnvConfig.mock.calls.at(-1), [repoRoot, false]);
  });
});
