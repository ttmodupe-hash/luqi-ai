/**
 * Read-only staging infrastructure smoke checks.
 *
 * This script does NOT create a charge, debit credits, generate video,
 * execute a schema migration, write assets, or deploy anything.
 * Requires dedicated sandbox Paystack credentials and a reviewed staging
 * environment. Never run with production financial credentials.
 */
import mysql from "mysql2/promise";
import { checkPrivateVideoStorage, paidVideoAvailable } from "../api/services/paidVideo";
import { narratedVideoAvailable } from "../api/services/paidNarration";

const requiredTables = [
  "users", "payment_events", "video_projects", "video_credit_wallets",
  "video_credit_ledger", "video_render_requests", "video_global_daily_quota",
];

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Staging is missing required configuration: ${key}`);
  return value;
}

async function verifyHttp(url: string, headers: Record<string, string>): Promise<void> {
  const result = await fetch(url, {
    method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw new Error(`Read-only provider check failed (${new URL(url).hostname}: ${result.status}).`);
}

async function main() {
  if (process.env.LUQI_RUNTIME_ENV !== "staging") {
    throw new Error("Refusing to run outside explicit LUQI_RUNTIME_ENV=staging.");
  }
  if (process.env.LUQI_STAGING_VERIFY_ONLY !== "VERIFY_ONLY_NO_CHARGES") {
    throw new Error("Missing explicit no-charge verification acknowledgement.");
  }
  const paystack = required("PAYSTACK_SECRET_KEY");
  if (!paystack.startsWith("sk_test_")) {
    throw new Error("Only Paystack sandbox keys are permitted for these checks.");
  }
  const database = required("DATABASE_URL");
  if (!paidVideoAvailable("narrated_mp4") || !narratedVideoAvailable()) {
    throw new Error("Video storage, Replicate, ElevenLabs or FFmpeg is not configured.");
  }

  const connection = await mysql.createConnection(database);
  try {
    const [rows] = await connection.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
    );
    const seen = new Set((rows as Array<{ name: string }>).map((row) => row.name));
    for (const table of requiredTables) {
      if (!seen.has(table)) throw new Error(`Required staging table is missing: ${table}`);
    }
    await connection.query("SELECT 1");
  } finally {
    await connection.end();
  }
  console.log("Staging database connectivity and required schema: PASS (read only)");

  await checkPrivateVideoStorage();
  console.log("Private object-storage bucket access: PASS (read only)");

  await verifyHttp("https://api.replicate.com/v1/account", {
    Authorization: `Bearer ${required("REPLICATE_API_TOKEN")}`,
  });
  console.log("Replicate account authorization: PASS (read only)");

  await verifyHttp("https://api.elevenlabs.io/v1/user", {
    "xi-api-key": required("ELEVENLABS_API_KEY"),
  });
  console.log("ElevenLabs account authorization: PASS (read only)");

  await verifyHttp("https://api.paystack.co/balance", {
    Authorization: `Bearer ${paystack}`,
  });
  console.log("Paystack sandbox account authorization: PASS (read only)");

  console.log("Provider credentials and infrastructure are reachable. No payments or renders were performed.");
}
main().catch((error: unknown) => {
  console.error("Staging readiness failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
