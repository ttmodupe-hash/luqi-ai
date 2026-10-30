// operations/guest-maintenance.ts
import { Hono as Hono2 } from "hono@4.13.13";
import mysql3 from "mysql2/promise";

// api/guest-trial.ts
import { Hono } from "hono@4.13.13";
import { bodyLimit } from "hono/body-limit";
import { createHmac as createHmac2, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod@4.6.7";
import { GoogleGenAI, ThinkingLevel } from "@google/genai@2.29.0";

// api/services/pilotModels.ts
var PILOT_MODELS = Object.freeze({
  gemini: "gemini-3.8-flash",
  openai: "gpt-6-luna"
});

// api/services/guestTrialBudget.ts
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import mysql2 from "mysql2/promise";

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

// api/services/aiPilotBudget.ts
import mysql from "mysql2/promise";

// src/lib/pilot-input.ts
var MAX_PILOT_INPUT_CHARS = 6e3;
var MAX_PILOT_HISTORY_TURNS = 4;
var MAX_PILOT_HISTORY_TEXT_CHARS = 350;
var MAX_PILOT_LANGUAGE_CHARS = 50;
var PilotInputError = class extends Error {
  code;
  constructor(code) {
    super(code === "AI_INPUT_TOO_LARGE" ? "The complete question and context exceed the AI trial input limit." : "The AI trial input is invalid.");
    this.name = "PilotInputError";
    this.code = code;
  }
};
function formatInput(prompt, language, past) {
  return `Language preference: ${language}
Recent conversation:
${past}
User: ${prompt}`;
}
var MAX_PILOT_QUESTION_CHARS = MAX_PILOT_INPUT_CHARS - formatInput("", "auto", "").length;
function buildPilotInput(prompt, language = "auto", history = []) {
  if (typeof prompt !== "string" || !prompt.trim() || typeof language !== "string" || !language.trim() || language.length > MAX_PILOT_LANGUAGE_CHARS || !Array.isArray(history) || history.length > MAX_PILOT_HISTORY_TURNS) {
    throw new PilotInputError("INVALID_INPUT");
  }
  if (prompt.length > MAX_PILOT_INPUT_CHARS) throw new PilotInputError("AI_INPUT_TOO_LARGE");
  const past = history.map((turn) => {
    if (!turn || typeof turn !== "object" || Array.isArray(turn)) throw new PilotInputError("INVALID_INPUT");
    const item = turn;
    if (Object.keys(item).some((key) => key !== "sender" && key !== "text") || item.sender !== "user" && item.sender !== "ai" || typeof item.text !== "string" || item.text.length > MAX_PILOT_HISTORY_TEXT_CHARS) throw new PilotInputError("INVALID_INPUT");
    return `${item.sender}: ${item.text}`;
  }).join("\n");
  const input = formatInput(prompt, language, past);
  if (input.length > MAX_PILOT_INPUT_CHARS) throw new PilotInputError("AI_INPUT_TOO_LARGE");
  return input;
}

// api/services/aiPilotBudget.ts
var PilotBlocked = class extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
    this.name = "PilotBlocked";
  }
};
var PILOT_CENTS = Object.freeze({ gemini: 6e3, openai: 4e3 });
var PILOT_EXPANDED_CENTS = Object.freeze({ gemini: 16500, openai: 13500 });
function readApprovedPilotCaps(env = process.env) {
  if (env.LUQI_AI_MONTHLY_USD === "100" && env.LUQI_GEMINI_MONTHLY_USD === "60" && env.LUQI_OPENAI_MONTHLY_USD === "40") return PILOT_CENTS;
  if (env.LUQI_AI_MONTHLY_USD === "300" && env.LUQI_GEMINI_MONTHLY_USD === "165" && env.LUQI_OPENAI_MONTHLY_USD === "135") return PILOT_EXPANDED_CENTS;
  throw new PilotBlocked("AI_BUDGET_CONFIGURATION_INVALID");
}
function utcDay(now = /* @__PURE__ */ new Date()) {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid clock");
  return now.toISOString().slice(0, 10);
}
function utcMonth(now = /* @__PURE__ */ new Date()) {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid clock");
  return now.toISOString().slice(0, 7);
}
function assertPilotEnabled(env = process.env) {
  if (env.LUQI_AI_PROVIDER_ENABLED !== "true") throw new PilotBlocked("AI_DISABLED");
  if (env.LUQI_AI_BILLING_APPROVED !== "true") {
    throw new PilotBlocked("BILLING_NOT_APPROVED");
  }
  readApprovedPilotCaps(env);
}

