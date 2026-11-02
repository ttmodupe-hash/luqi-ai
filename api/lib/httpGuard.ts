/** HTTP perimeter helpers. Provider budgets and authenticated sessions are
 * the authoritative spend controls; IP throttling is defence-in-depth only.
 */
export function allowedBrowserOrigin(
  origin: string | undefined,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  if (!origin) return undefined;
  const configured = [env.FRONTEND_URL, env.LUQI_ALLOWED_ORIGINS]
    .filter(Boolean).flatMap(x => (x ?? "").split(","));
  const allowed = new Set<string>();
  for (const candidate of configured) {
    const value = candidate.trim();
    if (!value || value === "*") continue;
    try {
      const u = new URL(value);
      const loopback = (u.hostname === "localhost" || u.hostname === "127.0.0.1");
      if (u.username || u.password || (u.protocol !== "https:" &&
          !(env.NODE_ENV !== "production" && u.protocol === "http:" && loopback))) continue;
      allowed.add(u.origin);
    } catch { /* Skip invalid configuration; never widen permissions */ }
  }
  return allowed.has(origin) ? origin : undefined;
}

export class BoundedRateLimiter {
  private readonly records = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly maxRequests = 100,
    private readonly windowMs = 60_000,
    private readonly maxKeys = 5000,
  ) {
    if (maxRequests < 1 || windowMs < 1 || maxKeys < 1) {
      throw new Error("Invalid rate limiter configuration");
    }
  }

  permit(identity: string, now = Date.now()): boolean {
    const key = (identity || "unknown").slice(0, 120);
    const existing = this.records.get(key);
    if (existing && existing.resetAt > now) {
      if (existing.count >= this.maxRequests) return false;
      existing.count += 1;
      return true;
    }
    if (existing) this.records.delete(key);
    if (this.records.size >= this.maxKeys) {
      for (const [name, entry] of this.records) {
        if (entry.resetAt <= now) this.records.delete(name);
      }
    }
    // Bound cardinality even with spoofed proxy headers: reject rather
    // than allow an unbounded heap. Multi-replica limits need shared storage.
    if (this.records.size >= this.maxKeys) return false;
    this.records.set(key, { count: 1, resetAt: now + this.windowMs });
    return true;
  }

  get trackedIdentities(): number { return this.records.size; }
}
