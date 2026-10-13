import { describe, expect, it, vi } from "vitest";

import type { ApiHandlerArgs } from "@devmentor/core";

const handlers = vi.hoisted(() => [] as Array<(args: ApiHandlerArgs) => Promise<unknown>>);

vi.mock("@devmentor/core", () => ({
  apiHandler: (handler: (args: ApiHandlerArgs) => Promise<unknown>) => {
    handlers.push(handler);
    return async () => new Response();
  },
}));

const { GET } = await import("./route.ts");

describe("GET /api/health", () => {
  it("delegates to the health service", async () => {
    expect(GET).toBeTypeOf("function");
    const report = { status: "ok", database: { connected: true }, checkedAt: "now" };
    const check = vi.fn(async () => report);
    const result = await handlers[0]({ cradle: { healthService: { check } } } as unknown as ApiHandlerArgs);
    expect(result).toBe(report);
    expect(check).toHaveBeenCalledOnce();
  });
});
