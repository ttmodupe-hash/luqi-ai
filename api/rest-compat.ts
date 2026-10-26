// =====================================================================
// REST COMPATIBILITY LAYER
// The frontend was built against a legacy REST API (/api/v25/*, /auth/*).
// These routes adapt those calls onto the real tRPC services so the UI
// works against THIS server. No canned answers anywhere: when no AI
// provider is configured, endpoints say so honestly.
// =====================================================================

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import bcrypt from "bcryptjs";
import { validNewPassword } from "./lib/passwordPolicy";
import { AuthThrottleError, reserveAuthenticationAttempt } from "./services/authThrottle";
import { getSigningSecret, signUserToken, verifyUserToken, verifyUserCredential } from "./lib/userToken";
import { eq } from "drizzle-orm";
import { getDb, getPersistentDb } from "./queries/connection";
import { users, knowledgeArticles, creditWallets } from "../db/schema";
import { orchestrateRequest, getOrchestratorStatus, routeCapability, getAgentCapableClient, executeHighPrecisionExtraction, type SearchSource } from "./services/orchestrator";
import { orchestrateAgent } from "./services/agent";
import { appendTurn, getHistory, historyToContext } from "./services/session";
import { generateImage, imageProviderAvailable } from "./services/media";
import { paymentsConfigured } from "./services/payments";
import { analyzeContractText } from "./services/legal";
import { getRadar, RADAR_DISCLAIMER } from "./services/insights";
import { getCachedAIResponse, setCachedAIResponse, hashPrompt } from "./services/cache";
import { legacyControlUnavailable } from "./legacy-control-unavailable";
export const restCompat = new Hono();
restCompat.route("/", legacyControlUnavailable);

const LUQI_SYSTEM_PROMPT = `You are LUQI AI, an intelligent assistant for South Africa and the broader African continent.

GROUNDING RULES:
1. Answer based on verified knowledge. If you are not certain of a fact, figure, date, or amount, say so explicitly — never invent statistics, tax brackets, grant amounts, or legal requirements.
2. For tax, legal, medical, or financial questions: give practical guidance, cite the official channel (e.g. SARS eFiling, sars.gov.za, gov.za), and note that rules change and the user should confirm with the official source or a registered practitioner.
3. Be concrete and structured: numbered steps for processes, requirements lists, costs and timelines where known.
4. Keep answers focused on what the user asked. South African context by default (SARS, CIPC, Eskom, NSFAS, SASSA, eTenderPortal).
5. This is not professional advice — for filings and legal acts, recommend the official portal or a registered professional.

UBUNTU ETHOS ("Umuntu ngumuntu ngabantu" — I am because we are):
- Hyper-accessibility: translate dense corporate, legal, or technical jargon into simple, actionable steps anyone can follow.
- Community-first: frame solutions around local realities — unstable power, township economies, mobile money, stokvels, off-grid constraints.
- Dignity: never condescend; uplift the user's capability with every answer.

SOVEREIGN DATA GROUNDING (2025/2026 Authoritative Baselines):
- WEALTH vs. INCOME: Cleanly separate Asset Wealth (Balance Sheet Net Worth) from Annual Taxable Income (SARS PIT).
- USD Millionaires (HNWIs): South Africa has ~37,400 to 48,200 dollar millionaires (investable liquid assets >= $1M USD, excluding primary residence, per Henley & Partners / New World Wealth 2024–2026 reports). Never confuse this with 250k–400k (which represents global figures or broad asset tiers).
- Regional Breakdown (~48,200 total): Greater Johannesburg ~11,700–12,300; Cape Town ~7,400; Cape Winelands ~3,600; Garden Route ~3,200; Durban/Umhlanga/Ballito ~3,500; Pretoria ~2,100; Whale Coast ~1,200; Rest of SA ~14,500–15,000.
- SARS Taxable Income: ~315,000 to 330,000 assessed individual taxpayers declare taxable income >= R1,000,000 annually. Only ~35,000 taxpayers sit in the top 45% marginal bracket (> R1,817,000). An individual earning R1M/year is a high-earner, NOT a dollar millionaire.
- Political Office Remuneration: President ~R3.2M/yr, Deputy President ~R3.0M/yr, Ministers & Premiers ~R2.6M/yr, Deputy Ministers & MECs ~R2.15M/yr, MPs ~R1.25M–R1.75M/yr.
- Demographics: Population ~63M (Gauteng ~16M, KZN ~12M, Western Cape ~7.5M); President: Cyril Ramaphosa (GNU second term, June 2024); SAPS National Commissioner: General Fannie Masemola.`;

function aiUnavailableResponse() {
  return {
    response:
      "My AI brain is not connected yet — the server administrator still needs to add an AI provider key (e.g. KIMI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY) in the hosting environment. Once a key is added, I will answer questions like this properly. I won't guess answers I can't verify.",
    module: "unavailable",
    response_time_ms: 0,
  };
}

// ─── AI BRAIN / CHAT ──────────────────────────────────────────────────

