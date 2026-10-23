/** Real MySQL integration tests: CI-only, no third-party AI calls.
 * The GitHub Actions runner creates an ephemeral MySQL 8.4 database.
 * No production database secrets or provider credentials are loaded.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { signUserToken } from "../api/lib/userToken";
import { resetAccountPassword } from "../api/services/accountRecovery";
import { LUQI_JWT_AUDIENCE, LUQI_JWT_ISSUER } from "../api/lib/userToken";
import { privateConversations } from "../api/private-conversations";
import { restCompat } from "../api/rest-compat";
import { authenticatePilotUser } from "../api/services/pilotAuth";
import { bootstrapDatabase, CREATE_STATEMENTS } from "../db/bootstrap";
import {
  PilotBlocked, reservePilotAttempt, PILOT_CENTS,
  PILOT_USER_DAILY_MAX_ATTEMPTS, utcDay, utcMonth,
} from "../api/services/aiPilotBudget";

const TEST_PERIOD = new Date("2026-10-22T12:00:00Z");
const MONTH = utcMonth(TEST_PERIOD);
const DAY = utcDay(TEST_PERIOD);
let pool: Pool;

async function singleNumber(query: string, params: unknown[] = []): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);
  return Number(Object.values(rows[0] ?? {})[0]);
}

beforeAll(async () => {
  if (process.env.LUQI_MYSQL_CI_FIXTURE !== "true" ||
      !process.env.DATABASE_URL?.includes("127.0.0.1")) {
    throw new Error("Refusing to run destructive integration checks outside local CI MySQL");
  }
  process.env.JWT_SECRET = "ci-local-only-signed-account-test-secret-32-chars";
  await bootstrapDatabase();
  pool = mysql.createPool(process.env.DATABASE_URL);
}, 60_000);
afterAll(async () => {
  if (pool) await pool.end();
});

describe.sequential("real InnoDB persistence and $100 pilot gates", () => {
  it("creates all 37 tables without inserting a publicly known demo user", async () => {
    const [tables] = await pool.query<RowDataPacket[]>("SHOW TABLES");
    expect(tables.length).toBe(CREATE_STATEMENTS.length);
    expect(await singleNumber("SELECT COUNT(*) AS n FROM users")).toBe(0);
    // Migrations are idempotent against an already provisioned MySQL.
    await bootstrapDatabase();
    const [again] = await pool.query<RowDataPacket[]>("SHOW TABLES");
    expect(again.length).toBe(37);
  }, 70_000);

  it("registers real users, checks JWT login and blocks disabled users", async () => {
    const email = "ci-auth-fixture@example.invalid";
    const password = "Strong-Unique-CI-Password-2026!";
    const jsonRequest = (path: string, body: object) => restCompat.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const weak = await jsonRequest("/api/v1/auth/register", { email, password: "short" });
    expect(weak.status).toBe(400);
    expect(await singleNumber("SELECT COUNT(*) AS n FROM users")).toBe(0);

    const register = await jsonRequest("/api/v1/auth/register", { email, password, name: "CI User" });
    expect(register.status).toBe(201);
    const created = await register.json();
    expect(created.user.email).toBe(email);
    expect(typeof created.token).toBe("string");
    expect(created.token).not.toMatch(/^LUQI-JWT-/);
    expect(jwt.verify(created.token, process.env.JWT_SECRET!, { issuer: LUQI_JWT_ISSUER, audience: LUQI_JWT_AUDIENCE })).toMatchObject({ userId: created.user.id });
    expect(await singleNumber("SELECT COUNT(*) AS n FROM users")).toBe(1);
    const duplicate = await jsonRequest("/auth/signup", { email, password });
    expect(duplicate.status).toBe(409);

    const badLogin = await jsonRequest("/auth/login", { email, password: "wrong-password" });
    expect(badLogin.status).toBe(401);
    const login = await jsonRequest("/api/v1/auth/login", { email, password });
    expect(login.status).toBe(200);
    const signedIn = await login.json();
    expect(jwt.verify(signedIn.token, process.env.JWT_SECRET!, { issuer: LUQI_JWT_ISSUER, audience: LUQI_JWT_AUDIENCE })).toMatchObject({ userId: created.user.id });

    const account = await restCompat.request("/auth/me", {
      headers: { Authorization: `Bearer ${signedIn.token}` },
    });
    expect(account.status).toBe(200);
    expect((await account.json()).email).toBe(email);
    expect(await authenticatePilotUser(`Bearer ${signedIn.token}`)).toBe(created.user.id);

    // A nullable legacy flag must fail closed in login, account lookup and all
    // pilot/private-memory/Omega routes that share authenticatePilotUser.
    await pool.execute("UPDATE users SET is_active=NULL WHERE id=?", [created.user.id]);
    for (const path of ["/auth/login", "/api/v1/auth/login"]) {
      expect((await jsonRequest(path, { email, password })).status).toBe(401);
    }
    expect((await restCompat.request("/auth/me", {
      headers: { Authorization: `Bearer ${signedIn.token}` },
    })).status).toBe(401);
    await expect(authenticatePilotUser(`Bearer ${signedIn.token}`))
      .rejects.toMatchObject({ code: "AUTH_REQUIRED" });

    // Disabling account revokes its ability to log in or spend on AI.
    await pool.execute("UPDATE users SET is_active=0 WHERE id=?", [created.user.id]);
    // Re-running schema bootstrap must preserve credentials and account state.
    const [beforeBootstrap] = await pool.query<RowDataPacket[]>("SELECT * FROM users ORDER BY id");
    await bootstrapDatabase();
    const [afterBootstrap] = await pool.query<RowDataPacket[]>("SELECT * FROM users ORDER BY id");
    expect(afterBootstrap).toEqual(beforeBootstrap);
    const disabled = await jsonRequest("/auth/login", { email, password });
    expect(disabled.status).toBe(401);
    await expect(authenticatePilotUser(`Bearer ${signedIn.token}`))
      .rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  }, 70_000);

  it("recovers legacy passwords, revokes old tokens and preserves account data", async () => {
    const email = "ci-recovery@example.invalid";
    const oldPassword = "Legacy-Long-Password-".repeat(5);
    const oldHash = await bcrypt.hash(oldPassword, 12);
    const [insert] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (email,password_hash,name,is_active) VALUES (?,?,?,1)",
      [email, oldHash, "Recovery Fixture"]);
    const id = insert.insertId;
    const oldToken = signUserToken(id, oldHash);
    expect(await authenticatePilotUser(`Bearer ${oldToken}`)).toBe(id);
    await pool.execute("INSERT INTO sessions (user_id,token,expires_at) VALUES (?, ?, DATE_ADD(NOW(),INTERVAL 1 DAY)), (1, ?, DATE_ADD(NOW(),INTERVAL 1 DAY))",
      [id, "fixture-recovery-session", "fixture-other-account-session"]);
    const [before] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE id=?", [id]);
    const newPassword = "New-Unique-Recovered-Password!";
    await expect(resetAccountPassword(pool, id, "wrong@example.invalid", newPassword))
      .rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE" });
    const result = await resetAccountPassword(pool, id, email, newPassword);
    expect(result).toEqual({ userId: id, sessionsRevoked: 1 });
    const [after] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE id=?", [id]);
    const { password_hash: beforeHash, updated_at: _beforeTime, ...beforeData } = before[0];
    const { password_hash: afterHash, updated_at: _afterTime, ...afterData } = after[0];
    expect(afterData).toEqual(beforeData);
    expect(afterHash).not.toBe(beforeHash);
    expect(await bcrypt.compare(newPassword, afterHash)).toBe(true);
    expect(await singleNumber("SELECT COUNT(*) AS n FROM sessions WHERE user_id=?", [id])).toBe(0);
    expect(await singleNumber("SELECT COUNT(*) AS n FROM sessions WHERE user_id=1")).toBe(1);
    await expect(authenticatePilotUser(`Bearer ${oldToken}`)).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    expect((await restCompat.request("/auth/me", { headers: { Authorization: `Bearer ${oldToken}` } })).status).toBe(401);
    const login = await restCompat.request("/auth/login", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: newPassword }) });
    expect(login.status).toBe(200);
    expect(await authenticatePilotUser(`Bearer ${(await login.json()).token}`)).toBe(id);
    await expect(resetAccountPassword(pool, id, email, newPassword)).rejects.toMatchObject({ code: "PASSWORD_REUSED" });
    await pool.execute("UPDATE users SET is_active=0 WHERE id=?", [id]);
    await expect(resetAccountPassword(pool, id, email, "Another-Unique-Password!"))
      .rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE" });
  }, 70_000);

  it("rolls back the password update if stored-session revocation fails", async () => {
    const email = "ci-recovery-rollback@example.invalid";
    const hash = await bcrypt.hash("Original-Password-For-Rollback!", 12);
    const [insert] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)", [email, hash]);
    const id = insert.insertId;
    await pool.execute("INSERT INTO sessions (user_id,token,expires_at) VALUES (?, ?, DATE_ADD(NOW(),INTERVAL 1 DAY))",
      [id, "fixture-failed-revocation"]);
    // Disposable local CI only: force a failure after the password UPDATE.
    await pool.query("CREATE TRIGGER reject_session_delete BEFORE DELETE ON sessions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CI revocation failure'");
    try {
      await expect(resetAccountPassword(pool, id, email, "Different-Rollback-Password!"))
        .rejects.toMatchObject({ code: "RECOVERY_UNAVAILABLE" });
      const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id=?", [id]);
      expect(rows[0].password_hash).toBe(hash);
      expect(await singleNumber("SELECT COUNT(*) AS n FROM sessions WHERE user_id=?", [id])).toBe(1);
    } finally {
      await pool.query("DROP TRIGGER reject_session_delete");
    }
  }, 70_000);

  it("persists private conversations and isolates owners across requests", async () => {
    const hash = await bcrypt.hash("Private-Conversation-Fixture!", 12);
    const tokens: string[] = [];
    for (const email of ["private-owner@example.invalid", "private-other@example.invalid"]) {
      const [result] = await pool.execute<mysql.ResultSetHeader>(
        "INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)", [email, hash]);
      tokens.push(signUserToken(result.insertId, hash));
    }
    const request = (token: string, path: string, body?: object) => privateConversations.request(path, {
      method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const created = await request(tokens[0], "/", { personalityId: 1, title: "Private fixture" });
    expect(created.status).toBe(201);
    const id = (await created.json()).id;
    expect((await privateConversations.request(`/${id}/messages`)).status).toBe(401);
    expect((await request(tokens[1], `/${id}/messages`)).status).toBe(404);
    expect((await request(tokens[1], `/${id}/messages`, { content: "injected" })).status).toBe(404);
    expect((await request(tokens[1], "/99999999/messages")).status).toBe(404);
    expect((await (await request(tokens[1], "/")).json()).conversations).toEqual([]);
    const writes = await Promise.all(Array.from({ length: 10 }, (_, i) =>
      request(tokens[0], `/${id}/messages`, { content: `Private turn ${i}` })));
    expect(writes.map(r => r.status)).toEqual(Array(10).fill(201));
    expect(await singleNumber("SELECT message_count FROM companion_conversations WHERE id=?", [id])).toBe(10);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_messages WHERE conversation_id=?", [id])).toBe(10);
    const latest = await request(tokens[0], `/${id}/messages?limit=4`);
    expect(latest.headers.get("Cache-Control")).toBe("no-store");
    const messages = (await latest.json()).messages;
    expect(messages).toHaveLength(4);
    expect(messages.every((m: any) => m.role === "user")).toBe(true);
    const older = (await (await request(tokens[0], `/${id}/messages?before=${messages[3].id}&limit=10`)).json()).messages;
    expect(older).toHaveLength(6);
    expect(older.every((m: any) => m.id < messages[3].id)).toBe(true);
    // Prove a fresh request reads MySQL, rather than a process-local chat cache.
    await pool.execute("UPDATE companion_messages SET content='Persisted database update' WHERE id=?", [messages[0].id]);
    expect((await (await request(tokens[0], `/${id}/messages?limit=1`)).json()).messages[0].content)
      .toBe("Persisted database update");
  }, 70_000);

  it("rolls back a message when its conversation counter update fails", async () => {
    const hash = await bcrypt.hash("Rollback-Conversation-Fixture!", 12);
    const [user] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)", ["chat-rollback@example.invalid", hash]);
    const token = signUserToken(user.insertId, hash);
    const [conversation] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO companion_conversations (personality_id,user_id,title) VALUES (1,?,?)", [user.insertId, "Rollback fixture"]);
    const id = conversation.insertId;
    await pool.query("CREATE TRIGGER reject_conversation_update BEFORE UPDATE ON companion_conversations FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CI forced failure'");
    try {
      const response = await privateConversations.request(`/${id}/messages`, { method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content: "Must roll back" }) });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ code: "CONVERSATION_STORAGE_UNAVAILABLE" });
      expect(await singleNumber("SELECT COUNT(*) FROM companion_messages WHERE conversation_id=?", [id])).toBe(0);
      expect(await singleNumber("SELECT message_count FROM companion_conversations WHERE id=?", [id])).toBe(0);
    } finally { await pool.query("DROP TRIGGER reject_conversation_update"); }
  }, 70_000);

  it("deletes only an owned conversation and its messages and owned linked memories", async () => {
    const hash = await bcrypt.hash("Deletion-Fixture-Password!", 12);
    const [owner] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)", ["delete-owner@example.invalid", hash]);
    const [other] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)", ["delete-other@example.invalid", hash]);
    const [conversation] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO companion_conversations (personality_id,user_id,title) VALUES (1,?,?)", [owner.insertId, "Delete fixture"]);
    const id = conversation.insertId;
    const [untouched] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO companion_conversations (personality_id,user_id,title) VALUES (1,?,?)", [owner.insertId, "Keep separate conversation"]);
    await pool.execute("INSERT INTO companion_messages (conversation_id,role,content) VALUES (?,'user','keep separate message')", [untouched.insertId]);
    await pool.execute("INSERT INTO companion_messages (conversation_id,role,content) VALUES (?,'user','delete fixture')", [id]);
    await pool.execute("INSERT INTO companion_memories (conversation_id,user_id,content) VALUES (?,?,'owned linked'),(?,?,'other account'),(NULL,?,'unlinked')", [id, owner.insertId, id, other.insertId, owner.insertId]);
    const remove = (userId: number, target = id) => privateConversations.request(`/${target}`, { method: "DELETE", headers: { Authorization: `Bearer ${signUserToken(userId, hash)}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
    expect((await remove(other.insertId)).status).toBe(404);
    expect((await remove(other.insertId, 99999999)).status).toBe(404);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_messages WHERE conversation_id=?", [id])).toBe(1);
    const deleted = await remove(owner.insertId);
    expect(deleted.status).toBe(200);
    expect(deleted.headers.get("Cache-Control")).toBe("no-store");
    expect(await deleted.json()).toEqual({ id, deleted: true });
    expect(await singleNumber("SELECT COUNT(*) FROM companion_conversations WHERE id=?", [id])).toBe(0);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_messages WHERE conversation_id=?", [id])).toBe(0);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_memories WHERE conversation_id=? AND user_id=?", [id, owner.insertId])).toBe(0);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_memories WHERE user_id=?", [other.insertId])).toBe(1);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_memories WHERE user_id=?", [owner.insertId])).toBe(1);
    expect((await remove(owner.insertId)).status).toBe(404);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_conversations WHERE id=?", [untouched.insertId])).toBe(1);
    expect(await singleNumber("SELECT COUNT(*) FROM companion_messages WHERE conversation_id=?", [untouched.insertId])).toBe(1);
  }, 70_000);

  it("rolls back deleted messages and memories when parent deletion fails", async () => {
    const hash = await bcrypt.hash("Delete-Rollback-Password!", 12);
    const [user] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)", ["delete-rollback@example.invalid", hash]);
    const [conversation] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO companion_conversations (personality_id,user_id,title,message_count) VALUES (1,?,?,1)", [user.insertId, "Keep everything"]);
    const id = conversation.insertId;
    await pool.execute("INSERT INTO companion_messages (conversation_id,role,content) VALUES (?,'user','retained')", [id]);
    await pool.execute("INSERT INTO companion_memories (conversation_id,user_id,content) VALUES (?,?,'retained')", [id, user.insertId]);
    await pool.query("CREATE TRIGGER reject_conversation_delete BEFORE DELETE ON companion_conversations FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CI forced deletion failure'");
    try {
      const response = await privateConversations.request(`/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${signUserToken(user.insertId, hash)}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ code: "CONVERSATION_STORAGE_UNAVAILABLE" });
      expect(await singleNumber("SELECT COUNT(*) FROM companion_messages WHERE conversation_id=?", [id])).toBe(1);
      expect(await singleNumber("SELECT COUNT(*) FROM companion_memories WHERE conversation_id=?", [id])).toBe(1);
      expect(await singleNumber("SELECT message_count FROM companion_conversations WHERE id=?", [id])).toBe(1);
    } finally { await pool.query("DROP TRIGGER reject_conversation_delete"); }
  }, 70_000);

  it("serializes concurrent deletion and message writes without orphan messages", async () => {
    const hash = await bcrypt.hash("Concurrent-Delete-Password!", 12);
    const [user] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)", ["delete-concurrent@example.invalid", hash]);
    const token = signUserToken(user.insertId, hash);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    for (let round = 0; round < 3; round++) {
      const [conversation] = await pool.execute<mysql.ResultSetHeader>("INSERT INTO companion_conversations (personality_id,user_id,title) VALUES (1,?,?)", [user.insertId, "Concurrent deletion"]);
      const id = conversation.insertId;
      const [deleted, ...writes] = await Promise.all([
        privateConversations.request(`/${id}`, { method: "DELETE", headers, body: JSON.stringify({ confirm: true }) }),
        ...Array.from({ length: 5 }, () => privateConversations.request(`/${id}/messages`, { method: "POST", headers, body: JSON.stringify({ content: "Concurrent note" }) })),
      ]);
      expect(deleted.status).toBe(200);
      expect(writes.every(response => [201, 404].includes(response.status))).toBe(true);
      expect(await singleNumber("SELECT COUNT(*) FROM companion_conversations WHERE id=?", [id])).toBe(0);
      expect(await singleNumber("SELECT COUNT(*) FROM companion_messages WHERE conversation_id=?", [id])).toBe(0);
    }
  }, 70_000);

  it("atomically enforces 20 daily attempts from concurrent Gemini/OpenAI requests", async () => {
    expect(PILOT_USER_DAILY_MAX_ATTEMPTS).toBe(20);
    const results = await Promise.allSettled(Array.from({ length: 25 }, (_, i) =>
      reservePilotAttempt(i % 2 === 0 ? "gemini" : "openai", 101, TEST_PERIOD)));
    const allowed = results.filter(x => x.status === "fulfilled").length;
    const blocked = results.filter(x => x.status === "rejected");
    expect(allowed).toBe(20);
    expect(blocked).toHaveLength(5);
    for (const item of blocked) {
      if (item.status === "rejected") {
        expect(item.reason).toBeInstanceOf(PilotBlocked);
        expect(item.reason.reason).toBe("AI_USER_DAILY_QUOTA_EXHAUSTED");
      }
    }
    expect(await singleNumber(
      "SELECT attempts AS n FROM ai_pilot_daily_user_usage WHERE day_utc=? AND user_id=?",
      [DAY, 101])).toBe(20);
    const total = await singleNumber(
      "SELECT SUM(reserved_cents) AS n FROM ai_pilot_monthly_spend WHERE month_utc=?",
      [MONTH]);
    expect(total).toBe(200);
  }, 70_000);

  it("enforces separate $60 Gemini and $40 OpenAI limits without leakage", async () => {
    // Simulate existing reservations, not actual paid provider calls.
    await pool.execute(
      "UPDATE ai_pilot_monthly_spend SET reserved_cents=? WHERE month_utc=? AND provider=?",
      [PILOT_CENTS.gemini - 10, MONTH, "gemini"]);
    await pool.execute(
      "UPDATE ai_pilot_monthly_spend SET reserved_cents=? WHERE month_utc=? AND provider=?",
      [PILOT_CENTS.openai - 10, MONTH, "openai"]);
    await reservePilotAttempt("gemini", 202, TEST_PERIOD);
    await reservePilotAttempt("openai", 202, TEST_PERIOD);
    await expect(reservePilotAttempt("gemini", 203, TEST_PERIOD))
      .rejects.toMatchObject({ reason: "AI_PROVIDER_BUDGET_EXHAUSTED" });
    await expect(reservePilotAttempt("openai", 203, TEST_PERIOD))
      .rejects.toMatchObject({ reason: "AI_PROVIDER_BUDGET_EXHAUSTED" });
    expect(await singleNumber(
      "SELECT reserved_cents AS n FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='gemini'",
      [MONTH])).toBe(6000);
    expect(await singleNumber(
      "SELECT reserved_cents AS n FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='openai'",
      [MONTH])).toBe(4000);
  });

  it("prevents concurrent accounts from overrunning either monthly provider limit", async () => {
    const clock = new Date("2026-12-07T12:00:00Z");
    const month = utcMonth(clock);
    const day = utcDay(clock);
    for (const provider of ["gemini", "openai"] as const) {
      await pool.execute(
        "INSERT INTO ai_pilot_monthly_spend (month_utc, provider, reserved_cents) VALUES (?, ?, ?)",
        [month, provider, PILOT_CENTS[provider] - 20]);
    }
    // Only two reservations remain per provider; different accounts contend
    // for the same monthly rows so daily per-user limits cannot mask an overrun.
    const results = await Promise.allSettled(Array.from({ length: 24 }, (_, i) =>
      reservePilotAttempt(i % 2 === 0 ? "gemini" : "openai", 600 + i, clock)));
    expect(results.filter(x => x.status === "fulfilled")).toHaveLength(4);
    const blocked = results.filter(x => x.status === "rejected");
    expect(blocked).toHaveLength(20);
    for (const item of blocked) {
      if (item.status === "rejected") {
        expect(item.reason).toBeInstanceOf(PilotBlocked);
        expect(item.reason.reason).toBe("AI_PROVIDER_BUDGET_EXHAUSTED");
      }
    }
    for (const provider of ["gemini", "openai"] as const) {
      expect(await singleNumber(
        "SELECT reserved_cents AS n FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider=?",
        [month, provider])).toBe(PILOT_CENTS[provider]);
    }
    // Rejected attempts roll back their user counter and don't consume quota.
    expect(await singleNumber(
      "SELECT SUM(attempts) AS n FROM ai_pilot_daily_user_usage WHERE day_utc=?", [day])).toBe(4);
    expect(await singleNumber(
      "SELECT COUNT(*) AS n FROM ai_pilot_daily_user_usage WHERE day_utc=?", [day])).toBe(4);
  }, 70_000);

  it("rolls back all spend reservations if the quota ledger is missing", async () => {
    // Only this isolated CI database is modified; never execute against Railway.
    const before = await singleNumber(
      "SELECT SUM(reserved_cents) AS n FROM ai_pilot_monthly_spend WHERE month_utc=?",
      [MONTH]);
    await pool.query("DROP TABLE ai_pilot_daily_user_usage");
    await expect(reservePilotAttempt("gemini", 500, new Date("2026-11-01T01:00:00Z")))
      .rejects.toMatchObject({ reason: "AI_BUDGET_STORE_UNAVAILABLE" });
    const after = await singleNumber(
      "SELECT SUM(reserved_cents) AS n FROM ai_pilot_monthly_spend WHERE month_utc=?",
      [MONTH]);
    expect(after).toBe(before);
  });
});
