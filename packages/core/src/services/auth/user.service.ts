import { UniqueConstraintViolationException, User, type EntityManager } from "@devmentor/db";

import type { EventBus } from "../../events/event-bus.ts";
import { ConflictError, NotFoundError } from "../../http/errors.ts";
import type { Paginated } from "../../http/envelope.ts";
import type { PaginationQuery } from "../../validators/pagination.schema.ts";
import type { UserInput } from "../../validators/auth/user-input.schema.ts";

const EMAIL_TAKEN = "A user with this email already exists";

export class UserService {
  private readonly em: EntityManager;
  private readonly eventBus: EventBus;

  constructor({ em, eventBus }: { em: EntityManager; eventBus: EventBus }) {
    this.em = em;
    this.eventBus = eventBus;
  }

  async list({ page, pageSize }: PaginationQuery): Promise<Paginated<User>> {
    const [items, total] = await this.em.findAndCount(
      User,
      {},
      { orderBy: { createdAt: "desc" }, limit: pageSize, offset: (page - 1) * pageSize },
    );
    return { items, total, page, pageSize };
  }

  async get(id: string): Promise<User> {
    const user = await this.em.findOne(User, { id });
    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  async create(input: UserInput): Promise<User> {
    const user = this.em.create(User, { name: input.name, email: input.email });
    await this.flushUnique();
    await this.eventBus.emit("auth.user.created", { userId: user.id });
    return user;
  }

  async update(id: string, input: UserInput): Promise<User> {
    const user = await this.get(id);
    this.em.assign(user, { name: input.name, email: input.email });
    await this.flushUnique();
    return user;
  }

  async delete(id: string): Promise<{ id: string }> {
    const user = await this.get(id);
    this.em.remove(user);
    await this.em.flush();
    return { id };
  }

  // The unique index on email is the source of truth; no racy check-then-insert.
  private async flushUnique(): Promise<void> {
    try {
      await this.em.flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) throw new ConflictError(EMAIL_TAKEN);
      throw error;
    }
  }
}
