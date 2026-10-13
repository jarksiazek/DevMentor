import { createRequestScope, type AppContainer, type Cradle } from "../container/container.ts";
import { logger } from "../logger.ts";

import { AppError, ForbiddenError, ServiceUnavailableError, ValidationError } from "./errors.ts";
import { CSRF_HEADER, type ApiFailure, type ApiSuccess } from "./envelope.ts";

export type RouteParams = Record<string, string | string[] | undefined>;

/** Second argument Next.js passes to a Route Handler. */
export interface RouteHandlerContext {
  params: Promise<RouteParams>;
}

export type RouteHandler = (request: Request, context: RouteHandlerContext) => Promise<Response>;

export interface ApiHandlerArgs {
  request: Request;
  params: RouteParams;
  cradle: Cradle;
}

export interface ApiHandlerOptions {
  /** Status of a successful response. Defaults to 200. */
  successStatus?: number;
  /** Scope factory; tests pass a container with fakes. */
  createScope?: () => Promise<AppContainer>;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function errorResponse(error: unknown, request?: Request): Response {
  if (error instanceof AppError) {
    const body: ApiFailure = { ok: false, error: { code: error.code, message: error.message } };
    if (error instanceof ValidationError) body.error.fieldErrors = error.fieldErrors;
    return Response.json(body, { status: error.status });
  }
  logger.error("Unhandled error in route handler", {
    method: request?.method,
    path: request ? new URL(request.url).pathname : undefined,
    error,
  });
  const body: ApiFailure = { ok: false, error: { code: "internal_error", message: "Internal server error" } };
  return Response.json(body, { status: 500 });
}

async function openScope(createScope: () => Promise<AppContainer>): Promise<AppContainer> {
  try {
    return await createScope();
  } catch (error) {
    logger.error("Could not create request scope", { error });
    throw new ServiceUnavailableError();
  }
}

/**
 * Wraps a Route Handler: CSRF check for state-changing methods, a fresh Awilix
 * request scope, the `{ ok, data | error }` envelope, and `AppError` → status
 * mapping. Routes never write their own try/catch.
 */
export function apiHandler<T>(
  handler: (args: ApiHandlerArgs) => Promise<T>,
  { successStatus = 200, createScope = createRequestScope }: ApiHandlerOptions = {},
): RouteHandler {
  return async (request, context) => {
    let scope: AppContainer | undefined;
    try {
      if (!SAFE_METHODS.has(request.method) && !request.headers.has(CSRF_HEADER)) {
        throw new ForbiddenError("Missing CSRF header");
      }
      const params = await context.params;
      scope = await openScope(createScope);
      const data = await handler({ request, params, cradle: scope.cradle });
      const body: ApiSuccess<T> = { ok: true, data };
      return Response.json(body, { status: successStatus });
    } catch (error) {
      return errorResponse(error, request);
    } finally {
      await scope?.dispose();
    }
  };
}
