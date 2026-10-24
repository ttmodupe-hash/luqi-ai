import { z } from 'zod';
import { buildPilotInput, PilotInputError } from './pilot-input';
import { requestPilotJson, pilotFailureCode } from './pilot-request';

const reply = z.object({ status: z.literal('success'), response: z.string().trim().min(1).max(20_000),
  provider: z.enum(['gemini', 'openai']), provider_model: z.string().min(1).max(100) });
export type PilotReply = z.infer<typeof reply>;
export class PilotChatError extends Error {
  constructor(public code: string) { super('AI trial request failed'); }
}

export async function pilotAvailability(signal: AbortSignal, request: typeof fetch = fetch): Promise<boolean> {
  const response = await requestPilotJson(request, '/v1/readiness', { method: 'GET', signal });
  const body = response.body as { checks?: { persistence?: string; ai_pilot?: string } };
  return response.status === 200 && body?.checks?.persistence === 'connected' && body?.checks?.ai_pilot === 'configured_not_verified';
}

/** Caller cancellation plus an independent deadline; never retry a paid POST. */
export async function askPilot(token: string, prompt: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<PilotReply> {
  const question = prompt.trim();
  if (!token || token.length > 4096 || !question || question.length > 6000) throw new PilotChatError('INVALID_INPUT');
  try {
    // Same normalization and complete input limit as the server and UI counter.
    buildPilotInput(question);
    const response = await requestPilotJson(request, '/api/v1/luqi-core', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // No private notebook, account email, saved history or automatic context.
      body: JSON.stringify({ user_input: question }),
    });
    if (response.status === 401) throw new PilotChatError('AUTH_REQUIRED');
    if (!response.ok) throw new PilotChatError(pilotFailureCode(response.status, response.body));
    return reply.parse(response.body);
  } catch (error) {
    if (error instanceof PilotInputError) throw new PilotChatError(error.code);
    if (error instanceof PilotChatError) throw error;
    // Do not turn an ambiguous network failure into a second paid attempt.
    throw new PilotChatError('RESPONSE_UNCONFIRMED');
  }
}
