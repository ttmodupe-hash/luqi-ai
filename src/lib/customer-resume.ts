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
  return document.cookie.split(';').some(item => [CUSTOMER_RESUME_HINT + '=1', CUSTOMER_RESUME_HINT + '=pending'].includes(item.trim()));
}
export function clearCustomerResumeHint() {
  if (typeof document === 'undefined') return;
  document.cookie = CUSTOMER_RESUME_HINT + '=; Max-Age=0; Path=/; Secure; SameSite=Strict';
}

type SessionResponse = { status: number; body: unknown };
async function requestSession(
  path: '/api/v1/auth/session' | '/api/v1/auth/logout',
  intent: 'restore' | 'logout',
  request: typeof fetch, signal?: AbortSignal, token?: string,
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
      method: 'POST', cache: 'no-store', credentials: 'same-origin', redirect: 'error',
      signal: controller.signal,
      headers: { [INTENT]: intent, Accept: 'application/json', 'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: '{}',
    });
    if (controller.signal.aborted || response.redirected) throw interrupted();
    if (response.status !== 200) {
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

// Inert latch survives a reload after an uncertain rotation. Never retry that
// refresh automatically. A new credential-verified login can replace it.
function markRefreshUncertain() {
  document.cookie = CUSTOMER_RESUME_HINT + '=pending; Max-Age=86400; Path=/; Secure; SameSite=Strict';
}
let restoreFlight: Promise<RestoredCustomerSession | null> | null = null;
async function restoreOnce(request: typeof fetch): Promise<RestoredCustomerSession | null> {
  if (!document.cookie.split(';').some(item => item.trim() === CUSTOMER_RESUME_HINT + '=1')) return null;
  markRefreshUncertain();
  try {
    const response = await requestSession('/api/v1/auth/session', 'restore', request);
    if (response.status === 204 || response.status === 401) {
      clearCustomerResumeHint(); return null;
    }
    if (response.status !== 200) throw new Error('AUTH_RESTORE_UNAVAILABLE');
    const parsed = account.safeParse(response.body);
    if (!parsed.success) throw new Error('AUTH_RESPONSE_UNCONFIRMED');
    document.cookie = CUSTOMER_RESUME_HINT + '=1; Max-Age=86400; Path=/; Secure; SameSite=Strict';
    return parsed.data;
  } catch (error) { markRefreshUncertain(); throw error; }
}
export async function restoreCustomerSession(
  signal?: AbortSignal, request: typeof fetch = fetch,
): Promise<RestoredCustomerSession | null> {
  if (signal?.aborted) throw new Error('AUTH_REQUEST_UNCONFIRMED');
  if (!restoreFlight) {
    if (!hasCustomerResumeHint()) return null;
    // Web Locks serialize different tabs. A shared promise also prevents React
    // StrictMode cleanup from aborting and replaying a state-changing refresh.
    const run = () => restoreOnce(request);
    restoreFlight = Promise.resolve(typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('luqi-customer-session', run) : run());
    void restoreFlight.finally(() => { restoreFlight = null; }).catch(() => {});
  }
  const flight = restoreFlight;
  if (!signal) return flight;
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('AUTH_REQUEST_UNCONFIRMED'));
    signal.addEventListener('abort', abort, { once: true });
    void flight.then(value => { if (!signal.aborted) resolve(value); }, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}
export async function revokeCustomerSession(request: typeof fetch = fetch, token?: string): Promise<void> {
  const response = await requestSession('/api/v1/auth/logout', 'logout', request, undefined, token);
  if (response.status !== 204) throw new Error('LOGOUT_UNCONFIRMED');
  clearCustomerResumeHint();
}
