import "dotenv/config";

// Boot must never depend on external configuration being present.
// Missing variables disable their related features gracefully instead
// of crashing the process before it can bind the port — Railway's
// healthcheck (/api/trpc/ping) must always be answerable.
function optional(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`[env] ${name} is not set — related features stay disabled until it is configured`);
  }
  return value ?? "";
}

export const env = {
  appId: optional("APP_ID"),
  appSecret: optional("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: optional("DATABASE_URL"),
};