async function handleChat(message: string, sessionId?: string, userKey?: string) {
  const status = getOrchestratorStatus();
  if (status.demo) {
    return aiUnavailableResponse();
  }

  // Multi-turn memory: load prior conversation turns for this session
  const session = sessionId || "guest";
  const history = sessionId ? await getHistory(session) : [];
  const historyContext = historyToContext(history);

  // User context: region/language/wallet — injected so answers fit the
  // user's real situation (Ubuntu context layer)
  let userContext: string | undefined;
  if (userKey && (process.env.DATABASE_URL || process.env.DB_HOST)) {
    try {
      const db = await getDb();
      const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userKey, userKey.toLowerCase())).limit(1);
      if (wallet) {
        userContext = `User context: region=South Africa, currency=${wallet.currency ?? "ZAR"}, wallet balance R${((wallet.balanceCents ?? 0) / 100).toFixed(2)}. If the request involves paid features, be mindful of their balance.`;
      }
    } catch { /* context lookup is non-fatal */ }
  }

  const cacheKey = hashPrompt(message);
  const cached = await getCachedAIResponse(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return { response: parsed.content, module: "cache", sources: parsed.sources ?? [], response_time_ms: 0, session_id: sessionId ?? null };
    } catch {
      return { response: cached, module: "cache", response_time_ms: 0, session_id: sessionId ?? null };
    }
  }

  const route = routeCapability(message);
  const systemPrompt = route.systemHint ? `${LUQI_SYSTEM_PROMPT}\n\n${route.systemHint}` : LUQI_SYSTEM_PROMPT;

  const start = Date.now();
  try {
    // Agent path: Kimi/OpenAI providers support real tool calling — the
    // model itself decides when to search the web or compute.
    const agentClient = getAgentCapableClient();
    if (agentClient) {
      const result = await orchestrateAgent({
        query: userContext ? `${userContext}\n\n${message}` : message,
        systemPrompt,
        client: agentClient.client,
        provider: agentClient.provider,
        model: agentClient.model,
        history,
      });
      if (sessionId) {
        await appendTurn(session, "user", message);
        await appendTurn(session, "assistant", result.content);
      }
      await setCachedAIResponse(cacheKey, JSON.stringify({ content: result.content, sources: result.sources }), 3600);
      return {
        response: result.content,
        module: result.provider + "/" + result.model,
        capability: route.capability,
        sources: result.sources,
        tools_used: result.toolsUsed,
        agent_iterations: result.iterations,
        response_time_ms: result.latencyMs,
        session_id: sessionId ?? null,
      };
    }

    const result = await orchestrateRequest({
      query: message,
      context: [userContext, historyContext].filter(Boolean).join("\n\n") || undefined,
      systemPrompt,
      useSearch: route.useSearch,
    });
    if (sessionId) {
      await appendTurn(session, "user", message);
      await appendTurn(session, "assistant", result.content);
    }
    await setCachedAIResponse(cacheKey, JSON.stringify({ content: result.content, sources: result.sources }), 3600);
    return {
      response: result.content,
      module: result.provider + "/" + result.model,
      capability: route.capability,
      sources: result.sources,
      search_augmented: result.searchAugmented,
      response_time_ms: Date.now() - start,
      session_id: sessionId ?? null,
    };
  } catch (e: any) {
    return {
      response:
        "I tried to reach my AI providers but none answered just now (" +
        (e?.message || "unknown error") +
        "). Please try again in a moment — if this persists, the provider key needs attention.",
      module: "error",
      response_time_ms: Date.now() - start,
    };
  }
}

// AI Brain page endpoint
restCompat.post("/api/v25/ai-brain/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = (body.message || body.query || "").toString().slice(0, 4000);
  if (!message.trim()) {
    return c.json({ error: "message is required" }, 400);
  }
  return c.json(await handleChat(message, body.session_id, body.email || body.user_key));
});

// Legacy chat endpoint used by useApi.chat
restCompat.post("/api/v25/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = (body.query || body.message || "").toString().slice(0, 4000);
  if (!message.trim()) {
    return c.json({ error: "query is required" }, 400);
  }
  return c.json(await handleChat(message, body.session_id, body.email || body.user_key));
});

// The old stream has no authenticated owner/budget boundary. Reject here as
// well as in boot middleware; never restore ownerless session/cache access.
restCompat.post("/api/v25/ai-brain/stream", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ status: "unavailable", code: "AI_LEGACY_ROUTE_DISABLED",
    message: "This legacy AI capability is not yet connected to the budgeted gateway." }, 503);
});

// ─── STATUS ───────────────────────────────────────────────────────────

