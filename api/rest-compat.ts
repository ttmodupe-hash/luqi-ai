// =====================================================================
// REST COMPATIBILITY LAYER
// The frontend was built against a legacy REST API (/api/v25/*, /auth/*).
// These routes adapt those calls onto the real tRPC services so the UI
// works against THIS server. No canned answers anywhere: when no AI
// provider is configured, endpoints say so honestly.
// =====================================================================

import { Hono } from "hono";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { users, knowledgeArticles } from "../db/schema";
import { orchestrateRequest, getOrchestratorStatus } from "./services/orchestrator";

export const restCompat = new Hono();

const LUQI_SYSTEM_PROMPT = `You are LUQI AI, an intelligent assistant for South Africa and the broader African continent.

GROUNDING RULES:
1. Answer based on verified knowledge. If you are not certain of a fact, figure, date, or amount, say so explicitly — never invent statistics, tax brackets, grant amounts, or legal requirements.
2. For tax, legal, medical, or financial questions: give practical guidance, cite the official channel (e.g. SARS eFiling, sars.gov.za, gov.za), and note that rules change and the user should confirm with the official source or a registered practitioner.
3. Be concrete and structured: numbered steps for processes, requirements lists, costs and timelines where known.
4. Keep answers focused on what the user asked. South African context by default (SARS, CIPC, Eskom, NSFAS, SASSA, eTenderPortal).
5. This is not professional advice — for filings and legal acts, recommend the official portal or a registered professional.`;

function aiUnavailableResponse() {
  return {
    response:
      "My AI brain is not connected yet — the server administrator still needs to add an AI provider key (e.g. KIMI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY) in the hosting environment. Once a key is added, I will answer questions like this properly. I won't guess answers I can't verify.",
    module: "unavailable",
    response_time_ms: 0,
  };
}

function jwtSecret(): string {
  return process.env.JWT_SECRET || process.env.APP_SECRET || "luqi-dev-secret-change-me";
}

function signToken(userId: number): string {
  return jwt.sign({ userId }, jwtSecret(), { expiresIn: "30d" });
}

// ─── AI BRAIN / CHAT ──────────────────────────────────────────────────

async function handleChat(message: string, sessionId?: string) {
  const status = getOrchestratorStatus();
  if (status.demo) {
    return aiUnavailableResponse();
  }

  const start = Date.now();
  try {
    const result = await orchestrateRequest({
      query: message,
      systemPrompt: LUQI_SYSTEM_PROMPT,
      useSearch: false,
    });
    return {
      response: result.content,
      module: result.provider + "/" + result.model,
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
  return c.json(await handleChat(message, body.session_id));
});

// Legacy chat endpoint used by useApi.chat
restCompat.post("/api/v25/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = (body.query || body.message || "").toString().slice(0, 4000);
  if (!message.trim()) {
    return c.json({ error: "query is required" }, 400);
  }
  return c.json(await handleChat(message, body.session_id));
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
    const rows = await db
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
    const rows = await db
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
    const rows = await db.select({ category: knowledgeArticles.category }).from(knowledgeArticles);
    const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
    return c.json({ categories });
  } catch {
    return c.json({ categories: [] });
  }
});

// ─── AUTH ─────────────────────────────────────────────────────────────

restCompat.post("/auth/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = (body.email || "").toString().trim().toLowerCase();
  const password = (body.password || "").toString();
  const name = (body.name || "").toString().trim() || null;

  if (!email || !email.includes("@")) return c.json({ detail: "Valid email is required" }, 400);
  if (password.length < 6) return c.json({ detail: "Password must be at least 6 characters" }, 400);

  try {
    const db = await getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) return c.json({ detail: "An account with this email already exists" }, 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.insert(users).values({ email, passwordHash, name });
    const userId = Number(result.insertId);

    return c.json({
      token: signToken(userId),
      user: { id: userId, email, name },
    });
  } catch (e: any) {
    return c.json({ detail: "Signup unavailable — database not connected (" + (e?.code || "error") + ")" }, 503);
  }
});

restCompat.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = (body.email || "").toString().trim().toLowerCase();
  const password = (body.password || "").toString();

  if (!email || !password) return c.json({ detail: "Email and password are required" }, 400);

  try {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return c.json({ detail: "Invalid credentials" }, 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return c.json({ detail: "Invalid credentials" }, 401);

    return c.json({
      token: signToken(user.id),
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e: any) {
    return c.json({ detail: "Login unavailable — database not connected (" + (e?.code || "error") + ")" }, 503);
  }
});

restCompat.get("/auth/me", async (c) => {
  const auth = c.req.header("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return c.json({ detail: "Missing token" }, 401);

  try {
    const payload = jwt.verify(token, jwtSecret()) as { userId: number };
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) return c.json({ detail: "User not found" }, 404);
    return c.json({ id: user.id, email: user.email, name: user.name });
  } catch {
    return c.json({ detail: "Invalid or expired token" }, 401);
  }
});
