export {
  createRequestScope,
  getContainer,
  withRequestScope,
  type AppContainer,
  type Cradle,
} from "./container/container.ts";
export { EventBus, type EventListener } from "./events/event-bus.ts";
export type { EventMap, EventName } from "./events/event-map.ts";
export {
  apiHandler,
  errorResponse,
  type ApiHandlerArgs,
  type ApiHandlerOptions,
  type RouteHandler,
  type RouteHandlerContext,
  type RouteParams,
} from "./http/apiHandler.ts";
export { assertOwns, requireAdmin, requireRole, requireSession, type Role, type Session } from "./http/auth.ts";
export {
  CSRF_HEADER,
  type ApiFailure,
  type ApiResult,
  type ApiSuccess,
  type Paginated,
} from "./http/envelope.ts";
export {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
  type FieldErrors,
} from "./http/errors.ts";
export {
  makeCrudItemRoute,
  makeCrudRoute,
  type Authorize,
  type CrudCollectionConfig,
  type CrudContext,
  type CrudItemConfig,
} from "./http/makeCrudRoute.ts";
export { logger } from "./logger.ts";
export { toUserDto, type UserDto } from "./services/auth/user.dto.ts";
export { UserService } from "./services/auth/user.service.ts";
export { HealthService, type HealthReport } from "./services/health/health.service.ts";