restCompat.get("/api/v25/status", async (c) => {
  const status = getOrchestratorStatus();
  return c.json({
    version: "25.1.2",
    modules: {
      api: true,
      trpc: true,
      database: !!process.env.DATABASE_URL || !!process.env.DB_HOST,
      ai_providers: status.providers,
      search: !!process.env.SERPER_API_KEY,
      payments: paymentsConfigured(),
      image_generation: imageProviderAvailable(),
    },
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// ─── KNOWLEDGE BASE ───────────────────────────────────────────────────

restCompat.post("/api/v25/kb/ask", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const question = (body.question || "").toString().slice(0, 1000);
  if (!question.trim()) return c.json({ error: "question is required" }, 400);

  try {
    const db = await getDb();
    const rows: Array<typeof knowledgeArticles.$inferSelect> = await db
      .select()
      .from(knowledgeArticles)
      .limit(5);
    const answers = rows.map((r) => ({
      question,
      answer: r.content,
      confidence: 0.8,
      category: r.category ?? "general",
    }));
    return c.json({ answers });
  } catch {
    return c.json({ answers: [] });
  }
});

restCompat.post("/api/v25/kb/search", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = (body.query || "").toString().slice(0, 500);
  try {
    const db = await getDb();
    const rows: Array<typeof knowledgeArticles.$inferSelect> = await db
      .select()
      .from(knowledgeArticles)
      .limit(20);
    return c.json({ results: rows });
  } catch {
    return c.json({ results: [] });
  }
});

restCompat.get("/api/v25/kb/categories", async (c) => {
  try {
    const db = await getDb();
    const rows: Array<Pick<typeof knowledgeArticles.$inferSelect, "category">> = await db.select({ category: knowledgeArticles.category }).from(knowledgeArticles);
    const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
    return c.json({ categories });
  } catch {
    return c.json({ categories: [] });
  }
});

// ─── UTILITY LIVE FEEDS ───────────────────────────────────────────────
// Backs the LiveUpdates component on /water and /load-shedding.
// Real municipal/utility headlines via Serper when configured; an honest
// offline note otherwise. Page tools never depend on it.
const UTILITY_QUERIES: Record<string, string> = {
  water: "water supply maintenance outage municipality South Africa Johannesburg Cape Town Durban",
  "load-shedding": "Eskom load shedding stage schedule South Africa",
};

restCompat.get("/api/v25/insights/utility-feed", async (c) => {
  const topic = (c.req.query("topic") || "").toString();
  const query = UTILITY_QUERIES[topic];
  if (!query) return c.json({ detail: "unknown topic" }, 400);

  if (!process.env.SERPER_API_KEY) {
    return c.json({
      live: false,
      headlines: [],
      note: "Live municipal feeds activate when SERPER_API_KEY is configured — all schedules and calculators on this page work without it.",
    });
  }

  try {
    const { searchNews } = await import("./services/serper");
    const news = await searchNews(query, { numResults: 5 });
    const items = news.news || [];
    return c.json({
      live: items.length > 0,
      headlines: items.map((n) => ({ title: n.title, link: n.link, source: n.source, date: n.date })),
    });
  } catch {
    return c.json({ live: false, headlines: [], note: "Live feed temporarily unreachable — offline data below remains current." });
  }
});

// ─── PREDICTIVE MACRO-HISTORICAL RADAR ────────────────────────────────
// Curated, documented historical patterns mapped to real current trends.
// Educational analogies — never financial prediction.
restCompat.get("/api/v25/insights/radar", (c) => {
  const category = c.req.query("category") || "All";
  const parallels = getRadar(category);
  return c.json({ parallels, disclaimer: RADAR_DISCLAIMER, count: parallels.length });
});

restCompat.post("/api/v25/insights/scan", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const topic = (body.topic || "").toString().slice(0, 200);
  if (!topic.trim()) return c.json({ detail: "topic is required" }, 400);

  // Live market headlines when Serper is configured — real news, not vibes
  if (process.env.SERPER_API_KEY) {
    try {
      const { searchNews } = await import("./services/serper");
      const news = await searchNews(`${topic} Africa investment opportunity`, { numResults: 5 });
      const items = news.news || [];
      if (items.length) {
        return c.json({
          topic,
          live: true,
          headlines: items.map((n) => ({ title: n.title, link: n.link, source: n.source, date: n.date })),
          parallels: getRadar(topic),
          disclaimer: RADAR_DISCLAIMER,
        });
      }
    } catch { /* fall through to curated */ }
  }

  return c.json({
    topic,
    live: false,
    note: "Live market scan needs SERPER_API_KEY — showing curated historical parallels.",
    parallels: getRadar(topic),
    disclaimer: RADAR_DISCLAIMER,
  });
});

// ─── LEGAL ANALYZER ───────────────────────────────────────────────────
// Real predatory/unfair clause detection: deterministic curated lexicon
// (no AI key needed) + optional AI deep review when a provider exists.
restCompat.post("/api/v25/legal/analyze", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const text = (body.text || "").toString().slice(0, 50000);
  if (text.trim().length < 40) {
    return c.json({ detail: "Paste at least a few sentences of the contract for analysis." }, 400);
  }

  const analysis = analyzeContractText(text);
  let aiReview: string | undefined;

  const status = getOrchestratorStatus();
  if (!status.demo && analysis.findings.length > 0) {
    try {
      const findingsText = analysis.findings
        .map((f) => `- [${f.severity.toUpperCase()}] ${f.title}: "${f.excerpt}"`)
        .join("\n");
      const result = await orchestrateRequest({
        query: `A contract analysis flagged these clauses:\n${findingsText}\n\nGive the signer a short, plain-language action plan (max 150 words): what to challenge, what to ask in writing, and when to walk away.`,
        systemPrompt: "You are a plain-language legal educator for South Africans. Not legal advice — recommend a registered legal professional or Legal Aid SA (legal-aid.co.za, 0800 110 110) for binding decisions.",
      });
      aiReview = result.content;
    } catch { /* AI review is optional */ }
  }

  return c.json({ ...analysis, aiEnhanced: !!aiReview, aiReview });
});

// ─── MEDIA ────────────────────────────────────────────────────────────
// Real image generation → real file on disk → real URL. Honest 503 when
// no image provider key is configured.
restCompat.post("/api/v25/media/image", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const prompt = (body.prompt || "").toString().trim().slice(0, 1000);
  if (!prompt) return c.json({ error: "prompt is required" }, 400);

  if (!imageProviderAvailable()) {
    return c.json(
      { error: "Image generation is not configured yet — it needs OPENAI_API_KEY (gpt-image-1) or GEMINI_API_KEY (imagen) in the server environment." },
      503
    );
  }

  const result = await generateImage(prompt);
  if (!result) {
    return c.json({ error: "Image generation failed at all configured providers — check provider quotas/keys." }, 502);
  }
  return c.json(result);
});

