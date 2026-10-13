import assert from "node:assert/strict";
import { it } from "vitest";

import type { User } from "@devmentor/db";

import { toUserDto } from "./user.dto.ts";

it("whitelists public fields and serializes createdAt", () => {
  const user = {
    id: "u1",
    name: "Ada",
    email: "ada@example.com",
    createdAt: new Date("2026-10-13T10:00:00.000Z"),
    updatedAt: new Date("2026-10-14T10:00:00.000Z"),
    passwordHash: "secret",
  } as unknown as User;
  assert.deepEqual(toUserDto(user), {
    id: "u1",
    name: "Ada",
    email: "ada@example.com",
    createdAt: "2026-10-13T10:00:00.000Z",
  });
});
