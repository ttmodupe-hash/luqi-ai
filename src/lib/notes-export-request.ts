/** A complete-notes read only: bounded I/O, no retry, no persistent browser storage. */
export const MAX_NOTES_DOWNLOAD_BYTES = 32 * 1024 * 1024;
export const NOTES_EXPORT_TIMEOUT_MS = 30_000;
type NotesExportResponse = { ok: true; status: number; body: unknown } |
  { ok: false; status: number };

export async function requestNotesExport(
  request: typeof fetch, token: string, signal?: AbortSignal,
): Promise<NotesExportResponse> {
  const interrupted = () => new DOMException('Export cancelled', 'AbortError');
  if (signal?.aborted) throw interrupted();
  if (!token || token.length > 4096) throw new Error('Invalid notes export request');
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancelReader = () => { if (reader) void reader.cancel().catch(() => {}); };
  let rejectDeadline!: (reason: Error) => void;
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const abort = () => { controller.abort(); cancelReader(); rejectDeadline(interrupted()); };
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, NOTES_EXPORT_TIMEOUT_MS);
  const invalid = new Error('Invalid notes export');
  const oversized = new Error('Notes export exceeds the download limit');
  const operation = async (): Promise<NotesExportResponse> => {
    const response = await request('/api/v1/companion/conversations/export', {
      method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const discard = () => { void response.body?.cancel().catch(() => {}); };
    if (controller.signal.aborted) { discard(); throw interrupted(); }
    if (response.redirected) { discard(); throw invalid; }
    if (!response.ok) {
      // Preserve status for sign-out/limit advice; never parse private diagnostics.
      discard(); return { ok: false, status: response.status };
    }
    const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    const length = response.headers.get('Content-Length');
    if (type !== 'application/json' || !response.body ||
        (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length))))) {
      discard(); throw invalid;
    }
    if (length !== null && Number(length) > MAX_NOTES_DOWNLOAD_BYTES) { discard(); throw oversized; }
    reader = response.body.getReader();
    // A growing byte buffer avoids retaining millions of tiny chunk objects.
    let data = new Uint8Array(65_536), bytes = 0;
    try {
      for (;;) {
        if (controller.signal.aborted) throw interrupted();
        const next = await reader.read();
        if (controller.signal.aborted) throw interrupted();
        if (next.done) break;
        const required = bytes + next.value.byteLength;
        if (required > MAX_NOTES_DOWNLOAD_BYTES) throw oversized;
        if (required > data.byteLength) {
          const expanded = new Uint8Array(Math.min(MAX_NOTES_DOWNLOAD_BYTES, Math.max(required, data.byteLength * 2)));
          expanded.set(data.subarray(0, bytes)); data = expanded;
        }
        data.set(next.value, bytes); bytes = required;
      }
      try {
        return { ok: true, status: response.status,
          body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data.subarray(0, bytes))) };
      } catch { throw invalid; }
    } finally {
      // Do not await a broken underlying source's cancellation promise.
      cancelReader(); reader.releaseLock(); reader = undefined;
    }
  };
  try { return await Promise.race([operation(), deadline]); }
  catch (error) {
    if (controller.signal.aborted) throw interrupted();
    if (error === invalid || error === oversized) throw error;
    throw new Error('Notes export request failed');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
