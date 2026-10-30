// Private HTTP/storage acceptance from reviewed source e968534fa8d38e857cea543fbb9a085df5f4450f; exact function binding only.
// db/businessAcceptance.ts
import mysqlDependency from "mysql2@3.24.5";
import {createRequire as operatorRequire} from "node:module";
const mysql3=operatorRequire(import.meta.url)("mysql2/promise");void mysqlDependency;
import { randomUUID, randomBytes } from "node:crypto";

// db/prepareBusinessStorage.ts
const mysql2=mysql3;

// api/lib/mysqlConfig.ts
function parseMySqlConnectionSettings(environment) {
  const url = environment.DATABASE_URL?.trim();
  if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("DATABASE_URL is not a valid connection URL");
    }
    if (parsed.protocol !== "mysql:") {
      throw new Error("Unsupported DATABASE_URL driver: LUQI web backend requires MySQL");
    }
    const database2 = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const port2 = parsed.port ? Number(parsed.port) : 3306;
    const user2 = decodeURIComponent(parsed.username);
    const password2 = decodeURIComponent(parsed.password);
    if (!parsed.hostname || !database2 || !user2 || !password2 || !Number.isInteger(port2) || port2 < 1 || port2 > 65535) {
      throw new Error("DATABASE_URL lacks required MySQL connection settings");
    }
    return { host: parsed.hostname, port: port2, database: database2, user: user2, password: password2 };
  }
  if (!environment.DB_HOST?.trim()) return null;
  const port = Number(environment.DB_PORT || "3306");
  const host = environment.DB_HOST.trim();
  const user = environment.DB_USER?.trim() || "";
  const password = environment.DB_PASSWORD || "";
  const database = environment.DB_NAME?.trim() || "";
  if (!host || !user || !password || !database || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Incomplete DB_HOST/DB_USER/DB_PASSWORD/DB_NAME connection settings");
  }
  return { host, port, database, user, password };
}

// db/runtimeSchema.ts
const mysql=mysql3;

// db/prepareBusinessStorage.ts
function businessOperatorSettings(env) {
  const runtime = parseMySqlConnectionSettings(env), operator = parseMySqlConnectionSettings({ DATABASE_URL: env.LUQI_DB_OPERATOR_URL });
  const fixture = env.GITHUB_ACTIONS === "true" && env.LUQI_MYSQL_CI_FIXTURE === "true" && env.LUQI_DB_OPERATOR_URL === "mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci" && runtime?.host === "127.0.0.1" && runtime.port === 3306 && runtime.database === "luqi_ci" && runtime.user === "luqi_business_fixture";
  const production = env.RAILWAY_PROJECT_ID === "9f627cb8-3136-4b30-89d2-32ca648a1e5f" && env.RAILWAY_ENVIRONMENT_ID === "1e192ef3-1fa6-4684-81fc-60165c7b0e22" && env.RAILWAY_SERVICE_NAME === "luqi-business-private-operator" && env.RAILWAY_SERVICE_ID === "00a6c99f-39bb-43fe-99da-a520a8a0fef1" && /^[a-f0-9]{40}$/.test(env.LUQI_DB_CHECK_SOURCE_SHA ?? "") && env.LUQI_DB_CHECK_SOURCE_SHA === "e968534fa8d38e857cea543fbb9a085df5f4450f" && runtime?.host.endsWith(".railway.internal");
  if (!runtime || !operator || !fixture && !production || runtime.host !== operator.host || runtime.port !== operator.port || runtime.database !== operator.database || !/^[A-Za-z0-9_]{1,64}$/.test(runtime.database) || runtime.user !== (fixture ? "luqi_business_fixture" : "luqi_web_runtime") || runtime.user === operator.user) throw Error("BUSINESS_SETUP_SCOPE_REJECTED");
  return { runtime, operator };
}

