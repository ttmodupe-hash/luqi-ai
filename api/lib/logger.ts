// =====================================================================
// STRUCTURED LOGGER (pino — already a project dependency)
// JSON logs in production (queryable in Railway), pretty in dev.
// Redacts credentials so keys/passwords/tokens never reach log streams.
// =====================================================================

import pino from "pino";

export const logger = pino({
  name: "luqi-ai",
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-api-key']",
      "password",
      "passwordHash",
      "apiKey",
      "token",
      "*.password",
      "*.passwordHash",
      "*.apiKey",
      "*.token",
    ],
    censor: "[redacted]",
  },
  ...(process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty" } }
    : {}),
});
