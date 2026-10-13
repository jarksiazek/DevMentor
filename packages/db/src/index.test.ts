import assert from "node:assert/strict";

import { EntityManager, MikroORM, UniqueConstraintViolationException } from "@mikro-orm/postgresql";
import { describe, it } from "vitest";

import * as db from "./index.ts";

describe("@devmentor/db entry point", () => {
  it("re-exports the MikroORM types the other packages may use", () => {
    assert.equal(db.EntityManager, EntityManager);
    assert.equal(db.MikroORM, MikroORM);
    assert.equal(db.UniqueConstraintViolationException, UniqueConstraintViolationException);
  });

  it("exposes the config factory, ORM lifecycle and entities", () => {
    assert.equal(typeof db.createOrmConfig, "function");
    assert.equal(typeof db.getOrm, "function");
    assert.equal(typeof db.closeOrm, "function");
    assert.deepEqual(db.entities, [db.User]);
  });
});
