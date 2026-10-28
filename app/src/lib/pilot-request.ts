/** Bounded AI-trial transport. A timeout cannot undo or refund a provider attempt. */
export const MAX_PILOT_RESPONSE_BYTES = 65_536;
export const PILOT_READINESS_TIMEOUT_MS = 10_000;
export const PILOT_REPLY_TIMEOUT_MS = 45_000;
type PilotPath = '/v1/readiness' | '/api/v1/luqi-core' | '/api/v1/visual-tutor' | '/api/v1/spatial-vision';
type PilotJsonResult = { ok: boolean; status: number; body: unknown };

const failureStatuses = {
  AI_DISABLED: [503], BILLING_NOT_APPROVED: [503], AI_BUDGET_STORE_UNAVAILABLE: [503],
  AI_PROVIDER_BUDGET_EXHAUSTED: [429], AI_USER_DAILY_QUOTA_EXHAUSTED: [429],
  AI_PROVIDER_UNAVAILABLE: [503], AI_KEYS_NOT_CONFIGURED: [503], LOCAL_ONLY: [422], AI_RESPONSE_BLOCKED: [422],
  AI_REPLY_INCOMPLETE: [502], AI_RESPONSE_INVALID: [502],
  AI_INPUT_TOO_LARGE: [400, 413], INVALID_INPUT: [400, 415],
} as const;

/** Unknown/mismatched proxy failures must not masquerade as pre-spend rejection. */
export function pilotFailureCode(status: number, body: unknown): string {
  if (!body || typeof body !== 'object' || !Object.hasOwn(body, 'code')) return 'RESPONSE_UNCONFIRMED';
  const code = (body as { code?: unknown }).code;
  if (typeof code !== 'string' || !Object.hasOwn(failureStatuses, code)) return 'RESPONSE_UNCONFIRMED';
  const statuses: readonly number[] = failureStatuses[code as keyof typeof failureStatuses];
  return statuses.includes(status) ? code : 'RESPONSE_UNCONFIRMED';
}

export async function requestPilotJson(
  request: typeof fetch, path: PilotPath, init: RequestInit,
): Promise<PilotJsonResult> {
  if (path !== '/v1/readiness' && path !== '/api/v1/luqi-core' && path !== '/api/v1/visual-tutor' && path !== '/api/v1/spatial-vision') throw new Error('Invalid pilot request');
  const parent = init.signal;
  const aborted = () => new DOMException('AI trial request interrupted', 'AbortError');
  if (parent?.aborted) throw aborted();
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectDeadline!: (reason: Error) => void;
  const cancelReader = () => { if (reader) void reader.cancel().catch(() => {}); };
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const abort = () => {
    controller.abort(); cancelReader(); rejectDeadline(aborted());
  };
  parent?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, path === '/v1/readiness' ? PILOT_READINESS_TIMEOUT_MS : PILOT_REPLY_TIMEOUT_MS);
  const operation = async (): Promise<PilotJsonResult> => {
    const response = await request(path, { ...init,
      method: path === '/v1/readiness' ? 'GET' : 'POST',
      signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
    });
    const discard = () => { void response.body?.cancel().catch(() => {}); };
    if (controller.signal.aborted) { discard(); throw aborted(); }
    if (response.redirected) { discard(); throw new Error('Invalid pilot response'); }
    // Authentication denial needs no body, which may contain private diagnostics.
    if (response.status === 401) { discard(); return { ok: false, status: 401, body: null }; }
    const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    const length = response.headers.get('Content-Length');
    if (type !== 'application/json' || !response.body ||
        (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) ||
          Number(length) > MAX_PILOT_RESPONSE_BYTES))) {
      discard(); throw new Error('Invalid pilot response');
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
        if (bytes > MAX_PILOT_RESPONSE_BYTES) throw new Error('Invalid pilot response');
        chunks.push(next.value);
      }
      const data = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
      try {
        return { ok: response.ok, status: response.status,
          body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)) };
      } catch { throw new Error('Invalid pilot response'); }
    } finally {
      // A broken stream's cancel promise must never keep the caller locked.
      cancelReader(); reader.releaseLock(); reader = undefined;
    }
  };
  try { return await Promise.race([operation(), deadline]); }
  finally { clearTimeout(timer); parent?.removeEventListener('abort', abort); }
}
