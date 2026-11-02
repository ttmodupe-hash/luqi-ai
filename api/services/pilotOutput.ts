/** Accept only finished, text-only provider replies. No I/O, logging or retries. */
export type PilotOutputCode = 'AI_RESPONSE_BLOCKED' | 'AI_REPLY_INCOMPLETE' | 'AI_RESPONSE_INVALID';
export class PilotOutputError extends Error {
  readonly code: PilotOutputCode;
  constructor(code: PilotOutputCode) { super(code); this.name = 'PilotOutputError'; this.code = code; }
}
const invalid = (): never => { throw new PilotOutputError('AI_RESPONSE_INVALID'); };
const blocked = (): never => { throw new PilotOutputError('AI_RESPONSE_BLOCKED'); };
const incomplete = (): never => { throw new PilotOutputError('AI_REPLY_INCOMPLETE'); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function list(value: unknown, max = 32): unknown[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return invalid();
  return value;
}
function safety(value: unknown): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 32) return invalid();
  for (const entry of value) {
    const flag = object(entry).blocked;
    if (flag === true) return blocked();
    if (flag !== undefined && flag !== false) return invalid();
  }
}
function finalText(parts: string[], separator: string): string {
  const text = parts.join(separator).trim();
  if (!text || text.length > 20_000) return invalid();
  return text;
}
const BLOCKED_FINISH = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT',
  'SPII', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT', 'IMAGE_RECITATION', 'MODEL_ARMOR']);

export function readGeminiText(value: unknown): string {
  const response = object(value);
  if (response.promptFeedback !== undefined) {
    const feedback = object(response.promptFeedback);
    if (feedback.blockReason !== undefined && feedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED') return blocked();
    safety(feedback.safetyRatings);
  }
  const candidates = list(response.candidates, 1);
  const candidate = object(candidates[0]);
  safety(candidate.safetyRatings);
  if (typeof candidate.finishReason === 'string' && BLOCKED_FINISH.has(candidate.finishReason)) return blocked();
  if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'CONTINUATION') return incomplete();
  if (candidate.finishReason !== 'STOP') return invalid();
  const content = object(candidate.content);
  if (content.role !== 'model') return invalid();
  const texts: string[] = [];
  for (const value of list(content.parts)) {
    const part = object(value);
    // Never treat tool/media output as ordinary prose, even beside a text field.
    if (Object.keys(part).some(key => !['text', 'thought', 'thoughtSignature'].includes(key))) return invalid();
    if (part.thought !== undefined && typeof part.thought !== 'boolean') return invalid();
    if (part.thought === true) continue;
    if (typeof part.text !== 'string' || part.text.length > 20_000) return invalid();
    texts.push(part.text);
  }
  return finalText(texts, '');
}

export function readOpenAiText(value: unknown): string {
  const response = object(value);
  const detail = response.incomplete_details;
  if (detail !== undefined && detail !== null) {
    if (object(detail).reason === 'content_filter') return blocked();
  }
  if (response.status === 'incomplete') return incomplete();
  if (response.status !== 'completed' || (detail !== undefined && detail !== null) ||
      (response.error !== undefined && response.error !== null)) return invalid();
  const texts: string[] = [];
  for (const value of list(response.output)) {
    const item = object(value);
    // Ignore reasoning metadata; never publish its summaries or hidden content.
    if (item.type === 'reasoning') continue;
    if (item.type !== 'message' || item.role !== 'assistant') return invalid();
    if (item.status === 'incomplete') return incomplete();
    if (item.status !== 'completed') return invalid();
    for (const value of list(item.content)) {
      const part = object(value);
      if (part.type === 'refusal') return blocked();
      if (part.type !== 'output_text' || typeof part.text !== 'string' || part.text.length > 20_000) return invalid();
      texts.push(part.text);
    }
  }
  return finalText(texts, '\n');
}

/** Bound decoded OpenAI JSON; never retain/log a provider body on failure. */
export async function readProviderJson(response: Response): Promise<unknown> {
  const limit = 131_072;
  if (!response.body || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) return invalid();
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      bytes += next.value.byteLength; if (bytes > limit) return invalid();
      chunks.push(next.value);
    }
    const body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch { return invalid(); }
  finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
}
