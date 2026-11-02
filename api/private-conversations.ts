/** Authenticated durable storage only. No inference or legacy route activation. */
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { and, asc, count, desc, eq, lt, sql } from "drizzle-orm";
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { companionConversations, companionMessages, companionMemories } from "../db/schema";
import { getPersistentDb } from "./queries/connection";
import { authenticatePilotUser, PilotAuthError } from "./services/pilotAuth";

export const privateConversations = new Hono<{ Variables: { userId: number } }>();
const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const newConversation = z.object({
  personalityId: z.number().int().min(1).max(4),
  title: z.string().trim().min(1).max(500),
}).strict();
const newMessage = z.object({ content: z.string().trim().min(1).max(8000) }).strict();
const page = z.object({
  before: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();
class MissingConversation extends Error {}
class ExportTooLarge extends Error {}
class NotesExportTooLarge extends Error {}
export const MAX_EXPORT_ROWS = 1000;
export const MAX_EXPORT_TEXT_BYTES = 1024 * 1024;
export const NOTES_EXPORT_LIMITS = { conversations: 500, messages: 5000, memories: 5000,
  textBytes: 4 * 1024 * 1024, jsonBytes: 32 * 1024 * 1024 } as const;
// Limit simultaneous archive builds per process; not a distributed quota or
// a cap on slow response sockets. Each archive also has explicit size limits.
let activeNotesExports = 0;
const MAX_ACTIVE_NOTES_EXPORTS = 2;

privateConversations.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  try {
    c.set('userId', await authenticatePilotUser(c.req.header('authorization')));
  } catch (error) {
    const unavailable = error instanceof PilotAuthError && error.code === 'AUTH_UNAVAILABLE';
    return c.json({ code: unavailable ? 'AUTH_UNAVAILABLE' : 'AUTH_REQUIRED' }, unavailable ? 503 : 401);
  }
  return next();
});
privateConversations.use('*', bodyLimit({ maxSize: 32 * 1024,
  onError: c => c.json({ code: 'CONVERSATION_BODY_TOO_LARGE' }, 413),
}));
privateConversations.onError((error, c) => {
  if (error instanceof NotesExportTooLarge) return c.json({ code: 'PRIVATE_NOTES_EXPORT_TOO_LARGE' }, 422);
  if (error instanceof ExportTooLarge) return c.json({ code: 'CONVERSATION_EXPORT_TOO_LARGE' }, 422);
  if (error instanceof MissingConversation) return c.json({ code: 'CONVERSATION_NOT_FOUND' }, 404);
  // Raw SQL, credentials and conversation content must not escape in errors.
  return c.json({ code: 'CONVERSATION_STORAGE_UNAVAILABLE' }, 503);
});

privateConversations.post('/', async c => {
  const parsed = newConversation.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const db = await getPersistentDb();
  const [result] = await db.insert(companionConversations).values({
    ...parsed.data, userId: c.get('userId'),
  });
  const conversationId = Number(result.insertId);
  if (!Number.isSafeInteger(conversationId) || conversationId <= 0) throw new Error('Invalid persisted ID');
  return c.json({ id: conversationId, persisted: true }, 201);
});

