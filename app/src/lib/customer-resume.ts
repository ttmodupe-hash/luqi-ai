/** Single bounded same-origin session restore/revoke transport.
 * Bearer tokens stay in memory; the only readable cookie is a yes/no hint.
 * No provider traffic, browser token storage or automatic POST retry.
 */
import { z } from 'zod';

export const CUSTOMER_RESUME_HINT = '__Host-luqi_resume_hint';
const INTENT = 'X-Luqi-Session-Intent';
const MAX_BYTES = 8192;
const TIMEOUT_MS = 12_000;
const account = z.object({ token: z.string().min(1).max(4096),
  user: z.object({ email: z.string().email().max(254) }) });
export type RestoredCustomerSession = z.infer<typeof account>;

export function hasCustomerResumeHint(): boolean {
  if (typeof document === 'undefined' || !document.cookie) return false;
  return document.cookie.split(';').some(item => item.trim() === CUSTOMER_RESUME_HINT + '=1');
}
export function clearCustomerResumeHint() {
  if (typeof document === 'undefined') return;
  document.cookie = CUSTOMER_RESUME_HINT + '=; Max-Age=0; Path=/; Secure; SameSite=Strict';
}

type SessionResponse = { status: number; body: unknown };
async function requestSession(
  path: '/api/v1/auth/session' | '/api/v1/auth/logout',
  method: 'GET' | 'POST', intent: 'restore' | 'logout',
  request: typeof fetch, signal?: AbortSignal,
): Promise<SessionResponse> {
  const interrupted = () => new Error('AUTH_REQUEST_UNCONFIRMED');
  if (signal?.aborted) throw interrupted();
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectDeadline!: (reason: Error) => void;
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const cancel = () => { if (reader) void reader.cancel().catch(() => {}); };
  const abort = () => { controller.abort(); cancel(); rejectDeadline(interrupted()); };
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, TIMEOUT_MS);
  const operation = async (): Promise<SessionResponse> => {
    const response = await request(path, {
      method, cache: 'no-store', credentials: 'same-origin', redirect: 'error',
      signal: controller.signal,
      headers: { [INTENT]: intent, Accept: 'application/json' },
    });
    if (controller.signal.aborted || response.redirected) throw interrupted();
    if (response.status !== 200 || method === 'POST') {
      void response.body?.cancel().catch(() => {});
      return { status: response.status, body: null };
    }
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    const length = response.headers.get('content-length');
    if (type !== 'application/json' || !response.body ||
        (length !== null && (!/^\d+$/.test(length) ||
          !Number.isSafeInteger(Number(length)) || Number(length) > MAX_BYTES))) {
      void response.body?.cancel().catch(() => {});
      throw interrupted();
    }
    reader = response.body.getReader();
    let bytes = 0; const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        if (controller.signal.aborted) throw interrupted();
        const { done, value } = await reader.read();
        if (controller.signal.aborted) throw interrupted();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) throw interrupted();
        chunks.push(value);
      }
      const data = new Uint8Array(bytes); let offset = 0;
      for (const part of chunks) { data.set(part, offset); offset += part.length; }
      return { status: response.status, body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)) };
    } finally {
      cancel(); reader?.releaseLock(); reader = undefined;
    }
  };
  try { return await Promise.race([operation(), deadline]); }
  catch { throw interrupted(); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export async function restoreCustomerSession(
  signal?: AbortSignal, request: typeof fetch = fetch,
): Promise<RestoredCustomerSession | null> {
  if (!hasCustomerResumeHint()) return null;
  const response = await requestSession('/api/v1/auth/session', 'GET', 'restore', request, signal);
  if (response.status === 204 || response.status === 401) {
    clearCustomerResumeHint(); return null;
  }
  if (response.status !== 200) throw new Error('AUTH_RESTORE_UNAVAILABLE');
  const parsed = account.safeParse(response.body);
  if (!parsed.success) throw new Error('AUTH_RESPONSE_UNCONFIRMED');
  return parsed.data;
}

export async function revokeCustomerSession(request: typeof fetch = fetch): Promise<void> {
  if (!hasCustomerResumeHint()) return;
  const response = await requestSession('/api/v1/auth/logout', 'POST', 'logout', request);
  if (response.status !== 204) throw new Error('LOGOUT_UNCONFIRMED');
  clearCustomerResumeHint();
}
