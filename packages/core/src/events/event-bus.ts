import { logger } from "../logger.ts";

import type { EventMap, EventName } from "./event-map.ts";

export type EventListener<E extends EventName> = (payload: EventMap[E]) => void | Promise<void>;

/**
 * Typed in-process event emitter for side effects (logging, notifications,
 * cache invalidation). Not a queue: listeners run in the emitting request.
 */
export class EventBus {
  private readonly listeners = new Map<EventName, Set<EventListener<EventName>>>();

  /** Registers a listener and returns a function that removes it. */
  on<E extends EventName>(event: E, listener: EventListener<E>): () => void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as EventListener<EventName>);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener as EventListener<EventName>);
  }

  /**
   * Runs every listener for `event`. Emit only after the mutation has been
   * flushed: a failing listener is logged and never undoes or fails the caller.
   */
  async emit<E extends EventName>(event: E, payload: EventMap[E]): Promise<void> {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        await listener(payload);
      } catch (error) {
        logger.error("Event listener failed", { event, error });
      }
    }
  }
}