privateConversations.get('/', async c => {
  const parsed = page.safeParse(c.req.query());
  if (!parsed.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const db = await getPersistentDb();
  const rows = await db.select().from(companionConversations).where(and(
    eq(companionConversations.userId, c.get('userId')),
    parsed.data.before ? lt(companionConversations.id, parsed.data.before) : undefined,
  )).orderBy(desc(companionConversations.id)).limit(parsed.data.limit);
  return c.json({ conversations: rows });
});

// Export the complete saved-notes workspace, rather than just the visible list
// page. Authentication precedes this handler. Every query binds ownership and
// one read-only snapshot includes counts and content without blocking writers.
privateConversations.get('/export', async c => {
  if (Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  if (activeNotesExports >= MAX_ACTIVE_NOTES_EXPORTS) {
    c.header('Retry-After', '15');
    return c.json({ code: 'PRIVATE_NOTES_EXPORT_BUSY' }, 429);
  }
  activeNotesExports++;
  try {
    const ownerId = c.get('userId');
    const db = await getPersistentDb() as MySql2Database;
    const serialized = await db.transaction(async tx => {
      const [engines] = await tx.execute(sql`SELECT ENGINE AS engine FROM information_schema.tables
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN
        ('companion_conversations', 'companion_messages', 'companion_memories')`);
      if (!Array.isArray(engines) || engines.length !== 3 || engines.some(row =>
          (row as { engine?: unknown }).engine !== 'InnoDB')) throw new Error('Snapshot storage unavailable');
      const owned = eq(companionConversations.userId, ownerId);
      const ownMemories = eq(companionMemories.userId, ownerId);
      const [conversationSize] = await tx.select({ rows: count(),
        bytes: sql`COALESCE(SUM(OCTET_LENGTH(${companionConversations.title})), 0)` })
        .from(companionConversations).where(owned);
      const [messageSize] = await tx.select({ rows: count(),
        bytes: sql`COALESCE(SUM(OCTET_LENGTH(${companionMessages.content})), 0)` })
        .from(companionMessages).innerJoin(companionConversations,
          eq(companionMessages.conversationId, companionConversations.id)).where(owned);
      const [memorySize] = await tx.select({ rows: count(),
        bytes: sql`COALESCE(SUM(OCTET_LENGTH(${companionMemories.content})), 0)` })
        .from(companionMemories).where(ownMemories);
      const sizes = [conversationSize, messageSize, memorySize];
      const limits = [NOTES_EXPORT_LIMITS.conversations, NOTES_EXPORT_LIMITS.messages, NOTES_EXPORT_LIMITS.memories];
      if (sizes.some((s, i) => !s || !Number.isSafeInteger(Number(s.rows)) || Number(s.rows) < 0 ||
          Number(s.rows) > limits[i] || !Number.isSafeInteger(Number(s.bytes)) || Number(s.bytes) < 0) ||
          sizes.reduce((total, s) => total + Number(s.bytes), 0) > NOTES_EXPORT_LIMITS.textBytes) {
        throw new NotesExportTooLarge();
      }
      const conversations = await tx.select({ id: companionConversations.id, title: companionConversations.title,
        personalityId: companionConversations.personalityId, createdAt: companionConversations.createdAt })
        .from(companionConversations).where(owned).orderBy(asc(companionConversations.id))
        .limit(NOTES_EXPORT_LIMITS.conversations + 1);
      const messages = await tx.select({ id: companionMessages.id, conversationId: companionMessages.conversationId,
        role: companionMessages.role, content: companionMessages.content, createdAt: companionMessages.createdAt })
        .from(companionMessages).innerJoin(companionConversations,
          eq(companionMessages.conversationId, companionConversations.id)).where(owned)
        .orderBy(asc(companionMessages.id)).limit(NOTES_EXPORT_LIMITS.messages + 1);
      const memories = await tx.select({ id: companionMemories.id,
        // An owned memory may have a legacy foreign/orphan association. Preserve
        // its own content but never reveal another account's conversation ID.
        conversationId: companionConversations.id, memoryType: companionMemories.memoryType,
        category: companionMemories.category, content: companionMemories.content,
        importance: companionMemories.importance, createdAt: companionMemories.createdAt })
        .from(companionMemories).leftJoin(companionConversations, and(
          eq(companionMemories.conversationId, companionConversations.id), owned))
        .where(ownMemories).orderBy(asc(companionMemories.id)).limit(NOTES_EXPORT_LIMITS.memories + 1);
      if ([conversations, messages, memories].some((rows, i) => rows.length !== Number(sizes[i].rows))) {
        throw new Error('Incomplete notes snapshot');
      }
      const text = JSON.stringify({ format: 'luqi.private-notes.v1', scope: 'saved_notes_only',
        exportedAt: new Date().toISOString(), conversations, messages, memories });
      if (Buffer.byteLength(text, 'utf8') > NOTES_EXPORT_LIMITS.jsonBytes) throw new NotesExportTooLarge();
      return text;
    // The first aggregate opens the repeatable-read snapshot. The installed
    // Drizzle version joins multiple START characteristics without a comma;
    // READ ONLY alone is valid and avoids that unsupported combination.
    }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
    c.header('Content-Disposition', 'attachment; filename="luqi-private-notes.json"');
    return c.body(serialized, 200, { 'Content-Type': 'application/json; charset=utf-8' });
  } finally { activeNotesExports--; }
});

privateConversations.get('/:id/messages', async c => {
  const conversationId = id.safeParse(c.req.param('id'));
  const pagination = page.safeParse(c.req.query());
  if (!conversationId.success || !pagination.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const db = await getPersistentDb();
  const [owned] = await db.select({ id: companionConversations.id }).from(companionConversations)
    .where(and(eq(companionConversations.id, conversationId.data),
      eq(companionConversations.userId, c.get('userId')))).limit(1);
  if (!owned) throw new MissingConversation();
  // Join ownership into the data read as well, rather than relying on a prior lookup.
  const rows = await db.select({ id: companionMessages.id, role: companionMessages.role,
    content: companionMessages.content, createdAt: companionMessages.createdAt })
    .from(companionMessages).innerJoin(companionConversations,
      eq(companionMessages.conversationId, companionConversations.id))
    .where(and(eq(companionConversations.userId, c.get('userId')),
      eq(companionConversations.id, conversationId.data),
      pagination.data.before ? lt(companionMessages.id, pagination.data.before) : undefined))
    .orderBy(desc(companionMessages.id)).limit(pagination.data.limit);
  return c.json({ messages: rows });
});

// Export a complete, bounded snapshot of one owned conversation. Never silently
// truncate, export unrelated account data, or include internal message metadata.
privateConversations.get('/:id/export', async c => {
  const conversationId = id.safeParse(c.req.param('id'));
  if (!conversationId.success || Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  const ownerId = c.get('userId');
  const db = await getPersistentDb();
  const serialized = await db.transaction(async (tx: any) => {
    // Message writes and deletion take this same lock. The first consistent
    // read occurs after the lock, so counts/content share a repeatable snapshot.
    const [conversation] = await tx.select({ id: companionConversations.id, title: companionConversations.title,
      personalityId: companionConversations.personalityId, createdAt: companionConversations.createdAt })
      .from(companionConversations).where(and(eq(companionConversations.id, conversationId.data),
        eq(companionConversations.userId, ownerId))).limit(1).for('update');
    if (!conversation) throw new MissingConversation();
    const ownedMessages = and(eq(companionConversations.id, conversationId.data), eq(companionConversations.userId, ownerId));
    const ownedMemories = and(eq(companionMemories.conversationId, conversationId.data), eq(companionMemories.userId, ownerId));
    const [messagesSize] = await tx.select({ rows: count(), bytes: sql`COALESCE(SUM(OCTET_LENGTH(${companionMessages.content})), 0)` })
      .from(companionMessages).innerJoin(companionConversations, eq(companionMessages.conversationId, companionConversations.id))
      .where(ownedMessages);
    const [memoriesSize] = await tx.select({ rows: count(), bytes: sql`COALESCE(SUM(OCTET_LENGTH(${companionMemories.content})), 0)` })
      .from(companionMemories).where(ownedMemories);
    if (Number(messagesSize.rows) > MAX_EXPORT_ROWS || Number(memoriesSize.rows) > MAX_EXPORT_ROWS ||
        Number(messagesSize.bytes) + Number(memoriesSize.bytes) > MAX_EXPORT_TEXT_BYTES) throw new ExportTooLarge();
    const messages = await tx.select({ id: companionMessages.id, role: companionMessages.role,
      content: companionMessages.content, createdAt: companionMessages.createdAt }).from(companionMessages)
      .innerJoin(companionConversations, eq(companionMessages.conversationId, companionConversations.id))
      .where(ownedMessages).orderBy(asc(companionMessages.id)).limit(MAX_EXPORT_ROWS);
    const memories = await tx.select({ id: companionMemories.id, memoryType: companionMemories.memoryType,
      category: companionMemories.category, content: companionMemories.content, importance: companionMemories.importance,
      createdAt: companionMemories.createdAt }).from(companionMemories)
      .where(ownedMemories).orderBy(asc(companionMemories.id)).limit(MAX_EXPORT_ROWS);
    const text = JSON.stringify({ format: 'luqi.conversation.v1', exportedAt: new Date().toISOString(),
      conversation, messages, memories });
    // Escaping can expand control characters. Reject instead of downloading a
    // partial document. Keep the response within an explicit memory bound.
    if (Buffer.byteLength(text, 'utf8') > 8 * 1024 * 1024) throw new ExportTooLarge();
    return text;
  }, { isolationLevel: 'repeatable read' });
  c.header('Content-Disposition', `attachment; filename="luqi-conversation-${conversationId.data}.json"`);
  return c.body(serialized, 200, { 'Content-Type': 'application/json; charset=utf-8' });
});

privateConversations.post('/:id/messages', async c => {
  const conversationId = id.safeParse(c.req.param('id'));
  const parsed = newMessage.safeParse(await c.req.json().catch(() => null));
  if (!conversationId.success || !parsed.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const db = await getPersistentDb();
  const messageId = await db.transaction(async (tx: any) => {
    const [owned] = await tx.select({ id: companionConversations.id }).from(companionConversations)
      .where(and(eq(companionConversations.id, conversationId.data),
        eq(companionConversations.userId, c.get('userId')))).limit(1).for('update');
    if (!owned) throw new MissingConversation();
    const [inserted] = await tx.insert(companionMessages).values({
      conversationId: conversationId.data, role: 'user', content: parsed.data.content,
    });
    const persistedId = Number(inserted.insertId);
    if (!Number.isSafeInteger(persistedId) || persistedId <= 0) throw new Error('Invalid persisted ID');
    await tx.update(companionConversations).set({
      messageCount: sql`COALESCE(${companionConversations.messageCount}, 0) + 1`,
      lastMessageAt: new Date(),
    }).where(and(eq(companionConversations.id, conversationId.data),
      eq(companionConversations.userId, c.get('userId'))));
    return persistedId;
  });
  return c.json({ id: messageId, role: 'user', persisted: true }, 201);
});

// Use the same parent-row lock as message writes. Delete children and parent in
// one transaction so failed deletes cannot leave a partially erased history.
privateConversations.delete('/:id', async c => {
  const conversationId = id.safeParse(c.req.param('id'));
  const confirmation = z.object({ confirm: z.literal(true) }).strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!conversationId.success || !confirmation.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const db = await getPersistentDb();
  await db.transaction(async (tx: any) => {
    const [owned] = await tx.select({ id: companionConversations.id }).from(companionConversations)
      .where(and(eq(companionConversations.id, conversationId.data),
        eq(companionConversations.userId, c.get('userId')))).limit(1).for('update');
    if (!owned) throw new MissingConversation();
    await tx.delete(companionMemories).where(and(eq(companionMemories.conversationId, conversationId.data),
      eq(companionMemories.userId, c.get('userId'))));
    await tx.delete(companionMessages).where(eq(companionMessages.conversationId, conversationId.data));
    await tx.delete(companionConversations).where(and(eq(companionConversations.id, conversationId.data),
      eq(companionConversations.userId, c.get('userId'))));
  });
  return c.json({ id: conversationId.data, deleted: true });
});
