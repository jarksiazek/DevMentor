import { z } from "zod";

export type FieldErrors = Record<string, string[]>;

/**
 * Base class for every error a service may throw. `apiHandler` maps it to
 * `status` and a `{ ok: false, error }` envelope; anything else becomes a 500.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, "not_found", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, "forbidden", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, "conflict", message);
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: FieldErrors;

  constructor(message = "Invalid input", fieldErrors: FieldErrors = {}) {
    super(422, "validation_error", message);
    this.fieldErrors = fieldErrors;
  }

  static fromZod(error: z.ZodError): ValidationError {
    const { formErrors, fieldErrors } = z.flattenError(error);
    return new ValidationError(formErrors[0] ?? "Invalid input", fieldErrors as FieldErrors);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable") {
    super(503, "service_unavailable", message);
  }
}