// contracts/business-connect.ts
import { z } from "zod@4.6.7";
var BUSINESS_CONSENT_VERSION = "2026-10-v1";
var businessId = z.string().uuid();
var businessProvince = z.enum(["EC", "FS", "GP", "KZN", "LP", "MP", "NC", "NW", "WC"]);
var BUSINESS_CATEGORIES = ["trades", "food", "beauty", "retail", "transport", "tourism", "education", "technology", "professional", "other"];
var BUSINESS_LANGUAGES = ["English", "Afrikaans", "isiZulu", "isiXhosa", "Sesotho", "Setswana", "Sepedi", "siSwati", "Tshivenda", "Tsonga", "isiNdebele", "South African Sign Language"];
var text = (min, max) => z.string().trim().min(min).max(max).refine((s) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s), "Remove control characters");
var https = z.string().max(300).refine((value) => {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && u.port === "" && u.hostname.includes(".") && !u.hostname.endsWith(".") && !/^[\d.]+$/.test(u.hostname) && !/(?:^|\.)(?:localhost|local|internal|invalid)$/.test(u.hostname) && !u.hostname.includes(":");
  } catch {
    return false;
  }
}, "Use a public HTTPS website");
var businessDraft = z.object({
  name: text(2, 100),
  category: z.enum(BUSINESS_CATEGORIES),
  description: text(10, 1e3),
  services: z.array(text(2, 80)).min(1).max(12),
  province: businessProvince,
  locality: text(2, 80),
  kind: z.enum(["service_area", "mobile", "public_storefront"]),
  serviceArea: text(2, 200),
  publicAddress: text(0, 180),
  phone: z.string().trim().max(30).refine((s) => !s || /^\+?[0-9 ()-]{7,30}$/.test(s) && s.replace(/\D/g, "").length >= 7 && s.replace(/\D/g, "").length <= 15, "Use a business telephone number"),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  website: https,
  hours: text(0, 180),
  pricing: text(0, 300),
  languages: z.array(z.enum(BUSINESS_LANGUAGES)).min(1).max(12),
  visibility: z.object({ phone: z.boolean(), email: z.boolean(), website: z.boolean(), address: z.boolean(), pricing: z.boolean() }).strict()
}).strict().superRefine((d, c) => {
  if (d.kind !== "public_storefront" && (d.publicAddress || d.visibility.address)) c.addIssue({ code: "custom", path: ["publicAddress"], message: "Mobile and service-area businesses cannot store or publish an exact address." });
  if (d.publicAddress && !d.visibility.address) c.addIssue({ code: "custom", path: ["visibility", "address"], message: "Enter an address only if it is an approved public storefront address." });
  for (const key of ["phone", "email", "website", "address", "pricing"]) {
    const value = key === "address" ? d.publicAddress : d[key];
    if (d.visibility[key] && !value) c.addIssue({ code: "custom", path: ["visibility", key], message: "A visible field must have a value." });
  }
});
var businessPublic = z.object({
  id: businessId,
  revision: z.number().int().positive(),
  name: text(2, 100),
  category: z.enum(BUSINESS_CATEGORIES),
  description: text(10, 1e3),
  services: z.array(text(2, 80)).min(1).max(12),
  province: businessProvince,
  locality: text(2, 80),
  kind: z.enum(["service_area", "mobile", "public_storefront"]),
  serviceArea: text(2, 200),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(254).optional(),
  website: https.optional(),
  publicAddress: text(1, 180).optional(),
  hours: text(0, 180),
  pricing: text(0, 300).optional(),
  languages: z.array(z.enum(BUSINESS_LANGUAGES)).min(1).max(12),
  reviewedAt: z.string().datetime(),
  listingReview: z.literal("publication_reviewed"),
  locationReview: z.literal("owner_provided"),
  contactReview: z.literal("not_independently_verified"),
  externalMaps: z.literal("not_submitted")
}).strict();
var businessState = z.enum(["draft", "pending", "published", "paused", "rejected"]);
var businessReason = z.enum(["none", "details_unclear", "contact_needs_check", "location_needs_check", "duplicate", "privacy_risk", "misleading", "other"]);
var businessOwned = z.object({ id: businessId, revision: z.number().int().positive(), state: businessState, draft: businessDraft, reason: businessReason, updatedAt: z.string(), public: businessPublic.nullable() }).strict();
var businessSave = z.object({ expectedRevision: z.number().int().min(0).max(1e6), draft: businessDraft }).strict();
var businessRevision = z.object({ expectedRevision: z.number().int().min(1).max(1e6) }).strict();
var businessSubmit = businessRevision.extend({ consentVersion: z.literal(BUSINESS_CONSENT_VERSION), ownerAuthorised: z.literal(true), publicationConsent: z.literal(true) }).strict();
var businessDecision = businessRevision.extend({ action: z.enum(["approve", "reject", "pause"]), reviewedAuthority: z.literal(true), reason: businessReason, duplicatesChecked: z.boolean() }).strict();
var businessReport = z.object({ reason: z.enum(["impersonation", "private_information", "closed_moved", "misleading", "abuse", "other"]), note: text(0, 300) }).strict();
var businessReviewItem = z.object({ id: businessId, revision: z.number().int().positive(), state: businessState, candidate: businessPublic, duplicateCount: z.number().int().min(0).max(100), reason: businessReason }).strict();

