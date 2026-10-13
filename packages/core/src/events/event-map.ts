/**
 * Registry of domain events: `concept.entity.action` (past tense) → payload.
 * Add an entry here before emitting a new event.
 */
export interface EventMap {
  "auth.user.created": { userId: string };
}

export type EventName = keyof EventMap;
