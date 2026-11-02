/** A single bounded same-origin notes request. Never retries a read or write. */
export const CONVERSATION_REQUEST_TIMEOUT_MS = 15_000;
// A selected export permits 1 MiB of text; JSON escaping can expand it sixfold.
// 8 MiB also accommodates the bounded history pages. The all-notes archive keeps
// its separate 32 MiB / 30-second policy.
export const MAX_CONVERSATION_RESPONSE_BYTES = 8 * 1024 * 1024;

type JsonResult = { ok: true; status: number; body: unknown } | { ok: false; status: number };

export async function requestConversationJson(
  request: typeof fetch, path: string, init: RequestInit,
): Promise<JsonResult> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const aborted = () => new DOMException('Notes request cancelled', 'AbortError');
  const cancel = () => { if (reader) void reader.cancel().catch(() => {}); };
  // The deadline also settles the caller if a custom transport ignores abort,
  // or its response stream never finishes cancellation. It cannot undo a write.
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(); cancel(); reject(aborted());
    }, CONVERSATION_REQUEST_TIMEOUT_MS);
  });
  const operation = async (): Promise<JsonResult> => {
    const response = await request(path, { ...init, signal: controller.signal });
    if (controller.signal.aborted) {
      void response.body?.cancel().catch(() => {}); throw aborted();
    }
    if (!response.ok) {
      // HTTP status is enough. Never parse or return private diagnostics.
      void response.body?.cancel().catch(() => {});
      return { ok: false, status: response.status };
    }
    const contentType = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    const length = response.headers.get('Content-Length');
    if (contentType !== 'application/json' || !response.body ||
        (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) ||
          Number(length) > MAX_CONVERSATION_RESPONSE_BYTES))) {
      void response.body?.cancel().catch(() => {});
      throw new Error('Invalid notes response');
    }
    reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      for (;;) {
        if (controller.signal.aborted) throw aborted();
        const next = await reader.read();
        if (controller.signal.aborted) throw aborted();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > MAX_CONVERSATION_RESPONSE_BYTES) throw new Error('Notes response exceeds the limit');
        chunks.push(next.value);
      }
      const body = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      try {
        return { ok: true, status: response.status,
          body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) };
      } catch { throw new Error('Invalid notes response'); }
    } finally {
      // Do not await cancellation: a stalled underlying cancel must not keep the
      // page locked. Releasing the lock does not expose partially read content.
      cancel(); reader.releaseLock(); reader = undefined;
    }
  };
  try { return await Promise.race([operation(), deadline]); }
  finally { clearTimeout(timer); }
}