// db/businessAcceptance.ts
var BUSINESS_ACCEPTANCE_INTENT = "private-business-smoke-v1";
async function bounded(request, url, init = {}) {
  const control = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      control.abort();
      reject(Error("BUSINESS_ACCEPTANCE_HTTP_FAILED"));
    }, 12e3);
  });
  try {
    return await Promise.race([(async () => {
      const r = await request(url, { ...init, signal: control.signal, redirect: "error", credentials: "omit", cache: "no-store" });
      if (!r.body) throw Error("BUSINESS_ACCEPTANCE_HTTP_FAILED");
      const reader = r.body.getReader();
      let size = 0;
      const chunks = [];
      try {
        for (; ; ) {
          const p = await reader.read();
          if (p.done) break;
          size += p.value.byteLength;
          if (size > 128 * 1024) throw Error("BUSINESS_ACCEPTANCE_HTTP_FAILED");
          chunks.push(p.value);
        }
      } finally {
        void reader.cancel().catch(() => {
        });
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const p of chunks) {
        bytes.set(p, offset);
        offset += p.byteLength;
      }
      return { status: r.status, body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
    })(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
function requireValue(value) {
  if (!value) throw Error("BUSINESS_ACCEPTANCE_RESPONSE_FAILED");
}
async function acceptBusinessStorage(env, request = fetch) {
  if (env.LUQI_BUSINESS_ACCEPTANCE_INTENT !== BUSINESS_ACCEPTANCE_INTENT) throw Error("BUSINESS_ACCEPTANCE_SCOPE_REJECTED");
  const settings = businessOperatorSettings(env), fixture = env.GITHUB_ACTIONS === "true" && env.LUQI_MYSQL_CI_FIXTURE === "true";
  if (!fixture && (request !== fetch || !/^[a-f0-9]{40}$/.test(env.LUQI_EXPECTED_RELEASE_SHA ?? ""))) throw Error("BUSINESS_ACCEPTANCE_SCOPE_REJECTED");
  const base = fixture ? "https://127.0.0.1:8776" : "https://app.luqi-ai.com";
  const email = "luqi-business-acceptance+" + randomUUID() + "@example.invalid", name = "Luqi private acceptance " + randomUUID();
  const password = "Private-Smoke-" + randomBytes(24).toString("base64url") + "!";
  let root, phase = "RELEASE", token, accountId, removed = false, success = false;
  try {
    if (!fixture) {
      const release = await bounded(request, base + "/v1/release");
      requireValue(release.status === 200 && release.body.commit === env.LUQI_EXPECTED_RELEASE_SHA);
    }
    phase = "STATUS";
    const status = await bounded(request, base + "/api/v1/business-connect/status");
    requireValue(status.status === 200 && status.body.availability === "ready");
    phase = "ACCOUNT";
    root = await mysql3.createConnection({ ...settings.operator, connectTimeout: 4e3 });
    const [existing] = await root.execute({ sql: "SELECT id FROM users WHERE email=? LIMIT 1", timeout: 4e3 }, [email]);
    requireValue(existing.length === 0);
    const signup = await bounded(request, base + "/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
    const body = signup.body;
    requireValue(signup.status === 201 && typeof body.token === "string" && body.token.length < 4096 && body.user?.email === email && body.user?.name === name && Number.isSafeInteger(body.user?.id) && Number(body.user?.id) > 0);
    token = body.token;
    accountId = Number(body.user.id);
    const call = (path, payload, method = "POST") => bounded(request, base + "/api/v1/business-connect" + path, { method: payload === void 0 ? "GET" : method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, ...payload === void 0 ? {} : { body: JSON.stringify(payload) } });
    const id = randomUUID();
    const draft = { name: "Internal private business acceptance " + randomUUID().slice(0, 8), category: "other", description: "Controlled private storage acceptance. Never submitted for publication.", services: ["Private acceptance only"], province: "GP", locality: "Test locality", kind: "service_area", serviceArea: "Private acceptance only", publicAddress: "", phone: "", email: "", website: "", hours: "", pricing: "", languages: ["English"], visibility: { phone: false, email: false, website: false, address: false, pricing: false } };
    phase = "SAVE";
    const created = await call("/mine/" + id, { expectedRevision: 0, draft }, "PUT");
    requireValue(created.status === 200);
    const first = businessOwned.parse(created.body.profile);
    requireValue(first.id === id && first.revision === 1 && first.state === "draft" && first.public === null);
    phase = "READ";
    const mine = await call("/mine");
    const profiles = mine.body.profiles;
    requireValue(mine.status === 200 && Array.isArray(profiles) && profiles.length === 1 && businessOwned.parse(profiles[0]).id === id);
    requireValue((await bounded(request, base + "/api/v1/business-connect/public/" + id)).status === 404);
    phase = "EDIT";
    const edited = await call("/mine/" + id, { expectedRevision: 1, draft: { ...draft, hours: "Private acceptance updated" } }, "PUT");
    requireValue(edited.status === 200 && businessOwned.parse(edited.body.profile).revision === 2);
    phase = "CONFLICT";
    requireValue((await call("/mine/" + id, { expectedRevision: 1, draft }, "PUT")).status === 409);
    phase = "PAUSE";
    const paused = await call("/mine/" + id + "/pause", { expectedRevision: 2 });
    requireValue(paused.status === 200 && businessOwned.parse(paused.body.profile).revision === 3);
    phase = "DELETE";
    const deleted = await call("/mine/" + id + "/delete", { expectedRevision: 3, confirmDelete: true });
    requireValue(deleted.status === 200 && deleted.body.removed === true);
    const empty = await call("/mine");
    requireValue(empty.status === 200 && Array.isArray(empty.body.profiles) && empty.body.profiles.length === 0);
    success = true;
  } catch {
    throw Error("BUSINESS_ACCEPTANCE_" + phase + "_FAILED");
  } finally {
    try {
      if (root) {
        const [rows] = await root.execute({ sql: "SELECT id FROM users WHERE email=? AND name=? AND role='user' LIMIT 1", timeout: 4e3 }, [email, name]);
        if (rows.length) {
          requireValue(accountId === void 0 || Number(rows[0].id) === accountId);
          const [deleted] = await root.execute({ sql: "DELETE FROM users WHERE id=? AND email=? AND name=? AND role='user'", timeout: 4e3 }, [rows[0].id, email, name]);
          requireValue(deleted.affectedRows === 1);
        }
        removed = true;
      }
    } catch {
      throw Error("BUSINESS_ACCEPTANCE_CLEANUP_FAILED");
    } finally {
      if (root) await root.end().catch(() => root?.destroy());
    }
  }
  requireValue(success && removed);
  phase = "REVOCATION";
  try {
    const revoked = await bounded(request, base + "/api/v1/business-connect/mine", { headers: { Authorization: "Bearer " + token } });
    requireValue(revoked.status === 401);
  } catch {
    throw Error("BUSINESS_ACCEPTANCE_REVOCATION_FAILED");
  }
  return { format: "luqi.business-private-acceptance.v1", passed: true, signup: true, privateSaveReadEditDelete: true, staleRevisionRejected: true, publicProfilesCreated: 0, publicationRequested: false, syntheticAccountRemoved: true, removedAccountRejected: true, aiRequests: 0 };
}

// scripts/accept-business-storage.ts
var deadline = setTimeout(() => {
  console.error("BUSINESS_ACCEPTANCE_DEADLINE");
  process.exit(1);
}, 9e4);
try {
  if (process.argv.length !== 2) throw Error("BUSINESS_ACCEPTANCE_SCOPE_REJECTED");
  console.log(JSON.stringify(await acceptBusinessStorage(process.env)));
} catch (e) {
  const message = e instanceof Error ? e.message : "";
  console.error(/^BUSINESS_ACCEPTANCE_[A-Z_]+$/.test(message) ? message : "BUSINESS_ACCEPTANCE_UNCONFIRMED");
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
}

process.exit(process.exitCode??0);
