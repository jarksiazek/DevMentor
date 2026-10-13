import { defineConfig, type Options } from "@mikro-orm/postgresql";

import { entities } from "./entities/index.ts";

function intFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : Number.parseInt(value, 10);
}

/** Runtime ORM options shared by the app and the MikroORM CLI. */
export function createOrmConfig(overrides: Options = {}): Options {
  const clientUrl = process.env.DATABASE_URL;
  if (!clientUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and adjust it.");
  }

  return defineConfig({
    clientUrl,
    entities,
    pool: {
      min: intFromEnv("DATABASE_POOL_MIN", 0),
      max: intFromEnv("DATABASE_POOL_MAX", 10),
    },
    debug: process.env.DATABASE_DEBUG === "true",
    ...overrides,
  });
}
