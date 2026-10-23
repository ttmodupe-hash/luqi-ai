/** Authenticated durable storage only. No inference or legacy route activation. */
import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, lt, sql } from "drizzle-orm";
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
privateConversations.onError((error, c) => {
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
