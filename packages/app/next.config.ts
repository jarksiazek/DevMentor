import { fileURLToPath } from "node:url";

// Named import on purpose: Next compiles this file to CJS, where the default import is undefined.
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Single source of `.env*` files for the whole monorepo: the repo root.
// forceReload is required: Next has already loaded (and cached) env from this
// package's directory before evaluating the config.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
  // Node-only database stack: load with native require instead of bundling.
  // (@mikro-orm/core and pg are already in Next's default list.)
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations", "kysely"],
};

export default nextConfig;
