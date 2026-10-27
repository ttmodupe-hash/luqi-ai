/** One bounded same-origin customer-session restoration or revocation.
 * The only JavaScript-readable cookie is an inert yes/no marker, never a token.
 * Neither method invokes the AI gateway or retries ambiguous requests.
 */
import { z } from 'zod';

export const CUSTOMER_RESUME_HINT = '__Host-luqi_resume_hint';
const INTENT = 'X-Luqi-Session-Intent';
const MAX_BYTES = 8192;
const TIMEOUT_MS = 12_000;
const session = z.object({
  token: z.string().min(1).max(4096),
  user: z.object({ email: z.string().email().max(254) }),
}).strict();

export type RestoredCustomerSession = z.infer<typeof session>;

export function hasCustomerResumeHint(): boolean {
  if (typeof document === 'undefined' || !document.cookie) return false;
  return document.cookie.split(';').some(item => item.trim() === CUSTOMER_RESUME_HINT + '=1');
}

export function clearCustomerResumeHint() {
  if (typeof document === 'undefined') return;
  document.cookie = CUSTOMER_RESUME_HINT + '=; Max-Age=0; Path=/; Secure; SameSite=Strict';
}

async function singleSessionRequest(
  path: '/api/v1/auth/session' | '/api/v1/auth/logout',
  method: 'GET' | 'POST', intent: 'restore' | 'logout',
  request: typeof fetch, externalSignal?: AbortSignal,
): Promise<Response> {
  if (externalSignal?.aborted) throw new Error('AUTH_REQUEST_INTERRUPTED');
  const controller = new AbortController();
  let rejectDeadline!: (reason: Error) => void;
  const deadline = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
  });
  const abort = () => { controller.abort(); rejectDeadline(new Error('AUTH_REQUEST_INTERRUPTED')); };
  externalSignal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, TIMEOUT_MS);
  try {
    const response = await Promise.race([request(path, {
      method, cache: 'no-store', credentials: 'same-origin', redirect: 'error',
      signal: controller.signal, headers: { [INTENT]: intent, Accept: 'application/json' },
    }), deadline]);
    if (controller.signal.aborted || response.redirected) throw new Error('AUTH_RESPONSE_UNCONFIRMED');
    return response;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abort);
  }
}

export async function restoreCustomerSession(
  signal?: AbortSignal, request: typeof fetch = fetch,
): Promise<RestoredCustomerSession | null> {
  if (!hasCustomerResumeHint()) return null;
  const response = await singleSessionRequest('/api/v1/auth/session', 'GET', 'restore', request, signal);
  if (response.status === 204 || response.status === 401) {
    clearCustomerResumeHint();
    return null;
  }
  if (response.status !== 200) throw new Error('AUTH_RESTORE_UNAVAILABLE');
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const length = response.headers.get('content-length');
  if (contentType !== 'application/json' ||
      (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES))) {
    throw new Error('AUTH_RESPONSE_UNCONFIRMED');
  }
  // Stream bound prevents a forged/malformed response exhausting browser memory.
  if (!response.body) throw new Error('AUTH_RESPONSE_UNCONFIRMED');
  const reader = response.body.getReader();
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      if (signal?.aborted) throw new Error('AUTH_REQUEST_INTERRUPTED');
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error('AUTH_RESPONSE_UNCONFIRMED');
      chunks.push(value);
    }
    const data = new Uint8Array(bytes); let i = 0;
    for (const part of chunks) { data.set(part, i); i += part.length; }
    const decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    return session.parse(decoded);
  } catch {
    throw new Error('AUTH_RESPONSE_UNCONFIRMED');
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function revokeCustomerSession(request: typeof fetch = fetch): Promise<void> {
  if (!hasCustomerResumeHint()) return;
  const response = await singleSessionRequest('/api/v1/auth/logout', 'POST', 'logout', request);
  if (response.status !== 204 || response.redirected) throw new Error('LOGOUT_UNCONFIRMED');
  clearCustomerResumeHint();
}
