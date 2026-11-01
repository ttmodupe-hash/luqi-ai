export type PracticeMode = 'user' | 'privileged' | 'config' | 'config-if' | 'config-router';
const prompts: Record<PracticeMode, string> = { user: 'Router>', privileged: 'Router#', config: 'Router(config)#', 'config-if': 'Router(config-if)#', 'config-router': 'Router(config-router)#' };
export type PracticeReply = { output: string; nextMode: PracticeMode; prompt: string };
export function parsePracticeReply(value: unknown, command: string): PracticeReply | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const x = value as Record<string, unknown>;
  if (typeof x.output !== 'string' || x.output.length > 16000 || typeof x.nextMode !== 'string' ||
      !Object.prototype.hasOwnProperty.call(prompts, x.nextMode) || x.prompt !== prompts[x.nextMode as PracticeMode] ||
      x.executedCommand !== command) return null;
  return { output: x.output, nextMode: x.nextMode as PracticeMode, prompt: String(x.prompt) };
}
export async function evaluatePracticeCommand(command: string, mode: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<PracticeReply> {
  const text = command.trim();
  if (!text || text.length > 200 || !Object.prototype.hasOwnProperty.call(prompts, mode)) throw new Error('Invalid practice command.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetcher('/api/v1/cert-academy/cli-eval', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: text, mode, prompt: prompts[mode as PracticeMode] }) });
    if (!response.ok) throw new Error('Practice service returned HTTP ' + response.status + '.');
    const bytes = Number(response.headers.get('content-length'));
    if (Number.isFinite(bytes) && bytes > 24000) throw new Error('Practice reply was too large.');
    const raw = await response.text();
    if (raw.length > 24000 || controller.signal.aborted) throw new Error('Practice reply was not confirmed.');
    const result = parsePracticeReply(JSON.parse(raw), text);
    if (!result) throw new Error('Practice reply did not match the expected format.');
    return result;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
