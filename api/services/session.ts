// =====================================================================
// CHAT SESSION MEMORY — multi-turn context persisted in MySQL
// Every chat turn is stored in chat_sessions; prior turns are injected
// as context on follow-up messages so the assistant remembers the
// conversation. No-ops silently when the database is not configured.
// =====================================================================

import { getDb } from "../queries/connection";
import { chatSessions } from "../../db/schema";
import { eq, asc } from "drizzle-orm";

export interface SessionTurn {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_TURNS = 12;
const MAX_TURN_LENGTH = 4000;

export async function appendTurn(sessionId: string, role: "user" | "assistant", content: string): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) return;
  try {
    const db = await getDb();
    await db.insert(chatSessions).values({
      sessionId: sessionId.slice(0, 255),
      role,
      content: content.slice(0, MAX_TURN_LENGTH),
    });
  } catch (e) {
    console.warn("[Session] Failed to persist turn (non-fatal):", (e as Error)?.message);
  }
}

export async function getHistory(sessionId: string, limit = MAX_HISTORY_TURNS): Promise<SessionTurn[]> {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) return [];
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.sessionId, sessionId))
      .orderBy(asc(chatSessions.createdAt), asc(chatSessions.id));
    return rows.slice(-limit).map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
  } catch {
    return [];
  }
}

export function historyToContext(turns: SessionTurn[]): string | undefined {
  if (turns.length === 0) return undefined;
  const lines = turns.map((t) => `${t.role === "user" ? "User" : "LUQI"}: ${t.content}`);
  return `Conversation so far (use it as context — do not repeat it back):\n${lines.join("\n")}`;
}