// api/services/guestTrialBudget.ts
var GUEST_REPLIES_PER_MONTH = 3;
var GUEST_RESERVATION_CENTS = 10;
var GUEST_GLOBAL_MONTH_ID = -1;
var GUEST_GLOBAL_DAY_ID = -2;
function guestCapacity(env = process.env) {
  if (env.LUQI_GUEST_CAPACITY_PROFILE === void 0 || env.LUQI_GUEST_CAPACITY_PROFILE === "pilot")
    return { monthly: 100, daily: 12, cents: 10, budget: 1e3, expanded: false };
  if (env.LUQI_GUEST_CAPACITY_PROFILE !== "public-1000-v1" || env.LUQI_GUEST_TRUST_RAILWAY_PROXY !== "true" || PILOT_MODELS.gemini !== "gemini-3.8-flash" || readApprovedPilotCaps(env).gemini !== 16500)
    throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  return { monthly: 3e3, daily: 3e3, cents: 1, budget: 3e3, expanded: true };
}
var GUEST_COST_ID = -3;
function guestNetworkId(ip, secret, now = /* @__PURE__ */ new Date()) {
  if (!ip || !isIP(ip) || secret.length < 32) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  const canonical = isIP(ip) === 6 ? new URL("http://[" + ip + "]").hostname : ip;
  return -(2 ** 49 + createHmac("sha256", secret).update("guest-network-v1|" + utcDay(now) + "|" + canonical).digest().readUIntBE(0, 6));
}
function burstId(now) {
  return -(2 ** 50 + Math.floor(now.getTime() / 6e4));
}
var GuestTrialError = class extends Error {
  constructor(code, retryAfter = 60) {
    super(code);
    this.code = code;
    this.retryAfter = retryAfter;
  }
};
function guestTrialEnabled(env = process.env) {
  if (env.LUQI_GUEST_CHAT_ENABLED !== "true" || !env.JWT_SECRET || env.JWT_SECRET.length < 32 || !env.LUQI_PILOT_GEMINI_API_KEY) return false;
  try {
    assertPilotEnabled(env);
    guestCapacity(env);
    return true;
  } catch {
    return false;
  }
}
var guestPool = null;
function pool() {
  if (guestPool) return guestPool;
  let config;
  try {
    config = parseMySqlConnectionSettings(process.env);
  } catch {
    throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  }
  if (!config) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  guestPool = mysql2.createPool({
    ...config,
    connectionLimit: 3,
    waitForConnections: true,
    queueLimit: 12,
    connectTimeout: 3e3
  });
  return guestPool;
}
var counter = "ai_pilot_daily_user_usage";
var monthDay = (now) => utcMonth(now) + "-01";
function guestQuotaStatus(guestAttempts, globalMonth, globalDay, capacity = guestCapacity()) {
  for (const x of [guestAttempts, globalMonth, globalDay])
    if (!Number.isSafeInteger(x) || x < 0) return { enabled: false, remaining: 0, limit: 3, reason: "unavailable" };
  if (globalMonth >= capacity.monthly || globalDay >= capacity.daily)
    return { enabled: false, remaining: 0, limit: 3, reason: "paused" };
  if (guestAttempts >= GUEST_REPLIES_PER_MONTH)
    return { enabled: false, remaining: 0, limit: 3, reason: "complete" };
  return { enabled: true, remaining: GUEST_REPLIES_PER_MONTH - guestAttempts, limit: 3, reason: "ready" };
}
async function guestTrialSnapshot(guestId2, now = /* @__PURE__ */ new Date()) {
  if (!guestTrialEnabled()) return { enabled: false, remaining: 0, limit: 3, reason: "paused" };
  if (!Number.isSafeInteger(guestId2) || guestId2 >= -1e3 || guestId2 <= -(2 ** 49)) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  try {
    const [rows] = await pool().execute(
      `SELECT day_utc, user_id, attempts FROM ${counter} WHERE (day_utc=? AND user_id IN (?,?,?))
        OR (day_utc=? AND user_id=?)`,
      [monthDay(now), GUEST_GLOBAL_MONTH_ID, guestId2, GUEST_COST_ID, utcDay(now), GUEST_GLOBAL_DAY_ID]
    );
    const lookup = (day, id) => Number(rows.find((r) => r.day_utc === day && Number(r.user_id) === id)?.attempts ?? 0);
    const costRow = rows.find((r) => Number(r.user_id) === GUEST_COST_ID);
    const cost = costRow ? Number(costRow.attempts) : lookup(monthDay(now), GUEST_GLOBAL_MONTH_ID) * 10;
    if (!Number.isSafeInteger(cost) || cost < 0) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
    const capacity = guestCapacity();
    if (cost + capacity.cents > capacity.budget)
      return { enabled: false, remaining: 0, limit: 3, reason: "paused" };
    return guestQuotaStatus(
      lookup(monthDay(now), guestId2),
      lookup(monthDay(now), GUEST_GLOBAL_MONTH_ID),
      lookup(utcDay(now), GUEST_GLOBAL_DAY_ID)
    );
  } catch {
    return { enabled: false, remaining: 0, limit: 3, reason: "unavailable" };
  }
}
async function reserveGuestAttempt(guestId2, now = /* @__PURE__ */ new Date(), networkId) {
  if (!guestTrialEnabled()) throw new GuestTrialError("GUEST_TRIAL_PAUSED");
  if (!Number.isSafeInteger(guestId2) || guestId2 >= -1e3 || guestId2 <= -(2 ** 49)) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  const capacity = guestCapacity();
  if (capacity.expanded && (!Number.isSafeInteger(networkId) || networkId > -(2 ** 49) || networkId <= -(2 ** 50)))
    throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  const month = monthDay(now), day = utcDay(now), period = utcMonth(now);
  let connection;
  let started = false;
  try {
    connection = await pool().getConnection();
    await connection.beginTransaction();
    started = true;
    const identifiers = [
      [month, GUEST_GLOBAL_MONTH_ID],
      [day, GUEST_GLOBAL_DAY_ID],
      [month, guestId2],
      ...capacity.expanded ? [[day, networkId], [day, burstId(now)]] : []
    ];
    const usage = /* @__PURE__ */ new Map();
    for (const [periodDay, id] of identifiers) {
      await connection.execute(`INSERT INTO ${counter} (day_utc,user_id,attempts) VALUES (?,?,0)
        ON DUPLICATE KEY UPDATE attempts=attempts`, [periodDay, id]);
      const [rows] = await connection.execute(
        `SELECT attempts FROM ${counter} WHERE day_utc=? AND user_id=? FOR UPDATE`,
        [periodDay, id]
      );
      if (rows.length !== 1) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
      const attempts = Number(rows[0].attempts);
      if (!Number.isSafeInteger(attempts) || attempts < 0) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
      usage.set(id.toString(), attempts);
    }
    const result = guestQuotaStatus(
      usage.get(guestId2.toString()),
      usage.get(String(GUEST_GLOBAL_MONTH_ID)),
      usage.get(String(GUEST_GLOBAL_DAY_ID)),
      capacity
    );
    if (!result.enabled) throw new GuestTrialError(result.reason === "complete" ? "GUEST_TRIAL_COMPLETE" : "GUEST_TRIAL_PAUSED");
    if (capacity.expanded && usage.get(String(networkId)) >= 300)
      throw new GuestTrialError("GUEST_RATE_LIMITED", Math.ceil((Date.parse(day + "T00:00:00Z") + 864e5 - now.getTime()) / 1e3));
    if (capacity.expanded && usage.get(String(burstId(now))) >= 60)
      throw new GuestTrialError("GUEST_RATE_LIMITED");
    await connection.execute(`INSERT INTO ${counter} (day_utc,user_id,attempts) VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE attempts=attempts`, [
      month,
      GUEST_COST_ID,
      usage.get(String(GUEST_GLOBAL_MONTH_ID)) * GUEST_RESERVATION_CENTS
    ]);
    const [guestCost] = await connection.execute(
      `SELECT attempts FROM ${counter} WHERE day_utc=? AND user_id=? FOR UPDATE`,
      [month, GUEST_COST_ID]
    );
    const reserved = Number(guestCost[0]?.attempts);
    if (!Number.isSafeInteger(reserved) || reserved < 0) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
    if (reserved + capacity.cents > capacity.budget) throw new GuestTrialError("GUEST_TRIAL_PAUSED");
    await connection.execute(`INSERT INTO ai_pilot_monthly_spend (month_utc,provider,reserved_cents)
      VALUES (?,'gemini',0) ON DUPLICATE KEY UPDATE reserved_cents=reserved_cents`, [period]);
    const [cost] = await connection.execute(
      "SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='gemini' FOR UPDATE",
      [period]
    );
    if (cost.length !== 1 || !Number.isSafeInteger(Number(cost[0].reserved_cents)) || Number(cost[0].reserved_cents) < 0 || Number(cost[0].reserved_cents) + capacity.cents > readApprovedPilotCaps().gemini) throw new GuestTrialError("GUEST_TRIAL_PAUSED");
    for (const [periodDay, id] of identifiers)
      await connection.execute(`UPDATE ${counter} SET attempts=attempts+1 WHERE day_utc=? AND user_id=?`, [periodDay, id]);
    await connection.execute(
      `UPDATE ${counter} SET attempts=attempts+? WHERE day_utc=? AND user_id=?`,
      [capacity.cents, month, GUEST_COST_ID]
    );
    await connection.execute(
      "UPDATE ai_pilot_monthly_spend SET reserved_cents=reserved_cents+? WHERE month_utc=? AND provider='gemini'",
      [capacity.cents, period]
    );
    await connection.commit();
    started = false;
  } catch (error) {
    if (started && connection) {
      try {
        await connection.rollback();
      } catch {
        throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
      }
    }
    if (error instanceof GuestTrialError) throw error;
    if (error instanceof PilotBlocked && error.reason === "AI_PROVIDER_BUDGET_EXHAUSTED")
      throw new GuestTrialError("GUEST_TRIAL_PAUSED");
    throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  } finally {
    connection?.release();
  }
}

