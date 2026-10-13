import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  Lifetime,
  type AwilixContainer,
} from "awilix";

import { getOrm } from "@devmentor/db";

import { EventBus } from "../events/event-bus.ts";
import { registerSubscribers } from "../events/subscribers.ts";
import { UserService } from "../services/auth/user.service.ts";
import { HealthService } from "../services/health/health.service.ts";

import type { Cradle } from "./cradle.ts";

export type { Cradle };
export type AppContainer = AwilixContainer<Cradle>;

async function buildContainer(): Promise<AppContainer> {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  // Every binding is explicit (no loadModules globbing) so it stays greppable.
  container.register({
    orm: asValue(await getOrm()),
    em: asFunction(({ orm }: Pick<Cradle, "orm">) => orm.em.fork(), { lifetime: Lifetime.SCOPED }),
    eventBus: asClass(EventBus, { lifetime: Lifetime.SINGLETON }),
    healthService: asClass(HealthService, { lifetime: Lifetime.SINGLETON }),
    userService: asClass(UserService, { lifetime: Lifetime.SCOPED }),
  });
  registerSubscribers(container.cradle.eventBus);

  return container;
}

// Root container is a process-wide singleton (survives Next.js dev HMR).
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: Promise<AppContainer>;
};

export function getContainer(): Promise<AppContainer> {
  globalForContainer.__devmentorContainer ??= buildContainer().catch((error: unknown) => {
    globalForContainer.__devmentorContainer = undefined;
    throw error;
  });
  return globalForContainer.__devmentorContainer;
}

/**
 * Creates a scope for one unit of work (an HTTP request, a server action, a job).
 * Scoped registrations such as `em` and `userService` are fresh per scope.
 */
export async function createRequestScope(): Promise<AppContainer> {
  return (await getContainer()).createScope();
}

/** Runs `fn` inside a fresh request scope and disposes the scope afterwards. */
export async function withRequestScope<T>(fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  const scope = await createRequestScope();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
