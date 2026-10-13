import { describe, expect, it, vi } from "vitest";

import type { CrudCollectionConfig, CrudContext } from "@devmentor/core";

type Config = CrudCollectionConfig<"userService", never, never>;

const configs = vi.hoisted(() => [] as unknown[]);

vi.mock("@devmentor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@devmentor/core")>();
  return {
    requireAdmin: actual.requireAdmin,
    toUserDto: actual.toUserDto,
    makeCrudRoute: (config: unknown) => {
      configs.push(config);
      return { GET: "GET", POST: "POST" };
    },
  };
});

const { GET, POST } = await import("./route.ts");
const { requireAdmin } = await import("@devmentor/core");

const config = configs[0] as Config;
const context = {} as CrudContext;
const createdAt = new Date("2026-10-13T10:00:00.000Z");
const user = { id: "u1", name: "Ada", email: "ada@example.com", createdAt, updatedAt: createdAt };
const dto = { id: "u1", name: "Ada", email: "ada@example.com", createdAt: "2026-10-13T10:00:00.000Z" };

describe("/api/users", () => {
  it("exports the generated handlers for the admin-only user service", () => {
    expect(GET).toBe("GET");
    expect(POST).toBe("POST");
    expect(config.service).toBe("userService");
    expect(config.authorize).toBe(requireAdmin);
  });

  it("lists users as DTOs, keeping pagination", async () => {
    const list = vi.fn(async () => ({ items: [user], total: 1, page: 2, pageSize: 5 }));
    const result = await config.list!.run({ list } as never, { page: 2, pageSize: 5 } as never, context);
    expect(list).toHaveBeenCalledWith({ page: 2, pageSize: 5 });
    expect(result).toEqual({ items: [dto], total: 1, page: 2, pageSize: 5 });
  });

  it("creates a user and returns its DTO", async () => {
    const create = vi.fn(async () => user);
    const input = { name: "Ada", email: "ada@example.com" };
    expect(await config.create!.run({ create } as never, input as never, context)).toEqual(dto);
    expect(create).toHaveBeenCalledWith(input);
  });
});
