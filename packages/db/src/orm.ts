import { MikroORM } from "@mikro-orm/postgresql";

import { createOrmConfig } from "./config.ts";

// One ORM (and connection pool) per process. Cached on globalThis so Next.js
// dev-server hot reloads reuse it instead of opening a new pool each time.
const globalForOrm = globalThis as typeof globalThis & {
  __devmentorOrm?: Promise<MikroORM>;
};

export function getOrm(): Promise<MikroORM> {
  globalForOrm.__devmentorOrm ??= MikroORM.init(createOrmConfig()).catch((error: unknown) => {
    globalForOrm.__devmentorOrm = undefined;
    throw error;
  });
  return globalForOrm.__devmentorOrm;
}

export async function closeOrm(): Promise<void> {
  const orm = globalForOrm.__devmentorOrm;
  globalForOrm.__devmentorOrm = undefined;
  await (await orm)?.close();
}
