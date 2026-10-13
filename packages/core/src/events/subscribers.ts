import { logger } from "../logger.ts";

import type { EventBus } from "./event-bus.ts";

/** Wires in-process listeners once, when the root container is built. */
export function registerSubscribers(eventBus: EventBus): void {
  eventBus.on("auth.user.created", ({ userId }) => logger.info("User created", { userId }));
}
