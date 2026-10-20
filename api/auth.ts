import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { users, sessions } from "../db/schema";
import { getAuthDb } from "./queries/connection";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthenticatedUser = {
  id: number;
  email: string;
  name: string | null;
  role: string | null;
};

export type SessionResult = {
  token: string;
  expiresAt: Date;
  user: AuthenticatedUser;
};

function digestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toPublicUser(user: any): AuthenticatedUser {
  return { id: Number(user.id), email: user.email, name: user.name ?? null, role: user.role ?? "user" };
}

function readToken(req: Request): string | null {
  const authorization = req.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim() || null;

  const cookieHeader = req.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === "luqi_session") {
      try { return decodeURIComponent(value.join("=")) || null; } catch { return null; }
    }
  }
  return null;
}

export async function resolveSessionUser(req: Request): Promise<AuthenticatedUser | null> {
  const token = readToken(req);
  if (!token) return null;

  const db = await getAuthDb();
  if (!db) return null;

  try {
    const [session] = await db.select().from(sessions)
      .where(and(eq(sessions.token, digestToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (!session) return null;

    const [user] = await db.select().from(users)
      .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
      .limit(1);
    return user ? toPublicUser(user) : null;
  } catch {
    // Fail closed on storage errors; do not turn public requests into a 500.
    return null;
  }
}

export async function registerAccount(emailInput: string, password: string, nameInput?: string): Promise<SessionResult> {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  if (password.length > 200) throw new Error("Password is too long.");

  const db = await getAuthDb();
  if (!db) throw new Error("Authentication requires an available persistent database. Configure DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    email,
    passwordHash,
    name: nameInput?.trim().slice(0, 255) || null,
    role: "user",
    isActive: true,
    emailVerified: false,
  });

  const [created] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!created) throw new Error("Account creation failed. Please try again.");
  return createSession(toPublicUser(created));
}

export async function loginAccount(emailInput: string, password: string): Promise<SessionResult> {
  const email = emailInput.trim().toLowerCase();
  const db = await getAuthDb();
  if (!db) throw new Error("Authentication requires an available persistent database. Configure DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid || !user.isActive) throw new Error("Invalid email or password.");

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return createSession(toPublicUser(user));
}

async function createSession(user: AuthenticatedUser): Promise<SessionResult> {
  const db = await getAuthDb();
  if (!db) throw new Error("Authentication requires an available persistent database.");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // Store only a SHA-256 digest. The raw bearer token is sent once in an
  // HttpOnly cookie and cannot be recovered from a database dump.
  await db.insert(sessions).values({
    userId: user.id,
    token: digestToken(token),
    expiresAt,
  });
  return { token, expiresAt, user };
}

export async function revokeSession(req: Request): Promise<void> {
  const token = readToken(req);
  if (!token) return;
  const db = await getAuthDb();
  if (!db) return;
  await db.delete(sessions).where(eq(sessions.token, digestToken(token)));
}
