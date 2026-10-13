import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// @next/env is a CJS bundle without static named exports: default-import it under native ESM.
import nextEnv from "@next/env";

/** Absolute path of the monorepo root, where the shared `.env*` files live. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Loads `.env*` from the repo root for processes started outside Next.js (MikroORM CLI, scripts). */
export function loadRootEnv(): void {
  nextEnv.loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production");
}
