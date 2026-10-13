import { z } from "zod";

import type { Cradle } from "../container/container.ts";

import { apiHandler, type ApiHandlerOptions, type RouteHandler, type RouteParams } from "./apiHandler.ts";
import type { Session } from "./auth.ts";
import { AppError, NotFoundError, ValidationError } from "./errors.ts";

/** Every CRUD route states its access rule explicitly; there is no default. */
export type Authorize = "public" | ((request: Request) => Promise<Session>);

export interface CrudContext {
  request: Request;
  /** `null` only for `authorize: "public"` routes. */
  session: Session | null;
}

interface CrudRouteBase<K extends keyof Cradle> {
  /** Cradle key of the service the operations call. */
  service: K;
  authorize: Authorize;
  createScope?: ApiHandlerOptions["createScope"];
}

export interface CrudCollectionConfig<K extends keyof Cradle, Q extends z.ZodType, B extends z.ZodType>
  extends CrudRouteBase<K> {
  list?: { query: Q; run: (service: Cradle[K], query: z.output<Q>, context: CrudContext) => Promise<unknown> };
  create?: { body: B; run: (service: Cradle[K], input: z.output<B>, context: CrudContext) => Promise<unknown> };
}

export interface CrudItemConfig<K extends keyof Cradle, B extends z.ZodType> extends CrudRouteBase<K> {
  read?: { run: (service: Cradle[K], id: string, context: CrudContext) => Promise<unknown> };
  update?: {
    body: B;
    run: (service: Cradle[K], id: string, input: z.output<B>, context: CrudContext) => Promise<unknown>;
  };
  remove?: { run: (service: Cradle[K], id: string, context: CrudContext) => Promise<unknown> };
}

const HTTP_CREATED = 201;
const idSchema = z.uuid();

class MethodNotAllowedError extends AppError {
  constructor() {
    super(405, "method_not_allowed", "Method not allowed");
  }
}

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}

function readQuery(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

// Ids are UUIDs; anything else cannot exist, so it is a 404 rather than a DB error.
function readId(params: RouteParams): string {
  const result = idSchema.safeParse(params.id);
  if (!result.success) throw new NotFoundError();
  return result.data;
}

async function authorizeRequest(authorize: Authorize, request: Request): Promise<CrudContext> {
  const session = authorize === "public" ? null : await authorize(request);
  return { request, session };
}

function notAllowed(createScope: ApiHandlerOptions["createScope"]): RouteHandler {
  return apiHandler(async () => {
    throw new MethodNotAllowedError();
  }, { createScope });
}

/**
 * Collection route (`api/<concept>/route.ts`): `GET` lists, `POST` creates.
 * Unconfigured operations answer 405.
 *
 * @example export const { GET, POST } = makeCrudRoute({ service: "userService", authorize, list, create });
 */
export function makeCrudRoute<K extends keyof Cradle, Q extends z.ZodType, B extends z.ZodType>(
  config: CrudCollectionConfig<K, Q, B>,
): { GET: RouteHandler; POST: RouteHandler } {
  const { service, authorize, list, create, createScope } = config;

  const GET = list
    ? apiHandler(async ({ request, cradle }) => {
        const context = await authorizeRequest(authorize, request);
        return list.run(cradle[service], parse(list.query, readQuery(request)), context);
      }, { createScope })
    : notAllowed(createScope);

  const POST = create
    ? apiHandler(async ({ request, cradle }) => {
        const context = await authorizeRequest(authorize, request);
        const input = parse(create.body, await readJsonBody(request));
        return create.run(cradle[service], input, context);
      }, { successStatus: HTTP_CREATED, createScope })
    : notAllowed(createScope);

  return { GET, POST };
}

/**
 * Item route (`api/<concept>/[id]/route.ts`): `GET` reads, `PUT` updates,
 * `DELETE` removes. The `id` segment must be a UUID.
 */
export function makeCrudItemRoute<K extends keyof Cradle, B extends z.ZodType>(
  config: CrudItemConfig<K, B>,
): { GET: RouteHandler; PUT: RouteHandler; DELETE: RouteHandler } {
  const { service, authorize, read, update, remove, createScope } = config;

  const GET = read
    ? apiHandler(async ({ request, params, cradle }) => {
        const context = await authorizeRequest(authorize, request);
        return read.run(cradle[service], readId(params), context);
      }, { createScope })
    : notAllowed(createScope);

  const PUT = update
    ? apiHandler(async ({ request, params, cradle }) => {
        const context = await authorizeRequest(authorize, request);
        const id = readId(params);
        const input = parse(update.body, await readJsonBody(request));
        return update.run(cradle[service], id, input, context);
      }, { createScope })
    : notAllowed(createScope);

  const DELETE = remove
    ? apiHandler(async ({ request, params, cradle }) => {
        const context = await authorizeRequest(authorize, request);
        return remove.run(cradle[service], readId(params), context);
      }, { createScope })
    : notAllowed(createScope);

  return { GET, PUT, DELETE };
}
