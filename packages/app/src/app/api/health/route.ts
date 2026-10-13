import { apiHandler } from "@devmentor/core";

// Public: liveness/readiness probe. 503 when the database is unreachable.
export const GET = apiHandler(({ cradle }) => cradle.healthService.check());
