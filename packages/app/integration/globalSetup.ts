import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

const run = promisify(execFile);
const appDir = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const READY_TIMEOUT_MS = 60_000;

/** An ephemeral PostgreSQL, unless `INTEGRATION_DATABASE_URL` points at one (no Docker available). */
async function startDatabase(): Promise<{ url: string; stop: () => Promise<unknown> }> {
  const external = process.env.INTEGRATION_DATABASE_URL;
  if (external) return { url: external, stop: async () => {} };
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
  return { url: container.getConnectionUri(), stop: () => container.stop() };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("No port"))));
    });
  });
}

async function waitUntilHealthy(baseUrl: string, server: ChildProcess, output: () => string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`next start exited with ${server.exitCode}:\n${output()}`);
    try {
      // /api/health answers 200 only after a real round-trip to the database.
      if ((await fetch(`${baseUrl}/api/health`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`App did not become healthy within ${READY_TIMEOUT_MS} ms:\n${output()}`);
}

/**
 * Boots the production build against a fresh, migrated database once per run
 * and provides its URL to the tests as `inject("baseUrl")`.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  if (!existsSync(`${appDir}/.next/BUILD_ID`)) {
    throw new Error("No production build found. Run `npm run build` before `npm run test:integration`.");
  }

  const database = await startDatabase();
  let server: ChildProcess | undefined;
  try {
    await run("npm", ["run", "db:migrate"], { cwd: repoRoot, env: { ...process.env, DATABASE_URL: database.url } });

    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    let logs = "";
    server = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: appDir,
      env: { ...process.env, DATABASE_URL: database.url, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (chunk: Buffer) => (logs += chunk));
    server.stderr?.on("data", (chunk: Buffer) => (logs += chunk));

    await waitUntilHealthy(baseUrl, server, () => logs);
    project.provide("baseUrl", baseUrl);
  } catch (error) {
    server?.kill();
    await database.stop();
    throw error;
  }

  return async () => {
    server?.kill();
    await database.stop();
  };
}
