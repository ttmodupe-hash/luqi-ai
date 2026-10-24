/** The sole paid HTTP entrypoint: authenticate, bound, validate, then reserve. */
import { Hono } from 'hono';
import { buildPilotInput, PilotInputError } from '../src/lib/pilot-input';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { runBudgetedPilotChat } from './services/aiPilotGateway';
import { MAX_INPUT_CHARS, PilotBlocked, assertPilotEnabled } from './services/aiPilotBudget';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';

const question = z.string().trim().min(1).max(MAX_INPUT_CHARS);
const input = z.object({ user_input: question.optional(), prompt: question.optional(),
  language: z.string().trim().min(1).max(50).optional(),
  history: z.array(z.object({ sender: z.enum(['user', 'ai']), text: z.string().max(350) }).strict()).max(4).optional(),
}).strict().refine(value => Boolean(value.user_input) !== Boolean(value.prompt));

export const aiPilot = new Hono<{ Variables: { pilotUserId: number } }>();
aiPilot.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
  return next();
});
aiPilot.onError((error, c) => {
  if (error instanceof PilotInputError) return c.json({ status: 'error', code: error.code,
    message: error.code === 'AI_INPUT_TOO_LARGE'
      ? 'Your complete question, language and history exceed the 6000-character input limit. Shorten them; no provider attempt was started.'
      : 'The question or conversation context is invalid. No provider attempt was started.' }, 400);
  if (error instanceof PilotAuthError) return c.json({ status: 'unavailable', code: error.code,
    message: error.code === 'AUTH_REQUIRED' ? 'Please sign in to use the AI trial.' :
      'Secure account verification is temporarily unavailable.' }, error.code === 'AUTH_REQUIRED' ? 401 : 503);
  if (error instanceof PilotBlocked) {
    const quota = error.reason === 'AI_USER_DAILY_QUOTA_EXHAUSTED';
    const monthly = error.reason === 'AI_PROVIDER_BUDGET_EXHAUSTED';
    return c.json({ status: 'unavailable', code: error.reason,
      message: quota ? 'Daily account attempt limit reached.' : monthly ? 'Monthly provider allowance reached.' :
        'The AI trial is paused or its spending controls are unavailable.' }, quota || monthly ? 429 : 503);
  }
  return c.json({ status: 'unavailable', code: 'AI_PROVIDER_UNAVAILABLE',
    message: 'The AI provider could not return a verified reply.' }, 503);
});
// Reject unauthenticated callers without parsing/retaining their body.
aiPilot.use('*', async (c, next) => {
  assertPilotEnabled();
  c.set('pilotUserId', await authenticatePilotUser(c.req.header('authorization')));
  return next();
});
aiPilot.use('*', bodyLimit({ maxSize: 32 * 1024,
  onError: c => c.json({ status: 'error', code: 'AI_INPUT_TOO_LARGE' }, 413),
}));
aiPilot.post('/', async c => {
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('content-type') ?? '')) {
    return c.json({ status: 'error', code: 'INVALID_INPUT' }, 415);
  }
  const parsed = input.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ status: 'error', code: 'INVALID_INPUT',
    message: 'Provide one question of at most 6000 characters.' }, 400);
  const { user_input, prompt, language, history } = parsed.data;
  // Keep the HTTP boundary truthful even if the gateway implementation changes.
  buildPilotInput((user_input ?? prompt)!, language, history);
  const result = await runBudgetedPilotChat((user_input ?? prompt)!, c.get('pilotUserId'), language, history);
  return c.json({ status: 'success', agent: 'KHORO', provider: result.provider,
    provider_model: result.model, response: result.response });
});
