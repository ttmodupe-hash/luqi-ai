/** Server runtime flags. Secrets remain in process.env, never exposed to clients. */
export const env = {
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",
};
