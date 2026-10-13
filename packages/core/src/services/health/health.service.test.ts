import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

import type { MikroORM } from "@devmentor/db";

import { ServiceUnavailableError } from "../../http/errors.ts";

import { HealthService } from "./health.service.ts";

function serviceWith(execute: () => Promise<unknown>) {
  const orm = { em: { getConnection: () => ({ execute: vi.fn(execute) }) } };
  return new HealthService({ orm: orm as unknown as MikroORM });
}

describe("HealthService", () => {
  it("reports ok after a real round-trip", async () => {
    const execute = vi.fn(async () => [{ "?column?": 1 }]);
    const orm = { em: { getConnection: () => ({ execute }) } };
    const report = await new HealthService({ orm: orm as unknown as MikroORM }).check();
    assert.deepEqual(execute.mock.calls, [["select 1"]]);
    assert.equal(report.status, "ok");
    assert.deepEqual(report.database, { connected: true });
    assert.ok(!Number.isNaN(Date.parse(report.checkedAt)));
  });

  it("throws a 503 without leaking the driver message, and logs it", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = serviceWith(async () => {
      throw new Error("connect ECONNREFUSED db.internal:5432");
    });
    await assert.rejects(service.check(), (error: unknown) => {
      assert.ok(error instanceof ServiceUnavailableError);
      assert.equal(error.status, 503);
      assert.equal(error.message, "Database unavailable");
      return true;
    });
    assert.equal(errors.mock.calls.length, 1);
    assert.match(String(errors.mock.calls[0][0]), /db\.internal/);
  });
});
