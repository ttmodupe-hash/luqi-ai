import { z } from "zod";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const conversation = z.object({ id, title: z.string(), personalityId: z.number() });
const message = z.object({ id, role: z.enum(["user", "assistant", "system"]), content: z.string(), createdAt: z.string().nullable() });
export type Conversation = z.infer<typeof conversation>;
export type SavedMessage = z.infer<typeof message>;
export class ConversationError extends Error {
  constructor(public status: number) { super("Conversation request failed"); }
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
    list: (before?: number) => call(`/?limit=50${before ? `&before=${before}` : ""}`, z.object({ conversations: z.array(conversation) })),
    create: (title: string, personalityId: number) => call("/", z.object({ id, persisted: z.literal(true) }), { title, personalityId }),
    messages: (conversationId: number, before?: number) => call(`/${conversationId}/messages?limit=50${before ? `&before=${before}` : ""}`, z.object({ messages: z.array(message) })),
    remove: (conversationId: number) => call(`/${conversationId}`, z.object({ id: z.literal(conversationId), deleted: z.literal(true) }), { confirm: true }, "DELETE"),
    save: (conversationId: number, content: string) => call(`/${conversationId}/messages`, z.object({ id, role: z.literal("user"), persisted: z.literal(true) }), { content }),
  };
}

export async function signIn(email: string, password: string) {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST", cache: "no-store", credentials: "omit", redirect: "error",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new ConversationError(response.status);
  return z.object({ token: z.string().min(1), user: z.object({ email: z.string() }) }).parse(await response.json());
}
