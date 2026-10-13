type LogContext = Record<string, unknown>;

// Keys whose values must never reach a log line (passwords, tokens, JWTs, cookies).
const SENSITIVE_KEY = /pass(word)?|secret|token|jwt|authorization|cookie/i;
const REDACTED = "[redacted]";

function redact(value: unknown, depth = 0): unknown {
  const maxDepth = 5;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value === null || typeof value !== "object" || depth >= maxDepth) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1),
    ]),
  );
}

function write(level: "info" | "warn" | "error", message: string, context?: LogContext): void {
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...(redact(context) as LogContext) });
  console[level](line);
}

/** Stateless structured logger (JSON lines on stdout/stderr) with secret redaction. */
export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};

export { redact as redactForLog };
