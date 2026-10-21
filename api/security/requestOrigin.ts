/**
 * CSRF protection for browser-cookie authenticated API mutations.
 * Production callers must use a configured first-party Origin.
 * Explicit bearer-token clients without browser cookies can omit Origin.
 */
export function trustedOrigins(
  frontendUrl: string | undefined,
  additionalOrigins: string | undefined,
  developmentOrigin?: string,
): Set<string> {
  const origins = [frontendUrl, ...(additionalOrigins ?? "").split(","), developmentOrigin]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  const approved = new Set<string>();
  for (const value of origins) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost")) {
        approved.add(url.origin);
      }
    } catch {
      // An invalid configuration must never allow arbitrary origins.
    }
  }
  return approved;
}

export function isAllowedApiMutation(req: Request, approvedOrigins: ReadonlySet<string>): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) return true;

  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  const hasSessionCookie = /(?:^|;)\s*luqi_session=/.test(req.headers.get("cookie") ?? "");
  const hasBearer = /^Bearer\s+\S+$/i.test(req.headers.get("authorization") ?? "");

  if (origin) return approvedOrigins.has(origin);
  if (fetchSite === "cross-site") return false;
  // Refuse non-browser-style cookie requests unless their explicit bearer
  // authorization provides independent protection against CSRF.
  if (hasSessionCookie && !hasBearer) return false;
  return true;
}
