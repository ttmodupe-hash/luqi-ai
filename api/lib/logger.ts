/**
 * Lightweight structured runtime logger.
 * Redact common credentials and never print bearer tokens or raw passwords.
 */
type LogInput = string | Record<string, unknown> | Error;

function safeFields(input: LogInput): Record<string, unknown> {
  if (input instanceof Error) return { error: input.name, message: input.message };
  if (typeof input === "string") return {};
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (/(password|secret|token|api.?key|authorization|cookie|credential)/i.test(key)) {
      fields[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      fields[key] = value.slice(0, 2000);
    } else if (value === null || typeof value === "number" || typeof value === "boolean") {
      fields[key] = value;
    } else if (value instanceof Error) {
      fields[key] = value.message;
    } else {
      fields[key] = "[STRUCTURED]";
    }
  }
  return fields;
}

function log(level: "info" | "warn" | "error" | "debug", input: LogInput, message?: string) {
  const text = typeof input === "string" ? input : (message ?? "");
  const record = { level, time: new Date().toISOString(), message: text, ...safeFields(input) };
  const output = JSON.stringify(record);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else if (level === "debug") console.debug(output);
  else console.info(output);
}

export const logger = {
  info: (input: LogInput, message?: string) => log("info", input, message),
  warn: (input: LogInput, message?: string) => log("warn", input, message),
  error: (input: LogInput, message?: string) => log("error", input, message),
  debug: (input: LogInput, message?: string) => log("debug", input, message),
};