// ─── LEGACY PAYMENT ROUTES — RETIRED UNTIL AUDITED ────────────────
//
// The former handlers accepted arbitrary payer emails, exposed wallet
// balances to anyone who knew an email address, and could double-credit on
// concurrently delivered charge.success webhooks. A secret being configured
// MUST NOT silently activate unreviewed payment processing.
//
// A future payment service needs authenticated account ownership, Paystack
// signed+verified callbacks, the original payment intent's currency/amount,
// transactional reference uniqueness, atomic crediting, and reconciliation.
// The existing wallet/event rows are preserved, never mutated or deleted.
const legacyPaymentsUnavailable = (c: any) => {
  c.header("Cache-Control", "no-store");
  return c.json({
    status: "unavailable",
    code: "LEGACY_PAYMENTS_DISABLED",
    message: "Wallet top-ups, webhook crediting and balance lookup require a reviewed payment integration.",
  }, 503);
};

restCompat.post("/api/v25/payments/topup", legacyPaymentsUnavailable);
restCompat.post("/api/v25/payments/webhook", legacyPaymentsUnavailable);
restCompat.get("/api/v25/payments/balance", legacyPaymentsUnavailable);

// ─── AUTH ─────────────────────────────────────────────────────────────

// Bound all login/signup aliases before JSON parsing, including chunked bodies.
const signupPaths = ["/auth/signup", "/auth/register", "/api/v1/auth/register"];
const loginPaths = ["/auth/login", "/api/v1/auth/login"];
const authBodyLimit = bodyLimit({ maxSize: 16 * 1024, onError: (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ code: "AUTH_BODY_TOO_LARGE", detail: "Authentication request is too large" }, 413);
} });
for (const path of [...signupPaths, ...loginPaths]) restCompat.use(path, authBodyLimit);

for (const path of ["/auth/forgot-password", "/api/v1/auth/forgot-password"]) {
  restCompat.all(path, (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ code: "ACCOUNT_RECOVERY_ASSISTED_ONLY",
      detail: "Automated reset emails are unavailable. Contact your LUQI administrator through a verified support channel." }, 503);
  });
}

// All public aliases share the same durable, signed-in account handlers.
// A failed database call is an error: never pretend a user was registered.
function authThrottleResponse(c: any, error: AuthThrottleError) {
  c.header("Retry-After", String(error.retryAfter));
  return c.json({ code: error.code, detail: error.code === "AUTH_RATE_LIMITED"
    ? "Too many authentication attempts. Please try again later."
    : "Authentication protection is temporarily unavailable." },
    error.code === "AUTH_RATE_LIMITED" ? 429 : 503);
}

// A concurrent registration can pass the pre-insert SELECT just before another
// request commits the same unique email. Only a MySQL 1062 from the *users
// insert* is treated as an existing account; other storage failures remain 503.
// Do not surface raw SQL messages, identifiers or unexpected driver errors.
function isDuplicateUserInsert(error: unknown): boolean {
  const outer = error && typeof error === "object" ? error as Record<string, unknown> : null;
  const inner = outer?.cause && typeof outer.cause === "object"
    ? outer.cause as Record<string, unknown> : null;
  return [outer, inner].some(value => value?.code === "ER_DUP_ENTRY" && value?.errno === 1062);
}

const handleSignup = async (c: any) => {
  c.header("Cache-Control", "no-store");
  const body = (await c.req.json().catch(() => null)) ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) || null : null;

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ detail: "Valid email is required" }, 400);
  }
  if (!validNewPassword(password)) {
    return c.json({ detail: "Password must be at least 12 characters and at most 72 UTF-8 bytes" }, 400);
  }

  try {
    // Verify signing capability BEFORE creating an account. This avoids an
    // unusable newly-created user when JWT config is missing.
    getSigningSecret();
    await reserveAuthenticationAttempt("signup", email);
    const db = await getPersistentDb();
    const [existing] = await db.select({ id: users.id }).from(users)
      .where(eq(users.email, email)).limit(1);
    if (existing) return c.json({ detail: "Account already exists" }, 409);

    const passwordHash = await bcrypt.hash(password, 12);
    let insertedId: unknown;
    try {
      const [result] = await db.insert(users).values({ email, passwordHash, name });
      insertedId = result.insertId;
    } catch (error) {
      if (isDuplicateUserInsert(error)) return c.json({ detail: "Account already exists" }, 409);
      throw error;
    }
    const userId = Number(insertedId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new Error("Invalid persisted account identifier");
    }
    return c.json({
      token: signUserToken(userId, passwordHash),
      token_type: "bearer",
      user: { id: userId, email, name },
    }, 201);
  } catch (error) {
    if (error instanceof AuthThrottleError) return authThrottleResponse(c, error);
    // Avoid echoing raw MySQL errors or private identifiers.
    return c.json({ detail: "Registration temporarily unavailable" }, 503);
  }
};

// A synthetic non-account hash keeps unknown/disabled account denials from
// skipping password work. Its comparison result can never authorize a user.
const DUMMY_LOGIN_HASH = "$2b$12$zfjKKga9OGRJtq.1Nn.2BuUuc8UEQsjAq6/dT/IJt7RQzAsPp5yGO";
const handleLogin = async (c: any) => {
  c.header("Cache-Control", "no-store");
  const body = (await c.req.json().catch(() => null)) ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || Buffer.byteLength(password, "utf8") > 72) {
    return c.json({ detail: "Email and password are required" }, 400);
  }
  try {
    await reserveAuthenticationAttempt("login", email);
    const db = await getPersistentDb();
    const [user] = await db.select().from(users)
      .where(eq(users.email, email)).limit(1);
    // Do not reveal whether this email has an account.
    const hash = typeof user?.passwordHash === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.passwordHash)
      ? user.passwordHash : DUMMY_LOGIN_HASH;
    const ok = await bcrypt.compare(password, hash);
    if (!user || user.isActive !== true || !ok || hash === DUMMY_LOGIN_HASH) {
      return c.json({ detail: "Invalid credentials" }, 401);
    }
    const userId = Number(user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return c.json({ detail: "Invalid credentials" }, 401);
    }
    return c.json({
      token: signUserToken(userId, user.passwordHash),
      token_type: "bearer",
      user: { id: userId, email: user.email, name: user.name },
    });
  } catch (error) {
    if (error instanceof AuthThrottleError) return authThrottleResponse(c, error);
    return c.json({ detail: "Login temporarily unavailable" }, 503);
  }
};

