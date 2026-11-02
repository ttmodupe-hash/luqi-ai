/** Same-origin, explicit password changes only. Credentials never enter storage. */
export class PasswordChangeRequestError extends Error {
  constructor(public readonly code: 'CURRENT_PASSWORD_INVALID' | 'INVALID_INPUT' | 'PASSWORD_REUSED' |
    'AUTH_REQUIRED' | 'AUTH_RATE_LIMITED' | 'PASSWORD_CHANGE_CONFLICT' | 'UNCONFIRMED',
    public readonly retryAfter = 30) { super('Password change request failed'); }
}

export async function changePassword(token: string, currentPassword: string, newPassword: string,
  signal?: AbortSignal, request: typeof fetch = fetch): Promise<void> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 20_000);
  try {
    const response = await request('/api/v1/account/password', {
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.body || response.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json' ||
        Number(response.headers.get('Content-Length') ?? 0) > 4096) throw new Error('Invalid response');
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    const cancel = () => { void reader.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    let bytes = 0;
    try {
      for (;;) {
        if (controller.signal.aborted) throw new Error('Cancelled');
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 4096) throw new Error('Response too large');
        chunks.push(next.value);
      }
    } finally {
      controller.signal.removeEventListener('abort', cancel);
      await reader.cancel().catch(() => {}); reader.releaseLock();
    }
    if (controller.signal.aborted) throw new Error('Cancelled');
    const body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
    if (response.status === 200 && data?.changed === true && data?.signInRequired === true &&
        Object.keys(data).length === 2) return;
    const accepted: Record<number, readonly string[]> = {
      400: ['INVALID_INPUT', 'PASSWORD_REUSED'], 401: ['AUTH_REQUIRED', 'CURRENT_PASSWORD_INVALID'],
      409: ['PASSWORD_CHANGE_CONFLICT'], 429: ['AUTH_RATE_LIMITED'],
    };
    if (accepted[response.status]?.includes(data?.code)) {
      const raw = response.headers.get('Retry-After') ?? '';
      const retryAfter = /^\d{1,4}$/.test(raw) ? Math.min(3600, Math.max(1, Number(raw))) : 30;
      throw new PasswordChangeRequestError(data.code, retryAfter);
    }
    throw new Error('Unconfirmed response');
  } catch (error) {
    if (error instanceof PasswordChangeRequestError) throw error;
    // Never retry a write, disclose a raw response or assume it did not commit.
    throw new PasswordChangeRequestError('UNCONFIRMED');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