// api/services/guestTokenCount.ts
async function countGuestInputTokens(input, systemInstruction, fetcher = fetch) {
  try {
    const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${PILOT_MODELS.gemini}:countTokens`, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5e3),
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.LUQI_PILOT_GEMINI_API_KEY },
      body: JSON.stringify({ generateContentRequest: {
        model: "models/" + PILOT_MODELS.gemini,
        contents: [{ role: "user", parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
      } })
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error("Unavailable token count");
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) throw new Error("Oversized token count");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {
      });
      reader.releaseLock();
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || !Number.isSafeInteger(data.totalTokens) || data.totalTokens < 1 || data.totalTokens > 4096)
      throw new Error("Invalid token count");
    return { totalTokens: data.totalTokens };
  } catch {
    throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  }
}

// api/services/pilotOutput.ts
var PilotOutputError = class extends Error {
  code;
  constructor(code) {
    super(code);
    this.name = "PilotOutputError";
    this.code = code;
  }
};
var invalid = () => {
  throw new PilotOutputError("AI_RESPONSE_INVALID");
};
var blocked = () => {
  throw new PilotOutputError("AI_RESPONSE_BLOCKED");
};
var incomplete = () => {
  throw new PilotOutputError("AI_REPLY_INCOMPLETE");
};
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value;
}
function list(value, max = 32) {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return invalid();
  return value;
}
function safety(value) {
  if (value === void 0) return;
  if (!Array.isArray(value) || value.length > 32) return invalid();
  for (const entry of value) {
    const flag = object(entry).blocked;
    if (flag === true) return blocked();
    if (flag !== void 0 && flag !== false) return invalid();
  }
}
function finalText(parts, separator) {
  const text = parts.join(separator).trim();
  if (!text || text.length > 2e4) return invalid();
  return text;
}
var BLOCKED_FINISH = /* @__PURE__ */ new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
  "IMAGE_RECITATION",
  "MODEL_ARMOR"
]);
function readGeminiText(value) {
  const response = object(value);
  if (response.promptFeedback !== void 0) {
    const feedback = object(response.promptFeedback);
    if (feedback.blockReason !== void 0 && feedback.blockReason !== "BLOCK_REASON_UNSPECIFIED") return blocked();
    safety(feedback.safetyRatings);
  }
  const candidates = list(response.candidates, 1);
  const candidate = object(candidates[0]);
  safety(candidate.safetyRatings);
  if (typeof candidate.finishReason === "string" && BLOCKED_FINISH.has(candidate.finishReason)) return blocked();
  if (candidate.finishReason === "MAX_TOKENS" || candidate.finishReason === "CONTINUATION") return incomplete();
  if (candidate.finishReason !== "STOP") return invalid();
  const content = object(candidate.content);
  if (content.role !== "model") return invalid();
  const texts = [];
  for (const value2 of list(content.parts)) {
    const part = object(value2);
    if (Object.keys(part).some((key) => !["text", "thought", "thoughtSignature"].includes(key))) return invalid();
    if (part.thought !== void 0 && typeof part.thought !== "boolean") return invalid();
    if (part.thought === true) continue;
    if (typeof part.text !== "string" || part.text.length > 2e4) return invalid();
    texts.push(part.text);
  }
  return finalText(texts, "");
}

// api/guest-trial.ts
var GUEST_COOKIE = "luqi_guest_trial_v1";
var MAX_GUEST_INPUT = 800;
var guestBody = z.object({
  prompt: z.string().trim().min(1).max(MAX_GUEST_INPUT),
  history: z.array(z.object({
    sender: z.enum(["user", "ai"]),
    text: z.string().trim().min(1).max(250)
  }).strict()).max(2).optional()
}).strict();
function signGuestIdentifier(id, secret, now = /* @__PURE__ */ new Date()) {
  if (!/^[a-f0-9]{32}$/.test(id) || secret.length < 32) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  const expiry = Math.floor(now.getTime() / 1e3) + 2592e3;
  const payload = id + "." + expiry;
  return payload + "." + createHmac2("sha256", secret).update("luqi-guest-cookie-v2|" + payload).digest("hex");
}
function validateGuestCookie(value, secret, now = /* @__PURE__ */ new Date()) {
  if (secret.length < 32) return null;
  if (/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value ?? "")) {
    if (guestCapacity().expanded) return null;
    const [id2, signature2] = value.split(".");
    const expected2 = createHmac2("sha256", secret).update("luqi-guest-cookie-v1|" + id2).digest("hex");
    return timingSafeEqual(Buffer.from(signature2, "hex"), Buffer.from(expected2, "hex")) ? id2 : null;
  }
  if (!/^[a-f0-9]{32}\.\d{10}\.[a-f0-9]{64}$/.test(value ?? "")) return null;
  const [id, expires, signature] = value.split(".");
  const expiry = Number(expires), seconds = Math.floor(now.getTime() / 1e3);
  if (expiry <= seconds || expiry > seconds + 2592e3) return null;
  const expected = createHmac2("sha256", secret).update("luqi-guest-cookie-v2|" + id + "." + expires).digest("hex");
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")) ? id : null;
}
function guestCounterId(id, secret) {
  if (!/^[a-f0-9]{32}$/.test(id) || secret.length < 32) throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
  const digest = createHmac2("sha256", secret).update("luqi-guest-ledger-v1|" + id).digest();
  return -(1e3 + digest.readUIntBE(0, 6));
}
function cookieValue(header) {
  if (!header || header.length > 4096) return void 0;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === GUEST_COOKIE) return rest.join("=");
  }
  return void 0;
}
function guestCookie(id, secret) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${GUEST_COOKIE}=${signGuestIdentifier(id, secret)}; Path=/api/v1/guest-chat; Max-Age=2592000; HttpOnly; SameSite=Strict${secure}`;
}
function permittedGuestOrigin(source, target) {
  if (!source || !/^https?:\/\//.test(source)) return false;
  try {
    const a = new URL(source), b = new URL(target);
    if (a.username || a.password || a.search || a.hash || a.pathname !== "/") return false;
    if (a.hostname !== b.hostname || a.port !== b.port) return false;
    if (a.protocol === "https:") return true;
    return process.env.NODE_ENV !== "production" && a.protocol === "http:" && ["localhost", "127.0.0.1"].includes(a.hostname);
  } catch {
    return false;
  }
}
var GUEST_POLICY = `You are Luqi, an accessible multilingual African AI learning and practical assistant.
This is a very short guest introduction, not a full subscription or authorised professional service.
Answer the actual question directly with friendly, useful detail. Interpret follow-up corrections by using only the short, explicitly submitted guest history.
Use simple language for children when asked; support practical planning, learning, writing and creativity.
Give a complete answer in a few clear paragraphs (typically under 180 words).
Do not claim to browse, search live providers, make a booking, generate video/audio, store an account or verify current legal/medical/financial facts.
If someone asks for an advanced capability, give the best first explanation and point out that the signed-in tools may have additional functions. Do not pressure someone to register.
Never claim KHORO is a separate assistant or ask for credentials. You are Luqi.`;
var guestTrial = new Hono();
guestTrial.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");
  return next();
});
guestTrial.get("/", async (c) => {
  if (!guestTrialEnabled()) return c.json({ enabled: false, remaining: 0, limit: 3, reason: "paused" });
  const secret = process.env.JWT_SECRET;
  let id = validateGuestCookie(cookieValue(c.req.header("cookie")), secret);
  if (!id) {
    id = randomBytes(16).toString("hex");
    c.header("Set-Cookie", guestCookie(id, secret));
  } else if (cookieValue(c.req.header("cookie"))?.split(".").length === 2) {
    c.header("Set-Cookie", guestCookie(id, secret));
  }
  const status = await guestTrialSnapshot(guestCounterId(id, secret));
  return c.json(status);
});
guestTrial.post("/", bodyLimit({
  maxSize: 4 * 1024,
  onError: (c) => c.json({ code: "INVALID_INPUT" }, 413)
}));
guestTrial.post("/", async (c) => {
  if (!guestTrialEnabled()) return c.json({ code: "GUEST_TRIAL_PAUSED" }, 503);
  if (!permittedGuestOrigin(c.req.header("origin"), c.req.url)) return c.json({ code: "GUEST_ORIGIN_DENIED" }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("content-type") ?? ""))
    return c.json({ code: "INVALID_INPUT" }, 415);
  const secret = process.env.JWT_SECRET;
  const id = validateGuestCookie(cookieValue(c.req.header("cookie")), secret);
  if (!id) return c.json({ code: "GUEST_START_REQUIRED" }, 428);
  const parsed = guestBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ code: "INVALID_INPUT" }, 400);
  const { prompt, history } = parsed.data;
  let input;
  try {
    input = buildPilotInput(prompt, "auto", history);
  } catch (e) {
    return c.json({ code: e instanceof PilotInputError ? e.code : "INVALID_INPUT" }, 400);
  }
  try {
    const capacity = guestCapacity();
    await reserveGuestAttempt(
      guestCounterId(id, secret),
      /* @__PURE__ */ new Date(),
      capacity.expanded ? guestNetworkId(c.req.header("x-real-ip"), secret) : void 0
    );
    const model = new GoogleGenAI({ apiKey: process.env.LUQI_PILOT_GEMINI_API_KEY });
    if (capacity.expanded) {
      const tokens = await countGuestInputTokens(input, GUEST_POLICY);
      if (!Number.isSafeInteger(tokens.totalTokens) || tokens.totalTokens < 1 || tokens.totalTokens > 4096)
        throw new GuestTrialError("GUEST_TRIAL_UNAVAILABLE");
    }
    const output = await model.models.generateContent({
      model: PILOT_MODELS.gemini,
      contents: input,
      config: {
        systemInstruction: GUEST_POLICY,
        maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        httpOptions: { timeout: 2e4, retryOptions: { attempts: 1 } }
      }
    });
    const text = readGeminiText(output);
    const status = await guestTrialSnapshot(guestCounterId(id, secret));
    return c.json({
      status: "success",
      provider: "gemini",
      provider_model: PILOT_MODELS.gemini,
      response: text,
      remaining: status.remaining
    });
  } catch (error) {
    if (error instanceof GuestTrialError) {
      const isLimit = error.code === "GUEST_TRIAL_COMPLETE" || error.code === "GUEST_TRIAL_PAUSED" || error.code === "GUEST_RATE_LIMITED";
      if (error.code === "GUEST_RATE_LIMITED") c.header("Retry-After", String(error.retryAfter));
      return c.json({ status: "unavailable", code: error.code }, isLimit ? 429 : 503);
    }
    if (error instanceof PilotOutputError)
      return c.json({ status: "unavailable", code: error.code }, error.code === "AI_RESPONSE_BLOCKED" ? 422 : 502);
    return c.json({ status: "unavailable", code: "RESPONSE_UNCONFIRMED" }, 503);
  }
});

