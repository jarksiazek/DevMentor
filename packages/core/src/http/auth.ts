import { ForbiddenError, UnauthorizedError } from "./errors.ts";

export type Role = "admin" | "mentor" | "student";

export interface Session {
  /** `null` only for the development bypass session, which owns no records. */
  userId: string | null;
  roles: readonly Role[];
}

const DEVELOPMENT_SESSION: Session = { userId: null, roles: ["admin"] };

/**
 * Resolves the caller's session or throws `UnauthorizedError`.
 *
 * There is no auth concept yet, so this fails closed: production always answers
 * 401. Outside production it returns an admin session without an identity so the
 * admin panel works locally. Replace the body once the auth concept (JWT cookie) lands.
 */
export async function requireSession(request: Request): Promise<Session> {
  void request;
  if (process.env.NODE_ENV !== "production") return DEVELOPMENT_SESSION;
  throw new UnauthorizedError();
}

export function requireRole(session: Session, role: Role): Session {
  if (!session.roles.includes(role)) throw new ForbiddenError();
  return session;
}

/** Ownership check for a specific record; a missing identity is denied (fail closed). */
export function assertOwns(session: Session, ownerId: string): void {
  if (session.userId === null || session.userId !== ownerId) throw new ForbiddenError();
}

/** `authorize` for admin-only routes. */
export async function requireAdmin(request: Request): Promise<Session> {
  return requireRole(await requireSession(request), "admin");
}
