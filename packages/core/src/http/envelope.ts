import type { FieldErrors } from "./errors.ts";

// JSON envelope of every /api response. `@devmentor/ui` declares the same
// shape on its side because `ui` must not import `core`.
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: { code: string; message: string; fieldErrors?: FieldErrors };
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Header `apiCall` sends on every request; required on state-changing requests (CSRF defense). */
export const CSRF_HEADER = "x-devmentor-request";
