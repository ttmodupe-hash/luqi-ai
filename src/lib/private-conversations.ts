import { z } from "zod";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const conversation = z.object({ id, title: z.string(), personalityId: z.number() });
const message = z.object({ id, role: z.enum(["user", "assistant", "system"]), content: z.string(), createdAt: z.string().nullable() });
export function conversationExportSchema(conversationId: number) {
  return z.object({
    format: z.literal('luqi.conversation.v1'), exportedAt: z.string().datetime(),
    conversation: z.object({ id: z.literal(conversationId), title: z.string().nullable(),
      personalityId: id, createdAt: z.string().nullable() }),
    messages: z.array(message).max(1000),
    memories: z.array(z.object({ id, memoryType: z.string().nullable(), category: z.string().nullable(),
      content: z.string(), importance: z.string().nullable(), createdAt: z.string().nullable() })).max(1000),
  });
}
export type ConversationExport = z.infer<ReturnType<typeof conversationExportSchema>>;

const exportedConversation = z.object({ id, title: z.string().nullable(), personalityId: id,
  createdAt: z.string().nullable() }).strict();
export const privateNotesExportSchema = z.object({
  format: z.literal('luqi.private-notes.v1'), scope: z.literal('saved_notes_only'), exportedAt: z.string().datetime(),
  conversations: z.array(exportedConversation).max(500),
  messages: z.array(message.extend({ conversationId: id }).strict()).max(5000),
  memories: z.array(z.object({ id, conversationId: id.nullable(), memoryType: z.string().nullable(),
    category: z.string().nullable(), content: z.string(), importance: z.string().nullable(),
    createdAt: z.string().nullable() }).strict()).max(5000),
}).strict().superRefine((data, ctx) => {
  const conversationIds = new Set(data.conversations.map(c => c.id));
  if (conversationIds.size !== data.conversations.length ||
      new Set(data.messages.map(m => m.id)).size !== data.messages.length ||
      new Set(data.memories.map(m => m.id)).size !== data.memories.length ||
      data.messages.some(m => !conversationIds.has(m.conversationId)) ||
      data.memories.some(m => m.conversationId !== null && !conversationIds.has(m.conversationId))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid private notes relationships' });
  }
});
export type PrivateNotesExport = z.infer<typeof privateNotesExportSchema>;
export const MAX_NOTES_DOWNLOAD_BYTES = 32 * 1024 * 1024;

async function exportAllNotes(token: string, request: typeof fetch, signal?: AbortSignal): Promise<PrivateNotesExport> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 30_000);
  try {
    const response = await request('/api/v1/companion/conversations/export', {
      method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) throw new ConversationError(response.status);
    if (response.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json' || !response.body ||
        Number(response.headers.get('Content-Length') ?? 0) > MAX_NOTES_DOWNLOAD_BYTES) throw new Error('Invalid notes export');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let bytes = 0;
    const cancelReader = () => { void reader.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort', cancelReader, { once: true });
    try {
      for (;;) {
        if (controller.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > MAX_NOTES_DOWNLOAD_BYTES) throw new Error('Notes export exceeds the download limit');
        chunks.push(next.value);
      }
    } finally {
      controller.signal.removeEventListener('abort', cancelReader);
      await reader.cancel().catch(() => {}); reader.releaseLock();
    }
    if (controller.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return privateNotesExportSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)));
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export function downloadPrivateNotesExport(data: PrivateNotesExport) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  try {
    link.href = url; link.download = 'luqi-private-notes.json';
    document.body.append(link); link.click();
  } finally { link.remove(); URL.revokeObjectURL(url); }
}

export function downloadConversationExport(data: ConversationExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url; link.download = `luqi-conversation-${data.conversation.id}.json`;
    document.body.append(link); link.click();
  } finally { link.remove(); URL.revokeObjectURL(url); }
}

export type Conversation = z.infer<typeof conversation>;
export type SavedMessage = z.infer<typeof message>;
export class ConversationError extends Error {
  constructor(public status: number, public retryAfter?: number) { super("Conversation request failed"); }
}

// Same-origin only; never persist credentials or conversation content in browser storage.
// Writes are deliberately not retried: a lost response may follow a committed write.
export function conversationClient(token: string, request: typeof fetch = fetch) {
  async function call<T>(path: string, schema: z.ZodType<T>, body?: unknown, method?: "DELETE"): Promise<T> {
    const response = await request(`/api/v1/companion/conversations${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"), cache: "no-store", credentials: "omit", redirect: "error",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new ConversationError(response.status);
    return schema.parse(await response.json());
  }
  return {
    list: (before?: number) => call(`?limit=50${before ? `&before=${before}` : ""}`, z.object({ conversations: z.array(conversation) })),
    create: (title: string, personalityId: number) => call("", z.object({ id, persisted: z.literal(true) }), { title, personalityId }),
    messages: (conversationId: number, before?: number) => call(`/${conversationId}/messages?limit=50${before ? `&before=${before}` : ""}`, z.object({ messages: z.array(message) })),
    export: (conversationId: number) => call(`/${conversationId}/export`, conversationExportSchema(conversationId)),
    exportAll: (signal?: AbortSignal) => exportAllNotes(token, request, signal),
    remove: (conversationId: number) => call(`/${conversationId}`, z.object({ id: z.literal(conversationId), deleted: z.literal(true) }), { confirm: true }, "DELETE"),
    save: (conversationId: number, content: string) => call(`/${conversationId}/messages`, z.object({ id, role: z.literal("user"), persisted: z.literal(true) }), { content }),
  };
}

const accountSession = z.object({ token: z.string().min(1).max(4096),
  user: z.object({ email: z.string().email().max(254) }) });
export type AccountSession = z.infer<typeof accountSession>;
export const validAccountPassword = (password: string) => password.length >= 12 &&
  new TextEncoder().encode(password).length <= 72;

async function accountRequest(path: string, email: string, password: string): Promise<AccountSession> {
  const normalized = email.trim().toLowerCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(path, {
      method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalized, password }),
    });
    if (!response.ok) {
      const raw = response.headers.get('Retry-After') ?? '';
      const seconds = /^\d{1,4}$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 3600 ? Number(raw) : 30;
      throw new ConversationError(response.status, response.status === 429 ? seconds : undefined);
    }
    const result = accountSession.parse(await response.json());
    if (result.user.email.toLowerCase() !== normalized) throw new Error('Account response mismatch');
    return result;
  } finally { clearTimeout(timer); }
}
export const signIn = (email: string, password: string) => accountRequest('/api/v1/auth/login', email, password);
// Registration is a write: never retry an ambiguous response automatically.
export const signUp = (email: string, password: string) => accountRequest('/api/v1/auth/register', email, password);
