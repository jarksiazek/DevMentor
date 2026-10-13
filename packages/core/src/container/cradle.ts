import type { EntityManager, MikroORM } from "@devmentor/db";

import type { EventBus } from "../events/event-bus.ts";
import type { UserService } from "../services/auth/user.service.ts";
import type { HealthService } from "../services/health/health.service.ts";

/** Everything resolvable from the container. Add new registrations here first. */
export interface Cradle {
  orm: MikroORM;
  /** Request-scoped EntityManager fork (own identity map per scope). */
  em: EntityManager;
  eventBus: EventBus;
  healthService: HealthService;
  userService: UserService;
}
