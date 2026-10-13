// Client-side mirror of the `/api` JSON envelope declared in `@devmentor/core`
// (`http/envelope.ts`). `ui` must not import `core`, so the shape is duplicated.
export type FieldErrors = Record<string, string[]>;

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ApiResult<T> = { ok: true; data: T; status: number } | { ok: false; error: ApiError; status: number };

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