// operations/guest-maintenance.ts
var stage = "configuration";
var mode = process.env.LUQI_GUEST_MAINTENANCE_MODE;
var guestId = "36103020261000000000000000000001";
async function run() {
  if (!process.env.DATABASE_URL || !mode) {
    console.log(JSON.stringify({ operation: "guest_maintenance", status: "configuration_pending" }));
    return;
  }
  if (!["cleanup", "canary", "check"].includes(mode)) throw new Error("Invalid mode");
  const url = new URL(process.env.DATABASE_URL);
  if (url.protocol !== "mysql:" || !url.pathname.slice(1)) throw new Error("Dedicated MySQL required");
  stage = "database_connect";
  const db = await mysql3.createConnection({ uri: url.toString(), connectTimeout: 5e3 });
  try {
    const now = /* @__PURE__ */ new Date(), month = now.toISOString().slice(0, 7);
    const [spend] = await db.execute("SELECT provider,reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=?", [month]);
    const [guest] = await db.execute("SELECT user_id,attempts FROM ai_pilot_daily_user_usage WHERE day_utc=? AND user_id IN (-1,-3)", [month + "-01"]);
    const snapshot = () => ({
      month,
      providerReservedCents: Object.fromEntries(spend.map((r) => [r.provider, Number(r.reserved_cents)])),
      guestAttempts: Number(guest.find((r) => Number(r.user_id) === -1)?.attempts ?? 0),
      guestReservedCents: Number(guest.find((r) => Number(r.user_id) === -3)?.attempts ?? 0)
    });
    if (mode === "cleanup") {
      const cutoff = new Date(now.getTime() - 62 * 864e5).toISOString().slice(0, 10);
      let removed = 0;
      for (let batch = 0; batch < 20; batch++) {
        const [result] = await db.execute("DELETE FROM ai_pilot_daily_user_usage WHERE day_utc < ? AND user_id < -1000 LIMIT 500", [cutoff]);
        removed += result.affectedRows;
        if (result.affectedRows < 500) break;
      }
      const [left] = await db.execute("SELECT COUNT(*) AS pending FROM ai_pilot_daily_user_usage WHERE day_utc < ? AND user_id < -1000", [cutoff]);
      console.log(JSON.stringify({
        operation: "guest_cleanup",
        status: Number(left[0].pending) ? "backlog" : "success",
        cutoff,
        removed,
        pending: Number(left[0].pending),
        ...snapshot()
      }));
      if (Number(left[0].pending)) process.exitCode = 2;
      return;
    }
    stage = "budget_profile";
    const caps = readApprovedPilotCaps();
    if (caps.gemini !== 16500 || caps.openai !== 13500) throw new Error("Expected approved profile");
    console.log(JSON.stringify({ operation: "guest_preflight", status: "success", approvedCapsCents: caps, ...snapshot() }));
    if (mode !== "canary") {
      const ids = ["192.0.2.201", "198.51.100.201"].map((ip) => guestNetworkId(ip, process.env.JWT_SECRET, now));
      const [spoof] = await db.execute("SELECT COALESCE(SUM(attempts),0) AS attempts FROM ai_pilot_daily_user_usage WHERE day_utc=? AND user_id IN (?,?)", [now.toISOString().slice(0, 10), ...ids]);
      console.log(JSON.stringify({ operation: "guest_proxy_check", clientSuppliedIpAttempts: Number(spoof[0].attempts), expected: 0 }));
      return;
    }
    if (process.env.LUQI_GUEST_CAPACITY_PROFILE !== "public-1000-v1" || process.env.LUQI_GUEST_TRUST_RAILWAY_PROXY !== "true")
      throw new Error("Expanded canary configuration required");
    const before = Number(spend.find((r) => r.provider === "gemini")?.reserved_cents ?? 0);
    stage = "fetch_instrumentation";
    const originalFetch = globalThis.fetch;
    let usage;
    globalThis.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const target = String(args[0] instanceof Request ? args[0].url : args[0]);
      if (target.startsWith("https://generativelanguage.googleapis.com/") && target.includes(":generateContent") && response.ok) {
        const data = await response.clone().json();
        const m = data.usageMetadata;
        if (m) usage = { input: Number(m.promptTokenCount ?? 0), output: Number(m.candidatesTokenCount ?? 0), thinking: Number(m.thoughtsTokenCount ?? 0) };
      }
      return response;
    };
    let status, answer;
    try {
      stage = "guest_route";
      const probe = new Hono2();
      probe.route("/api/v1/guest-chat", guestTrial);
      const response = await probe.request("https://app.luqi-ai.com/api/v1/guest-chat", {
        method: "POST",
        headers: {
          Origin: "https://app.luqi-ai.com",
          "Content-Type": "application/json",
          Cookie: "luqi_guest_trial_v1=" + signGuestIdentifier(guestId, process.env.JWT_SECRET),
          "x-real-ip": "192.0.2.61"
        },
        body: JSON.stringify({ prompt: "Explain how Luqi helps a small South African business in two short sentences. Include the exact code LUQI361CANARY." })
      });
      status = response.status;
      console.log(JSON.stringify({ operation: "guest_route_response", httpStatus: status, json: (response.headers.get("content-type") ?? "").includes("application/json") }));
      stage = "response_json";
      answer = await response.json();
    } finally {
      globalThis.fetch = originalFetch;
    }
    stage = "ledger_after";
    const [afterRows] = await db.execute("SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='gemini'", [month]);
    const verified = status === 200 && answer.status === "success" && answer.provider === "gemini" && String(answer.response ?? "").includes("LUQI361CANARY");
    const validUsage = usage && Object.values(usage).every((n) => Number.isSafeInteger(n) && n >= 0) && usage.input > 0 && usage.input <= 4096 && usage.output > 0 && usage.output + usage.thinking <= 512;
    const costUsd = validUsage ? (usage.input * 0.75 + (usage.output + usage.thinking) * 3.75) / 1e6 : null;
    const ledgerDelta = Number(afterRows[0]?.reserved_cents) - before;
    console.log(JSON.stringify({
      operation: "guest_canary",
      status: verified && validUsage && ledgerDelta >= 1 ? "success" : "unverified",
      httpStatus: status,
      challengeVerified: verified,
      remaining: answer.remaining,
      code: answer.code,
      usage: validUsage ? usage : null,
      estimatedCurrentRateUsd: costUsd,
      reservationDeltaCents: ledgerDelta,
      billingEvidence: "token_usage_estimate_not_provider_invoice"
    }));
    if (!verified || !validUsage || ledgerDelta < 1) throw new Error("Canary acceptance incomplete");
  } finally {
    await db.end();
  }
}
try {
  await run();
} catch {
  console.log(JSON.stringify({ operation: "guest_maintenance", status: "failed_redacted", stage }));
  process.exitCode = 1;
}
process.exit(process.exitCode ?? 0);

import "mysql2@3.24.5";

import "hono@4.13.13";

import "zod@4.6.7";

import "@google/genai@2.29.0";
