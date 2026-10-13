import assert from "node:assert/strict";
import { describe, it, type TestContext } from "node:test";

import { ApiCallError, apiCall, apiCallOrThrow } from "./apiCall.ts";

function mockFetch(t: TestContext, impl: typeof fetch) {
  return t.mock.method(globalThis, "fetch", impl);
}

describe("apiCall", () => {
  it("sends the CSRF header and JSON body, and unwraps success", async (t) => {
    const fetchMock = mockFetch(t, async () => Response.json({ ok: true, data: { id: 1 } }, { status: 201 }));
    const result = await apiCall<{ id: number }>("/api/users", { method: "POST", body: { name: "Ada" } });
    assert.deepEqual(result, { ok: true, data: { id: 1 }, status: 201 });
    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    const headers = new Headers(init.headers);
    assert.equal(headers.get("x-devmentor-request"), "1");
    assert.equal(headers.get("content-type"), "application/json");
    assert.equal(init.body, JSON.stringify({ name: "Ada" }));
  });

  it("passes error envelopes through, including field errors", async (t) => {
    const error = { code: "validation_error", message: "Invalid input", fieldErrors: { email: ["bad"] } };
    mockFetch(t, async () => Response.json({ ok: false, error }, { status: 422 }));
    assert.deepEqual(await apiCall("/api/users"), { ok: false, error, status: 422 });
  });

  it("turns non-JSON responses and network failures into failures instead of throwing", async (t) => {
    mockFetch(t, async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    const html = await apiCall("/api/users");
    assert.equal(html.ok, false);
    assert.equal(html.ok === false && html.error.code, "invalid_response");

    mockFetch(t, async () => {
      throw new TypeError("fetch failed");
    });
    const offline = await apiCall("/api/users");
    assert.equal(offline.ok === false && offline.error.code, "network_error");
  });

  it("apiCallOrThrow throws ApiCallError with status and field errors", async (t) => {
    mockFetch(t, async () =>
      Response.json({ ok: false, error: { code: "conflict", message: "taken" } }, { status: 409 }),
    );
    await assert.rejects(apiCallOrThrow("/api/users"), (error: unknown) => {
      assert.ok(error instanceof ApiCallError);
      assert.equal(error.status, 409);
      assert.equal(error.code, "conflict");
      return true;
    });
  });
});