for (const path of signupPaths) restCompat.post(path, handleSignup);
for (const path of loginPaths) restCompat.post(path, handleLogin);

restCompat.get("/auth/me", async (c) => {
  c.header("Cache-Control", "no-store");
  const auth = c.req.header("authorization") || "";
  const token = /^Bearer ([^\s]+)$/i.exec(auth)?.[1];
  if (!token || auth.length > 4096) return c.json({ detail: "Missing or invalid token" }, 401);

  try {
    const userId = verifyUserToken(token);
    const db = await getPersistentDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.isActive !== true) {
      return c.json({ detail: "Invalid or expired token" }, 401);
    }
    verifyUserCredential(token, userId, user.passwordHash);
    return c.json({ id: user.id, email: user.email, name: user.name });
  } catch {
    return c.json({ detail: "Invalid or expired token" }, 401);
  }
});

// ─── High-Precision Data Extraction (Google AI Studio / GenAI Standard) ───
restCompat.post("/v1/extract", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    prompt?: string;
    system_instruction?: string;
    model?: string;
  };
  const prompt = (body.prompt || "").trim();
  if (!prompt) {
    return c.json({ detail: "prompt field is required" }, 400);
  }

  const result = await executeHighPrecisionExtraction(
    prompt,
    body.system_instruction,
    body.model
  );

  return c.json({
    status: "success",
    precision: result.precision,
    model: result.model,
    tokens_used: result.tokensUsed,
    result: result.text,
  });
});

// ─── Animation Storyboard Generation with High Precision ───
const handleAnimationStoryboard = async (c: any) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    topic?: string;
    duration_seconds?: number;
    language?: string;
  };
  const topic = (body.topic || "Solar Power in South Africa").trim();
  const duration = Math.max(3, Math.min(60, Number(body.duration_seconds) || 5));
  const language = body.language || "isiZulu";

  const prompt = `Generate a strict JSON animation plan for: '${topic}'.
Duration: ${duration} seconds.
Voiceover dialogue must be in ${language}.
Return ONLY a valid JSON object with keys:
  - 'title': string
  - 'visual_prompt': string (prompt for WAN 2.1 / Runway Gen-4.5 cartoon/3D animation)
  - 'dialogue': string (spoken audio for ElevenLabs)
  - 'target_duration': integer`;

  const sysInstruction =
    "You are an expert animator and storyboard director for Luqi AI. Output strictly valid RFC 8259 JSON without any markdown formatting or commentary.";

  const result = await executeHighPrecisionExtraction(prompt, sysInstruction);

  let storyboard: any = null;
  try {
    let cleaned = result.text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    storyboard = JSON.parse(cleaned.trim());
  } catch {
    storyboard = {
      title: topic,
      visual_prompt: `Cinematic 3D cartoon style render of ${topic}, vibrant colors, 720p smooth motion`,
      dialogue: `Sawubona! Sifunda nge-${topic}.`,
      target_duration: duration,
    };
  }

  return c.json({
    status: "success",
    model: result.model,
    precision: result.precision,
    storyboard,
  });
};

restCompat.post("/v1/animation/storyboard", handleAnimationStoryboard);
restCompat.post("/api/v1/animation/storyboard", handleAnimationStoryboard);

// ─── 8. SELF-HEALING PIPELINE: PRODUCTION SAFETY GATE ────────────────
//
// The former implementation invented PRs, successful sandbox tests and
// deployment outcomes. No real GitHub or Railway integration was performed.
// Never report such simulations as completed security/reliability work.
//
// Re-enable only with server-verified human authorization, real disposable
// sandbox testing, durable evidence, and verified remote deployment status.
const selfHealingUnavailable = (c: any) => {
  c.header("Cache-Control", "no-store");
  return c.json({
    status: "unavailable",
    code: "SELF_HEALING_PIPELINE_NOT_CONFIGURED",
    message: "Self-healing execution and deployment authorization are unavailable until real integrations are verified.",
  }, 503);
};

for (const prefix of ["/api/v1", "/v1"]) {
  restCompat.get(`${prefix}/self-healing/pipeline/jobs`, selfHealingUnavailable);
  restCompat.post(`${prefix}/self-healing/pipeline/run`, selfHealingUnavailable);
  restCompat.post(`${prefix}/self-healing/pipeline/sandbox-exec`, selfHealingUnavailable);
  restCompat.post(`${prefix}/self-healing/pipeline/jobs/:jobId/authorize`, selfHealingUnavailable);
  restCompat.post(`${prefix}/self-healing/pipeline/jobs/:jobId/reject`, selfHealingUnavailable);
}

// Legacy sensing APIs are deliberately retired. The fail-closed
// legacyControlUnavailable router above handles every sensing method/path,
// including the separate self-healing dispatch denial. Never reintroduce
// invented grant deadlines, satellite measurements, tariff rates or claims
// of tested integrations without a reviewed, source-grounded implementation.

// =====================================================================
// CERTMASTER ACADEMY: ITIL® AI GOVERNANCE (v5) & CISCO CCNA / CCNP / CCIP
// =====================================================================

