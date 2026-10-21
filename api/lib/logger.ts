/** Minimal structured logger with no automatic request/body serialization. */
type Fields = Record<string, unknown>;
function emit(level: "info" | "warn" | "error", first: Fields | string, message?: string) {
  const label = typeof first === "string" ? first : message || "event";
  const fields = typeof first === "string" ? undefined : first;
  // Avoid logging prompts, tokens, cookies or user-provided bodies.
  const safe: Fields = {};
  if (fields) for (const key of ["requestId", "method", "path", "status", "durationMs", "port", "signal", "model", "err"]) {
    if (fields[key] !== undefined) safe[key] = fields[key];
  }
  const output = JSON.stringify({ level, message: label, ...safe });
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);
}
export const logger = {
  info: (first: Fields | string, message?: string) => emit("info", first, message),
  warn: (first: Fields | string, message?: string) => emit("warn", first, message),
  error: (first: Fields | string, message?: string) => emit("error", first, message),
};
