/** LUQI Intrusion Radar — privacy-preserving defensive detection.
 *
 * Decoy request paths and failed login *outcomes* are observable without
 * recording bearer tokens, payloads, cookies, IP addresses, user agents or
 * account email addresses. Signals live in MySQL, not ephemeral process memory.
 * No automated hacking, IP retaliation, account suspension or provider calls.
 *
 * This is one layer of detection: vendor key compromise and cloud IAM abuse
 * require independent provider audit logs, key revocation and SIEM alerts.
 */
import { createHmac } from "node:crypto";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { intrusionRadarEvents } from "../../db/schema";
import { getPrivateDb } from "./access";
import { logger } from "../lib/logger";

export type RadarCategory =
  | "credential_probe" | "canary_path" | "login_failure" | "login_throttled";
export type RadarSeverity = "medium" | "high" | "critical";
export type RadarSignal = {
  category: RadarCategory;
  severity: RadarSeverity;
  method: string;
  /** Only given to the HMAC function. Never stored or logged in raw form. */
  accountEmail?: string;
};
const MAX_EMAIL_LENGTH = 254;
const ALLOWED_METHODS = new Set(["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const PROBES = new Map<string, RadarCategory>([
  ["/.env", "credential_probe"],
  ["/.git/config", "credential_probe"],
  ["/.aws/credentials", "credential_probe"],
  ["/config/.env", "credential_probe"],
  ["/wp-admin", "credential_probe"],
  ["/server-status", "credential_probe"],
  ["/__luqi_canary__/runtime-credentials", "canary_path"],
]);
const SEVERITY: Record<RadarCategory, RadarSeverity> = {
  credential_probe: "high",
  canary_path: "critical",
  login_failure: "medium",
  login_throttled: "high",
};

export function classifyDecoyPath(rawPath: string): RadarSignal | null {
  if (typeof rawPath !== "string" || rawPath.length > 320) return null;
  // Only match fixed strings; never respond with simulated credentials.
  const normalized = rawPath.toLowerCase().replace(/%2e/gi, ".");
  const category = PROBES.get(normalized);
  return category ? { category, severity: SEVERITY[category], method: "GET" } : null;
}

/** An HMAC is a pseudonym, not anonymous data: rotate and restrict the key. */
export function digestAccountEmail(email: string, secret: string): string | null {
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) return null;
  if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH) return null;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return createHmac("sha256", secret)
    .update("luqi-security-observation-email-v1\0" + normalized, "utf8")
    .digest("hex");
}

export async function recordSecuritySignal(signal: RadarSignal): Promise<boolean> {
  const method = signal.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method) ||
      !Object.prototype.hasOwnProperty.call(SEVERITY, signal.category) ||
      signal.severity !== SEVERITY[signal.category]) {
    return false;
  }
  // For login attempts, require keyed pseudonymization or record NOTHING:
  // this avoids introducing a raw-email fallback when keys are unavailable.
  const subjectDigest = signal.accountEmail === undefined ? null :
    digestAccountEmail(signal.accountEmail, process.env.LUQI_SECURITY_HMAC_KEY || "");
  if (signal.accountEmail !== undefined && !subjectDigest) {
    logger.warn({ category: signal.category }, "intrusion_radar_degraded_missing_hmac_key");
    return false;
  }
  try {
    const db = await getPrivateDb();
    await db.insert(intrusionRadarEvents).values({
      category: signal.category,
      severity: signal.severity,
      method,
      subjectDigest,
    });
    // Emit a redacted event for SIEM collection: fixed category, no user data.
    if (signal.severity !== "medium") {
      logger.warn({ category: signal.category, severity: signal.severity }, "intrusion_radar_signal");
    }
    return true;
  } catch {
    // If telemetry fails, decoy paths still return 404; core login controls
    // retain their own database-backed rate limits and authentication checks.
    logger.warn({ category: signal.category }, "intrusion_radar_storage_unavailable");
    return false;
  }
}

/** Genuine DB aggregate of observed events, never simulated historic incidents. */
export async function getIntrusionRadarSummary() {
  const db = await getPrivateDb();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const counts = await db.select({
    category: intrusionRadarEvents.category,
    severity: intrusionRadarEvents.severity,
    hits: count(),
  }).from(intrusionRadarEvents)
    .where(gte(intrusionRadarEvents.createdAt, since))
    .groupBy(intrusionRadarEvents.category, intrusionRadarEvents.severity)
    .orderBy(desc(count()));
  // No email hashes leave this endpoint, even for administrators.
  return {
    observedLastHour: counts.map((x) => ({
      category: x.category,
      severity: x.severity,
      count: Number(x.hits),
    })),
    windowMinutes: 60,
    source: "mysql_recorded_signals_only",
    assurance: "not_proof_of_absence_or_blocked_compromise",
    automatedRetaliationEnabled: false,
    credentialRotationVerified: false,
  };
}

/** Detect repeated failed credential attempts for a single pseudonymous
 * account in one hour. This alerts operators but does not lock accounts.
 */
export async function countRecentLoginFailures(accountEmail: string): Promise<number | null> {
  const digest = digestAccountEmail(accountEmail, process.env.LUQI_SECURITY_HMAC_KEY || "");
  if (!digest) return null;
  try {
    const db = await getPrivateDb();
    const [item] = await db.select({ total: count() })
      .from(intrusionRadarEvents)
      .where(and(
        eq(intrusionRadarEvents.subjectDigest, digest),
        gte(intrusionRadarEvents.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
      )).limit(1);
    const total = Number(item?.total ?? 0);
    if (Number.isSafeInteger(total) && total >= 10) {
      logger.warn({ category: "repeated_login_failures", threshold: 10 },
        "intrusion_radar_auth_anomaly");
    }
    return Number.isSafeInteger(total) ? total : null;
  } catch {
    logger.warn({ category: "auth_anomaly" }, "intrusion_radar_correlation_unavailable");
    return null;
  }
}
