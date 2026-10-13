// Config for the MikroORM CLI only (migrations, schema tools). Run CLI commands
// through the npm scripts so the working directory is packages/db.
import { Migrator } from "@mikro-orm/migrations";

import { createOrmConfig } from "./config.ts";
import { loadRootEnv } from "./env.ts";

loadRootEnv();

export default createOrmConfig({
  extensions: [Migrator],
  migrations: {
    path: "./src/migrations",
    emit: "ts",
    // Fixed name: the default embeds the database name, which differs per developer.
    snapshotName: ".snapshot-devmentor-schema",
  },
});