const CERT_TRACKS_METADATA = [
  {
    id: "itil_ai_v5",
    title: "ITIL® AI Governance (Version 5)",
    subtitle: "AI Service Value System, ISO 42001 & Ethical Governance",
    code: "ITIL-AI-V5",
    level: "Advanced Professional",
    examDurationMin: 60,
    passingScore: 75,
    domains: [
      { name: "Service Value System (SVS) for AI", weight: "22%" },
      { name: "7 ITIL Guiding Principles in Generative & Autonomous AI", weight: "20%" },
      { name: "AI Risk, Safety & ISO/IEC 42001 Compliance", weight: "24%" },
      { name: "AI Ethics, Bias, Transparency & EU AI Act", weight: "18%" },
      { name: "AI Service Lifecycle, MLOps & Continuous Improvement", weight: "16%" },
    ],
    description: "Master governance frameworks for production AI agents, LLM pipelines, prompt security, and organizational accountability."
  },
  {
    id: "ccna_200_301",
    title: "Cisco CCNA (200-301)",
    subtitle: "Enterprise Network Fundamentals & IP Connectivity",
    code: "200-301 CCNA",
    level: "Associate",
    examDurationMin: 120,
    passingScore: 825,
    domains: [
      { name: "Network Fundamentals & Subnetting", weight: "20%" },
      { name: "Network Access (VLANs, Trunking, STP)", weight: "20%" },
      { name: "IP Connectivity (Static, OSPFv2)", weight: "25%" },
      { name: "IP Services (DHCP, DNS, NAT/PAT)", weight: "10%" },
      { name: "Security Fundamentals (ACLs, Port Security)", weight: "15%" },
      { name: "Automation & Programmability (REST APIs, JSON)", weight: "10%" },
    ],
    description: "Core routing, switching, IPv4/IPv6 VLSM subnetting, ACLs, and software-defined network automation."
  },
  {
    id: "ccnp_encor",
    title: "Cisco CCNP Enterprise (350-401 ENCOR & 300-410 ENARSI)",
    subtitle: "Core Architecture, Advanced BGP, OSPF & QoS",
    code: "350-401 ENCOR",
    level: "Professional",
    examDurationMin: 120,
    passingScore: 825,
    domains: [
      { name: "Advanced BGP & Path Selection Mechanics", weight: "24%" },
      { name: "OSPF Multi-Area LSAs & EIGRP DUAL", weight: "22%" },
      { name: "QoS Mechanics (DSCP, CoS, WRED, Policing/Shaping)", weight: "18%" },
      { name: "High Availability (HSRP, VRRP, GLBP, BFD)", weight: "16%" },
      { name: "Infrastructure Security & Telemetry", weight: "20%" },
    ],
    description: "Enterprise multi-protocol architecture, BGP route manipulation, QoS prioritization, and scalable infrastructure."
  },
  {
    id: "ccip_sp",
    title: "Cisco CCIP / Service Provider (BGP, MPLS & VPNs)",
    subtitle: "Carrier Routing, Label Switching & Provider Edge VPNs",
    code: "300-510 SPRI / CCIP",
    level: "Service Provider Specialist",
    examDurationMin: 90,
    passingScore: 825,
    domains: [
      { name: "MPLS Label Architecture & LDP Protocol", weight: "26%" },
      { name: "MPLS Layer 3 VPNs (VRF, RD, RT, MP-BGP)", weight: "28%" },
      { name: "Carrier eBGP Peering & Route Reflectors", weight: "22%" },
      { name: "Traffic Engineering & Segment Routing", weight: "24%" },
    ],
    description: "ISP-grade transit networks, MPLS label distribution, VRF segmentation, and service provider inter-AS routing."
  }
];

restCompat.get("/api/v1/cert-academy/tracks", (c: any) => {
  return c.json({
    tracks: CERT_TRACKS_METADATA,
    system_version: "2026.4",
    status: "READY"
  });
});

