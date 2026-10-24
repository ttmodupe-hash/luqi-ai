import { z } from 'zod';
import { buildPilotInput, PilotInputError } from './pilot-input';

const reply = z.object({ status: z.literal('success'), response: z.string().trim().min(1).max(20_000),
  provider: z.enum(['gemini', 'openai']), provider_model: z.string().min(1).max(100) });
export type PilotReply = z.infer<typeof reply>;
export class PilotChatError extends Error {
  constructor(public code: string) { super('AI trial request failed'); }
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('Missing response');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      bytes += next.value.byteLength; if (bytes > 65_536) throw new Error('Oversized response');
      chunks.push(next.value);
    }
    const body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(body));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function pilotAvailability(signal: AbortSignal, request: typeof fetch = fetch): Promise<boolean> {
  const response = await request('/v1/readiness', { method: 'GET', signal, credentials: 'omit', cache: 'no-store', redirect: 'error' });
  const body = await boundedJson(response) as { checks?: { persistence?: string; ai_pilot?: string } };
  return response.status === 200 && body?.checks?.persistence === 'connected' && body?.checks?.ai_pilot === 'configured_not_verified';
}

/** A caller supplies a bounded, cancelable signal; never retry a paid POST. */
export async function askPilot(token: string, prompt: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<PilotReply> {
  const question = prompt.trim();
  if (!token || token.length > 4096 || !question || question.length > 6000) throw new PilotChatError('INVALID_INPUT');
  try {
    // Same normalization and complete input limit as the server and UI counter.
    buildPilotInput(question);
    const response = await request('/api/v1/luqi-core', {
      method: 'POST', signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // No private notebook, account email, saved history or automatic context.
      body: JSON.stringify({ user_input: question }),
    });
    if (response.status === 401) throw new PilotChatError('AUTH_REQUIRED');
    const body = await boundedJson(response);
    if (!response.ok) {
      const known = z.object({ code: z.enum(['AI_DISABLED', 'BILLING_NOT_APPROVED', 'AI_BUDGET_STORE_UNAVAILABLE',
        'AI_PROVIDER_BUDGET_EXHAUSTED', 'AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_PROVIDER_UNAVAILABLE', 'AI_INPUT_TOO_LARGE', 'INVALID_INPUT']) }).safeParse(body);
      throw new PilotChatError(known.success ? known.data.code : 'AI_UNAVAILABLE');
    }
    return reply.parse(body);
  } catch (error) {
    if (error instanceof PilotInputError) throw new PilotChatError(error.code);
    if (error instanceof PilotChatError) throw error;
    // Do not turn an ambiguous network failure into a second paid attempt.
    throw new PilotChatError('RESPONSE_UNCONFIRMED');
  }
}
