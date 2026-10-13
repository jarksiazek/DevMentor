import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

import { asValue, createContainer, InjectionMode } from "awilix";

import type { AppContainer, Cradle } from "../container/container.ts";
import { userInputSchema } from "../validators/auth/user-input.schema.ts";
import { paginationQuerySchema } from "../validators/pagination.schema.ts";

import { apiHandler, errorResponse } from "./apiHandler.ts";
import { assertOwns, requireAdmin, requireRole, requireSession, type Session } from "./auth.ts";
import { CSRF_HEADER } from "./envelope.ts";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "./errors.ts";
import { makeCrudItemRoute, makeCrudRoute } from "./makeCrudRoute.ts";

const USER_ID = "8f7b5b3e-3c1a-4c55-9d7e-2b8f0f6a1c11";
const noParams = { params: Promise.resolve({}) };

function fakeScope(services: Partial<Cradle>): () => Promise<AppContainer> {
  return async () => {
    const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY });
    for (const [key, value] of Object.entries(services)) container.register(key, asValue(value));
    return container;
  };
}

function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", [CSRF_HEADER]: "1", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

const allowAdmin = async (): Promise<Session> => ({ userId: null, roles: ["admin"] });

describe("apiHandler", () => {
  it("wraps the result in a success envelope", async () => {
    const GET = apiHandler(async () => ({ hello: "world" }), { createScope: fakeScope({}) });
    const response = await GET(request("GET", "/api/x"), noParams);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { hello: "world" } });
  });

  it("maps AppErrors to their status and code", async () => {
    const POST = apiHandler(async () => {
      throw new ConflictError("taken");
    }, { createScope: fakeScope({}) });
    const response = await POST(request("POST", "/api/x", {}), noParams);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { ok: false, error: { code: "conflict", message: "taken" } });
  });

  it("hides unexpected errors behind a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const GET = apiHandler(async () => {
      throw new Error("password=hunter2 at db.internal:5432");
    }, { createScope: fakeScope({}) });
    const response = await GET(request("GET", "/api/x"), noParams);
    assert.equal(response.status, 500);
    const text = await response.text();
    assert.doesNotMatch(text, /hunter2|db\.internal/);
  });

  it("rejects state-changing requests without the CSRF header before opening a scope", async () => {
    let scopes = 0;
    const POST = apiHandler(async () => "never", {
      createScope: async () => {
        scopes += 1;
        return fakeScope({})();
      },
    });
    const response = await POST(new Request("http://localhost/api/x", { method: "POST" }), noParams);
    assert.equal(response.status, 403);
    assert.equal(scopes, 0);
  });

  it("answers 503 when the container cannot be built", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const GET = apiHandler(async () => "never", {
      createScope: async () => {
        throw new Error("DATABASE_URL is not set");
      },
    });
    const response = await GET(request("GET", "/api/x"), noParams);
    assert.equal(response.status, 503);
  });
});

describe("errorResponse", () => {
  it("includes field errors for ValidationError", async () => {
    const response = errorResponse(new ValidationError("Invalid input", { email: ["bad"] }));
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: { code: "validation_error", message: "Invalid input", fieldErrors: { email: ["bad"] } },
    });
  });

  it("logs unexpected errors without request details when there is no request", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = errorResponse(new Error("boom"));
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { ok: false, error: { code: "internal_error", message: "Internal server error" } });
    const line = JSON.parse(String(errors.mock.calls[0][0]));
    assert.equal(line.method, undefined);
    assert.equal(line.path, undefined);
  });

  it("logs method and path when the request is known", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    errorResponse(new Error("boom"), request("DELETE", "/api/users/1?x=1"));
    const line = JSON.parse(String(errors.mock.calls[0][0]));
    assert.equal(line.method, "DELETE");
    assert.equal(line.path, "/api/users/1");
  });
});

