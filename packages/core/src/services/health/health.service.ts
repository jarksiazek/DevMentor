import type { MikroORM } from "@devmentor/db";

import { logger } from "../../logger.ts";
import { ServiceUnavailableError } from "../../http/errors.ts";

export interface HealthReport {
  status: "ok";
  database: { connected: true };
  checkedAt: string;
}

export class HealthService {
  private readonly orm: MikroORM;

  constructor({ orm }: { orm: MikroORM }) {
    this.orm = orm;
  }

  /** Throws `ServiceUnavailableError` (503) when the database is unreachable. */
  async check(): Promise<HealthReport> {
    // A real round-trip: the pool connects lazily, so checkConnection() alone
    // reports "not established" until the first query has run.
    try {
      await this.orm.em.getConnection().execute("select 1");
    } catch (error) {
      // The driver message can contain host names: log it, don't return it.
      logger.error("Database health check failed", { error });
      throw new ServiceUnavailableError("Database unavailable");
    }
    return { status: "ok", database: { connected: true }, checkedAt: new Date().toISOString() };
  }
}
