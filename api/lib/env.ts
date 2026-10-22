/** Server-side runtime configuration. Never bundle API secrets into the client. */
export const env = Object.freeze({
  isProduction: process.env.NODE_ENV === "production",
});
