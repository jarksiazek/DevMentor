import type { ApiError, ApiResult } from "./types.ts";

// Must match `CSRF_HEADER` in `@devmentor/core` (`http/envelope.ts`).
const CSRF_HEADER = "x-devmentor-request";

export interface ApiCallOptions extends Omit<RequestInit, "body"> {
  /** Serialized as JSON. */
  body?: unknown;
}

export class ApiCallError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: ApiError["fieldErrors"];

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.name = "ApiCallError";
    this.code = error.code;
    this.status = status;
    this.fieldErrors = error.fieldErrors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parses a JSON body without throwing; `undefined` for empty or non-JSON bodies. */
export async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toResult<T>(body: unknown, status: number): ApiResult<T> {
  if (isRecord(body) && body.ok === true && "data" in body) {
    return { ok: true, data: body.data as T, status };
  }
  if (isRecord(body) && body.ok === false && isRecord(body.error) && typeof body.error.message === "string") {
    return { ok: false, error: body.error as unknown as ApiError, status };
  }
  return { ok: false, error: { code: "invalid_response", message: `Unexpected response (HTTP ${status})` }, status };
}

/**
 * The only sanctioned `fetch()` to `/api/*`. Never throws: network failures and
 * malformed responses come back as `{ ok: false }`.
 */
export async function apiCall<T>(path: string, { body, headers, ...init }: ApiCallOptions = {}): Promise<ApiResult<T>> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set(CSRF_HEADER, "1");
  requestHeaders.set("accept", "application/json");
  if (body !== undefined) requestHeaders.set("content-type", "application/json");

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error, please try again" }, status: 0 };
  }
  return toResult<T>(await readJsonSafe(response), response.status);
}

/** Like `apiCall`, but returns the data or throws `ApiCallError`. */
export async function apiCallOrThrow<T>(path: string, options?: ApiCallOptions): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) throw new ApiCallError(result.error, result.status);
  return result.data;
}