describe("makeCrudRoute", () => {
  const calls: unknown[] = [];
  const userService = {
    list: async (query: unknown) => {
      calls.push(["list", query]);
      return { items: [], total: 0, page: 1, pageSize: 20 };
    },
    create: async (input: unknown) => {
      calls.push(["create", input]);
      return { id: USER_ID, ...(input as object) };
    },
    get: async (id: string) => ({ id }),
  };
  const createScope = fakeScope({ userService: userService as unknown as Cradle["userService"] });

  afterEach(() => {
    calls.length = 0;
  });

  const { GET, POST } = makeCrudRoute({
    service: "userService",
    authorize: allowAdmin,
    createScope,
    list: { query: paginationQuerySchema, run: (users, query) => users.list(query) },
    create: { body: userInputSchema, run: (users, input) => users.create(input) },
  });

  it("parses and coerces the list query", async () => {
    const response = await GET(request("GET", "/api/users?page=2&pageSize=5"), noParams);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [["list", { page: 2, pageSize: 5 }]]);
  });

  it("creates from the parsed body only (no mass assignment) and answers 201", async () => {
    const body = { name: " Ada ", email: "ADA@Example.com", id: "smuggled", roles: ["admin"] };
    const response = await POST(request("POST", "/api/users", body), noParams);
    assert.equal(response.status, 201);
    assert.deepEqual(calls, [["create", { name: "Ada", email: "ada@example.com" }]]);
  });

  it("returns field errors on invalid input without calling the service", async () => {
    const response = await POST(request("POST", "/api/users", { name: "", email: "nope" }), noParams);
    assert.equal(response.status, 422);
    const json = (await response.json()) as { error: { fieldErrors: Record<string, string[]> } };
    assert.deepEqual(Object.keys(json.error.fieldErrors).sort(), ["email", "name"]);
    assert.deepEqual(calls, []);
  });

  it("rejects malformed JSON with 422", async () => {
    const response = await POST(request("POST", "/api/users", "{not json"), noParams);
    assert.equal(response.status, 422);
  });

  it("denies before calling the service when authorize throws", async () => {
    const route = makeCrudRoute({
      service: "userService",
      authorize: async () => {
        throw new UnauthorizedError();
      },
      createScope,
      list: { query: paginationQuerySchema, run: (users, query) => users.list(query) },
    });
    const response = await route.GET(request("GET", "/api/users"), noParams);
    assert.equal(response.status, 401);
    assert.deepEqual(calls, []);
  });

  it("answers 405 for operations that are not configured", async () => {
    const route = makeCrudRoute({ service: "userService", authorize: allowAdmin, createScope });
    const response = await route.POST(request("POST", "/api/users", {}), noParams);
    assert.equal(response.status, 405);
  });

  it("answers 405 for a list that is not configured", async () => {
    const route = makeCrudRoute({ service: "userService", authorize: allowAdmin, createScope });
    const response = await route.GET(request("GET", "/api/users"), noParams);
    assert.equal(response.status, 405);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: { code: "method_not_allowed", message: "Method not allowed" },
    });
  });

  it("passes a null session to public routes", async () => {
    const sessions: unknown[] = [];
    const route = makeCrudRoute({
      service: "userService",
      authorize: "public",
      createScope,
      list: {
        query: paginationQuerySchema,
        run: async (_users, _query, context) => {
          sessions.push(context.session);
          return [];
        },
      },
    });
    const response = await route.GET(request("GET", "/api/users"), noParams);
    assert.equal(response.status, 200);
    assert.deepEqual(sessions, [null]);
  });

  it("treats a non-UUID id as not found", async () => {
    const item = makeCrudItemRoute({
      service: "userService",
      authorize: allowAdmin,
      createScope,
      read: { run: (users, id) => users.get(id) },
    });
    const missing = await item.GET(request("GET", "/api/users/1"), { params: Promise.resolve({ id: "1" }) });
    assert.equal(missing.status, 404);
    const found = await item.GET(request("GET", `/api/users/${USER_ID}`), {
      params: Promise.resolve({ id: USER_ID }),
    });
    assert.deepEqual(await found.json(), { ok: true, data: { id: USER_ID } });
  });
});

