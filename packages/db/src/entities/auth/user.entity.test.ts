import assert from "node:assert/strict";

import { MikroORM } from "@mikro-orm/postgresql";
import { afterAll, beforeAll, describe, it } from "vitest";

import { User } from "./user.entity.ts";

// Discovery only: `init` never queries (the pool connects lazily) and the URL is unreachable.
let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    entities: [User],
    clientUrl: "postgresql://user:pass@127.0.0.1:1/devmentor_test",
  });
});

afterAll(async () => {
  await orm.close();
});

describe("User entity", () => {
  it("maps to the users table with a unique email", () => {
    const meta = orm.getMetadata().get(User);
    assert.equal(meta.tableName, "users");
    assert.deepEqual(meta.primaryKeys, ["id"]);
    assert.equal(meta.properties.email.unique, true);
  });

  it("generates a UUID id and timestamps on create", () => {
    const { properties } = orm.getMetadata().get(User);
    const before = Date.now();
    const id = properties.id.onCreate?.({} as User, orm.em);
    assert.match(String(id), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    for (const key of ["createdAt", "updatedAt"] as const) {
      const value = properties[key].onCreate?.({} as User, orm.em);
      assert.ok(value instanceof Date && value.getTime() >= before);
    }
  });

  it("refreshes updatedAt on update", () => {
    const { properties } = orm.getMetadata().get(User);
    const value = properties.updatedAt.onUpdate?.({} as User, orm.em);
    assert.ok(value instanceof Date);
  });

  it("creates User instances through the entity manager", () => {
    const user = orm.em.fork().create(User, { name: "Ada", email: "ada@example.com" });
    assert.ok(user instanceof User);
    assert.equal(user.name, "Ada");
  });
});
