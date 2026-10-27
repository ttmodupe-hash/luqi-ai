/** One bounded account request. Cancelling cannot undo server-side registration. */
export const ACCOUNT_REQUEST_TIMEOUT_MS = 15_000;
export const MAX_ACCOUNT_RESPONSE_BYTES = 32 * 1024;
export type AccountPath = '/api/v1/auth/login' | '/api/v1/auth/register';
type AccountCredentials = { email: string; password: string; rememberMe?: boolean };
type AccountResult = { ok: true; status: number; body: unknown } |
  { ok: false; status: number; retryAfter?: number };

export async function requestAccountJson(
  request: typeof fetch, path: AccountPath, credentials: AccountCredentials, signal?: AbortSignal,
): Promise<AccountResult> {
  if (path !== '/api/v1/auth/login' && path !== '/api/v1/auth/register') throw new Error('Invalid account request');
  const interrupted = () => new DOMException('Account request interrupted', 'AbortError');
  if (signal?.aborted) throw interrupted();
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancelReader = () => { if (reader) void reader.cancel().catch(() => {}); };
  let rejectDeadline!: (reason: Error) => void;
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const abort = () => { controller.abort(); cancelReader(); rejectDeadline(interrupted()); };
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, ACCOUNT_REQUEST_TIMEOUT_MS);
  const operation = async (): Promise<AccountResult> => {
    const response = await request(path, {
      // Same-origin cookies are accepted only by the reviewed host-only session
      // issuer. The response's bearer token is still kept only in React memory.
      method: 'POST', cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json',
        'X-Luqi-Session-Intent': path === '/api/v1/auth/login' ? 'login' : 'signup' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password,
        ...(credentials.rememberMe === true ? { rememberMe: true } : {}) }),
    });
    const discard = () => { void response.body?.cancel().catch(() => {}); };
    if (controller.signal.aborted) { discard(); throw interrupted(); }
    if (response.redirected) { discard(); throw new Error('Invalid account response'); }
    if (!response.ok) {
      // Status is sufficient. Never read, log or return a private diagnostic body.
      discard();
      if (response.status !== 429) return { ok: false, status: response.status };
      const raw = response.headers.get('Retry-After') ?? '';
      const retryAfter = /^\d{1,4}$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 3600 ? Number(raw) : 30;
      return { ok: false, status: 429, retryAfter };
    }
    const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    const length = response.headers.get('Content-Length');
    if (type !== 'application/json' || !response.body ||
        (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) ||
          Number(length) > MAX_ACCOUNT_RESPONSE_BYTES))) {
      discard(); throw new Error('Invalid account response');
    }
    reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      for (;;) {
        if (controller.signal.aborted) throw interrupted();
        const next = await reader.read();
        if (controller.signal.aborted) throw interrupted();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > MAX_ACCOUNT_RESPONSE_BYTES) throw new Error('Invalid account response');
        chunks.push(next.value);
      }
      const data = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
      try {
        return { ok: true, status: response.status,
          body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)) };
      } catch { throw new Error('Invalid account response'); }
    } finally {
      // Never wait for a broken underlying cancellation promise to settle.
      cancelReader(); reader.releaseLock(); reader = undefined;
    }
  };
  try { return await Promise.race([operation(), deadline]); }
  catch { if (controller.signal.aborted) throw interrupted(); throw new Error('Account request failed'); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
