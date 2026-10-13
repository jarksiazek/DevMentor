import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

import { ApiCallError, apiCall, apiCallOrThrow } from "./apiCall.ts";

function mockFetch(impl: typeof fetch) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(impl);
}

describe("apiCall", () => {
  it("sends the CSRF header and JSON body, and unwraps success", async () => {
    const fetchMock = mockFetch(async () => Response.json({ ok: true, data: { id: 1 } }, { status: 201 }));
    const result = await apiCall<{ id: number }>("/api/users", { method: "POST", body: { name: "Ada" } });
    assert.deepEqual(result, { ok: true, data: { id: 1 }, status: 201 });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    assert.equal(headers.get("x-devmentor-request"), "1");
    assert.equal(headers.get("content-type"), "application/json");
    assert.equal(init.body, JSON.stringify({ name: "Ada" }));
  });

  it("passes error envelopes through, including field errors", async () => {
    const error = { code: "validation_error", message: "Invalid input", fieldErrors: { email: ["bad"] } };
    mockFetch(async () => Response.json({ ok: false, error }, { status: 422 }));
    assert.deepEqual(await apiCall("/api/users"), { ok: false, error, status: 422 });
  });

  it("turns non-JSON responses and network failures into failures instead of throwing", async () => {
    mockFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    const html = await apiCall("/api/users");
    assert.equal(html.ok, false);
    assert.equal(html.ok === false && html.error.code, "invalid_response");

    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const offline = await apiCall("/api/users");
    assert.equal(offline.ok === false && offline.error.code, "network_error");
  });

  it("apiCallOrThrow throws ApiCallError with status and field errors", async () => {
    mockFetch(async () =>
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

describe("apiCallOrThrow / readJsonSafe", () => {
  it("returns the data on success", async () => {
    mockFetch(async () => Response.json({ ok: true, data: { id: 7 } }));
    assert.deepEqual(await apiCallOrThrow<{ id: number }>("/api/users/7"), { id: 7 });
  });

  it("sends no body or content-type without a body and keeps caller headers", async () => {
    const fetchMock = mockFetch(async () => new Response(null, { status: 204 }));
    const result = await apiCall("/api/users", { method: "DELETE", headers: { "x-extra": "y" } });
    assert.equal(result.ok, false);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    assert.equal(headers.get("x-extra"), "y");
    assert.equal(headers.get("content-type"), null);
    assert.equal(init.body, undefined);
  });

  it("treats a failure envelope without a string message as an invalid response", async () => {
    mockFetch(async () => Response.json({ ok: false, error: { code: "x" } }, { status: 400 }));
    const result = await apiCall("/api/users");
    assert.equal(result.ok === false && result.error.code, "invalid_response");
    mockFetch(async () => Response.json({ ok: false, error: "nope" }, { status: 400 }));
    const nonRecord = await apiCall("/api/users");
    assert.equal(nonRecord.ok === false && nonRecord.error.code, "invalid_response");
  });
});
