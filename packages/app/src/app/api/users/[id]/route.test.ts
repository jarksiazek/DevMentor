import { describe, expect, it, vi } from "vitest";

import type { CrudContext, CrudItemConfig } from "@devmentor/core";

type Config = CrudItemConfig<"userService", never>;

const configs = vi.hoisted(() => [] as unknown[]);

vi.mock("@devmentor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@devmentor/core")>();
  return {
    requireAdmin: actual.requireAdmin,
    toUserDto: actual.toUserDto,
    makeCrudItemRoute: (config: unknown) => {
      configs.push(config);
      return { GET: "GET", PUT: "PUT", DELETE: "DELETE" };
    },
  };
});

const { GET, PUT, DELETE } = await import("./route.ts");
const { requireAdmin } = await import("@devmentor/core");

const config = configs[0] as Config;
const context = {} as CrudContext;
const createdAt = new Date("2026-10-13T10:00:00.000Z");
const user = { id: "u1", name: "Ada", email: "ada@example.com", createdAt, updatedAt: createdAt };
const dto = { id: "u1", name: "Ada", email: "ada@example.com", createdAt: "2026-10-13T10:00:00.000Z" };

describe("/api/users/[id]", () => {
  it("exports the generated handlers for the admin-only user service", () => {
    expect([GET, PUT, DELETE]).toEqual(["GET", "PUT", "DELETE"]);
    expect(config.service).toBe("userService");
    expect(config.authorize).toBe(requireAdmin);
  });

  it("reads a user as a DTO", async () => {
    const get = vi.fn(async () => user);
    expect(await config.read!.run({ get } as never, "u1", context)).toEqual(dto);
    expect(get).toHaveBeenCalledWith("u1");
  });

  it("updates a user and returns its DTO", async () => {
    const update = vi.fn(async () => user);
    const input = { name: "Ada", email: "ada@example.com" };
    expect(await config.update!.run({ update } as never, "u1", input as never, context)).toEqual(dto);
    expect(update).toHaveBeenCalledWith("u1", input);
  });

  it("deletes a user", async () => {
    const remove = vi.fn(async () => ({ id: "u1" }));
    expect(await config.remove!.run({ delete: remove } as never, "u1", context)).toEqual({ id: "u1" });
    expect(remove).toHaveBeenCalledWith("u1");
  });
});