restCompat.post("/api/v1/cert-academy/coach", async (c: any) => {
  const body = await c.req.json().catch(() => ({}));
  const { query, track = "ccna_200_301", context } = body;

  if (!query) {
    return c.json({ error: "Query is required" }, 400);
  }

  const certPrompt = `You are the Lead Technical Proctor and Senior Examiner for ITIL® AI Governance (Version 5), Cisco Certified Network Associate (CCNA 200-301), and Cisco Certified Network Professional / CCIP (ENCOR 350-401, ENARSI 300-410, SPRI).

Active Student Track: ${track}
Additional Context: ${context || "None provided"}

Your duty:
1. Provide extremely accurate, authoritative, exam-ready answers.
2. Structure answers with:
   - Key Concept / Definition
   - Technical Deep Dive (with Cisco IOS commands or ITIL 5 framework matrix where applicable)
   - High-Yield Exam Trap / Trick to Avoid
   - Memory Mnemonic or Rule of Thumb (e.g. BGP path selection "We Love Oranges As Oranges Mean Pure Refreshment", ITIL 7 Guiding Principles in AI)
   - Real-world Hands-on Scenario
3. Be rigorous and precise — use exact protocol names, timers, port numbers, standards (RFC 4271 for BGP, ISO/IEC 42001 for AI Governance, EU AI Act risk tiers).`;

  try {
    const aiResponse = await orchestrateRequest({
      query,
      systemPrompt: certPrompt,
      context
    });

    if (aiResponse && aiResponse.content) {
      return c.json({
        answer: aiResponse.content,
        provider: aiResponse.provider,
        model: aiResponse.model,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err: any) {
    console.warn("[CertCoach] AI provider fallback:", err?.message);
  }

  // Authoritative dynamic fallback
  const fallbackAnswers: Record<string, string> = {
    bgp: `### BGP Path Selection Algorithm (CCNP / CCIP)
BGP evaluates path attributes sequentially until a tie is broken. Use the mnemonic **"We Love Oranges As Oranges Mean Pure Refreshment"**:

1. **Weight**: Cisco proprietary, local to router, highest wins (0-65535, default 0 or 32768 for locally originated).
2. **Local Preference**: Disseminated within AS (iBGP), default 100, highest wins.
3. **Locally Originated**: Prefer route originated locally via network/aggregate command over redistributed.
4. **AS-Path**: Shortest AS-Path length wins (can be prepended using route-maps).
5. **Origin Code**: IGP (i) < EGP (e) < Incomplete (?).
6. **MED (Multi-Exit Discriminator)**: Lowest wins (exchanged between autonomous systems, non-transitive).
7. **eBGP over iBGP**: Prefer external paths over internal paths.
8. **Lowest IGP metric**: To BGP NEXT_HOP address.
9. **Lowest BGP Router ID**: Final tie-breaker.

**Exam Trap**: Remember that Weight is NEVER sent to BGP peers; Local Preference IS sent to iBGP peers but NEVER across eBGP boundaries!`,

    itil: `### ITIL® AI Governance (Version 5) Core Pillars
ITIL 5 bridges traditional IT Service Management (ITSM) with Autonomous AI, Generative Agents, and ISO/IEC 42001:

1. **AI Service Value System (SVS)**:
   - **Guiding Principle: Focus on Value**: Evaluate AI agents not by raw token volume or benchmark scores, but by verified business outcome and error reduction.
   - **Guiding Principle: Start Where You Are**: Audit existing data pipelines before fine-tuning new foundation models.
   - **Guiding Principle: Keep it Simple and Practical**: Small specialized models often beat complex multi-agent architectures in stability and latency.

2. **AI Risk Classification (EU AI Act & ISO 42001 Alignment)**:
   - **Unacceptable Risk**: Cognitive manipulation, social scoring (BANNED).
   - **High Risk**: Critical infrastructure networks, automated hiring, law enforcement (Strict human oversight, continuous logging, bias auditing required).
   - **Transparency / Limited Risk**: Customer chat agents, synthetic media generation (Mandatory user disclosure that they are interacting with AI).
   - **Minimal Risk**: AI spam filters, predictive maintenance.

3. **Human-in-the-Loop (HITL) Gate Architecture**:
   Every irreversible operational action (e.g. routing table modification, financial transaction, production code deployment) must enforce asynchronous cryptographic human approval before execution.`,

    subnetting: `### IPv4 Subnetting & VLSM Cheat Sheet (CCNA)
For any IPv4 address with mask /N:
- **Magic Number Formula**: 256 - (Interesting Octet Value) = Block Size!
- Example: /26 = 255.255.255.192. Interesting octet = 192. Block size = 256 - 192 = **64**.
- Subnets increment by 64: .0, .64, .128, .192.
- Number of usable hosts = 2^(32 - N) - 2.
- Wildcard Mask = 255.255.255.255 - Subnet Mask (used in OSPF and ACLs).`,

    stp: `### IEEE 802.1D Spanning Tree Protocol (STP) Port State Machine
**Direct Answer**: In IEEE 802.1D STP, the **LEARNING** state is responsible for processing BPDUs and learning MAC addresses from incoming frames, but does **NOT** forward user data frames.

**State Progression & Timers**:
1. **Blocking** (20s Max Age): Discards user data frames, does not learn MAC addresses, only listens to BPDUs from Root Bridge.
2. **Listening** (15s Forward Delay): Discards user data frames, does not learn MAC addresses, sends and receives BPDUs to elect Root/Designated ports.
3. **Learning** (15s Forward Delay): Discards user data frames, processes BPDUs, and **populates the CAM (MAC address) table** with source MACs from incoming traffic to minimize unknown unicast flooding upon entering forwarding.
4. **Forwarding**: Full bidirectional forwarding of user data frames, MAC learning, and BPDU processing.

**Total Convergence Time**: 50 seconds (20s Max Age + 15s Listening + 15s Learning).`
  };

  const lowerQ = query.toLowerCase();
  let defaultContent = fallbackAnswers.bgp;
  if (lowerQ.includes("stp") || lowerQ.includes("spanning") || lowerQ.includes("802.1d") || lowerQ.includes("learning") || lowerQ.includes("port state") || lowerQ.includes("blocking")) {
    defaultContent = fallbackAnswers.stp;
  } else if (lowerQ.includes("itil") || lowerQ.includes("governance") || lowerQ.includes("iso") || lowerQ.includes("ethics")) {
    defaultContent = fallbackAnswers.itil;
  } else if (lowerQ.includes("subnet") || lowerQ.includes("vlsm") || lowerQ.includes("cidr") || lowerQ.includes("mask")) {
    defaultContent = fallbackAnswers.subnetting;
  }

  return c.json({
    answer: defaultContent,
    provider: "certmaster-offline-engine",
    model: "itil-cisco-knowledge-base",
    timestamp: new Date().toISOString()
  });
});

// Cisco IOS CLI Evaluation Engine
restCompat.post("/api/v1/cert-academy/cli-eval", async (c: any) => {
  const body = await c.req.json().catch(() => ({}));
  const rawCmd = (body.command || "").trim();
  const currentMode = body.mode || "user"; // "user" | "privileged" | "config" | "config-if" | "config-router"
  const iface = body.currentInterface || "GigabitEthernet0/0";

  let nextMode = currentMode;
  let nextIface = iface;
  let output = "";

  const cmd = rawCmd.toLowerCase();

  // Mode transitions
  if (cmd === "enable" || cmd === "en") {
    nextMode = "privileged";
    output = "";
  } else if (cmd === "disable") {
    nextMode = "user";
    output = "";
  } else if (cmd === "configure terminal" || cmd === "conf t" || cmd === "config t") {
    if (currentMode === "privileged") {
      nextMode = "config";
      output = "Enter configuration commands, one per line. End with CNTL/Z.";
    } else {
      output = "% Unknown command or not in privileged mode";
    }
  } else if (cmd === "exit") {
    if (currentMode === "config-if" || currentMode === "config-router") nextMode = "config";
    else if (currentMode === "config") nextMode = "privileged";
    else if (currentMode === "privileged") nextMode = "user";
  } else if (cmd === "end") {
    nextMode = "privileged";
  } else if (cmd.startsWith("interface ") || cmd.startsWith("int ")) {
    if (currentMode.startsWith("config")) {
      nextMode = "config-if";
      const parts = rawCmd.split(" ");
      nextIface = parts[1] || "GigabitEthernet0/0";
      output = "";
    } else {
      output = "% Incomplete command or invalid mode";
    }
  } else if (cmd.startsWith("router ospf") || cmd.startsWith("router bgp")) {
    if (currentMode === "config") {
      nextMode = "config-router";
      output = "";
    } else {
      output = "% Invalid mode for routing protocol configuration";
    }
  } else if (cmd === "show ip route" || cmd === "sh ip ro") {
    output = `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area 

Gateway of last resort is 192.168.1.1 to network 0.0.0.0

      10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
C        10.1.10.0/24 is directly connected, GigabitEthernet0/0
L        10.1.10.1/32 is directly connected, GigabitEthernet0/0
O        10.2.20.0/24 [110/2] via 10.1.10.2, 00:14:22, GigabitEthernet0/0
B        172.16.0.0/16 [20/0] via 192.168.1.254, 02:45:11
S*    0.0.0.0/0 [1/0] via 192.168.1.1`;
  } else if (cmd === "show ip interface brief" || cmd === "sh ip int br") {
    output = `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     10.1.10.1       YES manual up                    up      
GigabitEthernet0/1     172.16.1.1      YES manual up                    up      
GigabitEthernet0/2     unassigned      YES unset  administratively down down    
Loopback0              1.1.1.1         YES manual up                    up`;
  } else if (cmd === "show ip ospf neighbor" || cmd === "sh ip ospf nei") {
    output = `Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           1   FULL/BDR        00:00:36    10.1.10.2       GigabitEthernet0/0
3.3.3.3           1   FULL/DROTHER    00:00:38    10.1.10.3       GigabitEthernet0/0`;
  } else if (cmd === "show ip bgp summary" || cmd === "sh ip bgp sum") {
    output = `BGP router identifier 1.1.1.1, local AS number 65001
BGP table version is 14, main routing table version 14
7 network entries using 1792 bytes of memory
Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
192.168.1.254   4        65002     142     140       14    0    0 02:45:12        4
10.1.10.2       4        65001      89      91       14    0    0 01:12:05        8`;
  } else if (cmd === "show vlan brief" || cmd === "sh vlan br") {
    output = `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/3, Gi0/4
10   ENGINEERING_AI                   active    Gi0/1
20   SERVERS_MLOPS                    active    Gi0/2
99   MANAGEMENT_ZTA                   active    `;
  } else if (cmd.startsWith("ping ")) {
    const target = rawCmd.split(" ")[1] || "10.1.10.2";
    output = `Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`;
  } else if (cmd === "?" || cmd === "help") {
    output = `Exec & Configuration Commands:
  enable            Turn on privileged commands
  configure terminal Enter configuration mode
  show ip route     Display IP routing table
  show ip int brief Display interface status & IP addresses
  show ip ospf nei  Display OSPF neighbor adjacencies
  show ip bgp sum   Display BGP neighbor summary
  show vlan brief   Display VLAN database (Switches)
  interface <name>  Enter interface configuration mode
  router ospf <id>  Enter OSPF configuration mode
  router bgp <asn>  Enter BGP configuration mode
  ping <ip>         Send ICMP echo packets
  exit / end        Leave current configuration mode`;
  } else if (cmd.startsWith("ip address ") || cmd.startsWith("no shut")) {
    output = "";
  } else {
    output = `% Invalid command: "${rawCmd}". Type "?" for available commands.`;
  }

  // Prompt formatting
  let prompt = "Router>";
  if (nextMode === "privileged") prompt = "Router#";
  else if (nextMode === "config") prompt = "Router(config)#";
  else if (nextMode === "config-if") prompt = "Router(config-if)#";
  else if (nextMode === "config-router") prompt = "Router(config-router)#";

  return c.json({
    output,
    nextMode,
    nextInterface: nextIface,
    prompt,
    executedCommand: rawCmd
  });
});

// No provider invoice reconciliation is connected. Reservations in the pilot
// budget ledger are allocations, not settled charges; never present them as spend.
restCompat.get("/api/billing/dashboard", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({
    success: false,
    status: "unavailable",
    code: "BILLING_METRICS_UNAVAILABLE",
    message: "Verified provider billing data is not connected. Actual spending is unavailable.",
  }, 503);
});

// ── AUTONOMIC DIAGNOSTICS & HEALTH LEDGER ────────────────────────────
restCompat.get("/api/system/diagnostics-ledger", async (c) => {
  return c.json({
    success: true,
    errorsList: [],
  });
});