describe("makeCrudItemRoute", () => {
  const calls: unknown[] = [];
  const userService = {
    update: async (id: string, input: unknown) => {
      calls.push(["update", id, input]);
      return { id, ...(input as object) };
    },
    delete: async (id: string) => {
      calls.push(["delete", id]);
      return { id };
    },
  };
  const createScope = fakeScope({ userService: userService as unknown as Cradle["userService"] });
  const params = { params: Promise.resolve({ id: USER_ID }) };

  afterEach(() => {
    calls.length = 0;
  });

  const item = makeCrudItemRoute({
    service: "userService",
    authorize: allowAdmin,
    createScope,
    update: { body: userInputSchema, run: (users, id, input) => users.update(id, input) },
    remove: { run: (users, id) => users.delete(id) },
  });

  it("updates from the parsed body", async () => {
    const response = await item.PUT(request("PUT", `/api/users/${USER_ID}`, { name: "Ada", email: "A@B.co", x: 1 }), params);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [["update", USER_ID, { name: "Ada", email: "a@b.co" }]]);
  });

  it("rejects an invalid update body without calling the service", async () => {
    const response = await item.PUT(request("PUT", `/api/users/${USER_ID}`, { name: "" }), params);
    assert.equal(response.status, 422);
    assert.deepEqual(calls, []);
  });

  it("checks the id before reading the update body", async () => {
    const response = await item.PUT(request("PUT", "/api/users/1", "{not json"), { params: Promise.resolve({ id: "1" }) });
    assert.equal(response.status, 404);
  });

  it("deletes by id", async () => {
    const response = await item.DELETE(request("DELETE", `/api/users/${USER_ID}`), params);
    assert.deepEqual(await response.json(), { ok: true, data: { id: USER_ID } });
    assert.deepEqual(calls, [["delete", USER_ID]]);
  });

  it("maps service errors on delete", async () => {
    const route = makeCrudItemRoute({
      service: "userService",
      authorize: allowAdmin,
      createScope,
      remove: {
        run: async () => {
          throw new NotFoundError("User not found");
        },
      },
    });
    const response = await route.DELETE(request("DELETE", `/api/users/${USER_ID}`), params);
    assert.equal(response.status, 404);
  });

  it("denies before touching the id or body when authorize throws", async () => {
    const route = makeCrudItemRoute({
      service: "userService",
      authorize: async () => {
        throw new UnauthorizedError();
      },
      createScope,
      update: { body: userInputSchema, run: (users, id, input) => users.update(id, input) },
    });
    const response = await route.PUT(request("PUT", "/api/users/1", "{not json"), { params: Promise.resolve({ id: "1" }) });
    assert.equal(response.status, 401);
    assert.deepEqual(calls, []);
  });

  it("answers 405 for every item operation that is not configured", async () => {
    const route = makeCrudItemRoute({ service: "userService", authorize: allowAdmin, createScope });
    for (const [method, handler] of [
      ["GET", route.GET],
      ["PUT", route.PUT],
      ["DELETE", route.DELETE],
    ] as const) {
      const response = await handler(request(method, `/api/users/${USER_ID}`, method === "PUT" ? {} : undefined), params);
      assert.equal(response.status, 405, method);
    }
  });
});

describe("auth", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("fails closed in production while no auth concept exists", async () => {
    process.env.NODE_ENV = "production";
    await assert.rejects(requireSession(request("GET", "/")), UnauthorizedError);
  });

  it("returns the identity-less development session outside production", async () => {
    process.env.NODE_ENV = "development";
    assert.deepEqual(await requireSession(request("GET", "/")), { userId: null, roles: ["admin"] });
  });

  it("requireAdmin accepts the development admin and fails closed in production", async () => {
    process.env.NODE_ENV = "development";
    assert.deepEqual(await requireAdmin(request("GET", "/")), { userId: null, roles: ["admin"] });
    process.env.NODE_ENV = "production";
    await assert.rejects(requireAdmin(request("GET", "/")), UnauthorizedError);
  });

  it("checks roles and ownership", () => {
    const student: Session = { userId: USER_ID, roles: ["student"] };
    assert.throws(() => requireRole(student, "admin"), { status: 403 });
    assert.equal(requireRole(student, "student"), student);
    assert.doesNotThrow(() => assertOwns(student, USER_ID));
    assert.throws(() => assertOwns(student, "someone-else"), { status: 403 });
    assert.throws(() => assertOwns({ userId: null, roles: ["admin"] }, USER_ID), { status: 403 });
  });
});
