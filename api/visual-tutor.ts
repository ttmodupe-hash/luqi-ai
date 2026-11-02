import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { PilotInputError } from '../src/lib/pilot-input';
import { assertPilotEnabled, checkPilotGatewayReadiness, PilotBlocked } from './services/aiPilotBudget';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { PilotOutputError } from './services/pilotOutput';
import { MAX_VISUAL_BYTES, runVisualTutor, validateVisualImage } from './services/visualTutor';

const input = z.object({ question: z.string().trim().min(1).max(2000),
  language: z.string().trim().min(1).max(50).optional(),
  consent: z.literal(true),
  image: z.object({ mimeType: z.literal('image/jpeg'),
    data: z.string().min(1).max(Math.ceil(MAX_VISUAL_BYTES / 3) * 4) }).strict(),
}).strict();

export const visualTutor = new Hono<{ Variables: { pilotUserId: number } }>();
visualTutor.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  return next();
});
visualTutor.onError((error, c) => {
  if (error instanceof PilotAuthError) return c.json({ status: 'unavailable', code: error.code },
    error.code === 'AUTH_REQUIRED' ? 401 : 503);
  if (error instanceof PilotBlocked) return c.json({ status: 'unavailable', code: error.reason },
    error.reason === 'AI_USER_DAILY_QUOTA_EXHAUSTED' || error.reason === 'AI_PROVIDER_BUDGET_EXHAUSTED' ? 429 : 503);
  if (error instanceof PilotInputError) return c.json({ status: 'error', code: 'INVALID_INPUT' }, 400);
  if (error instanceof PilotOutputError) return c.json({ status: 'unavailable', code: error.code },
    error.code === 'AI_RESPONSE_BLOCKED' ? 422 : 502);
  // SDK errors may contain credentials or request content. Never echo/log them.
  return c.json({ status: 'unavailable', code: 'AI_PROVIDER_UNAVAILABLE',
    message: 'The image reply could not be confirmed. An attempt may count toward your allowance. No automatic retry was made.' }, 503);
});
visualTutor.get('/availability', async c => {
  const ready = await checkPilotGatewayReadiness();
  return c.json({ available: ready === 'configured_not_verified' && !!process.env.LUQI_PILOT_GEMINI_API_KEY,
    note: 'Configuration only; visual accuracy and live inference are evaluated separately.' });
});
visualTutor.use('*', async (c, next) => {
  assertPilotEnabled();
  c.set('pilotUserId', await authenticatePilotUser(c.req.header('authorization')));
  return next();
});
visualTutor.use('*', bodyLimit({ maxSize: 512 * 1024,
  onError: c => c.json({ status: 'error', code: 'AI_INPUT_TOO_LARGE' }, 413) }));
visualTutor.post('/', async c => {
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('content-type') ?? '')) {
    return c.json({ status: 'error', code: 'INVALID_INPUT' }, 415);
  }
  const parsed = input.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ status: 'error', code: 'INVALID_INPUT' }, 400);
  const { question, image, language } = parsed.data;
  validateVisualImage(image.data);
  const result = await runVisualTutor(question, image.data, c.get('pilotUserId'), language);
  return c.json({ status: 'success', response: result.response,
    provider: result.provider, provider_model: result.model });
});
