/** Authenticated and bounded visual-grounding entrypoint. Never accepts keys,
 * URLs, arbitrary model IDs, serial-audit uploads or account IDs.
 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { spatialMode, spatialProvider } from '../src/lib/spatial-vision-contract';
import { PilotInputError } from '../src/lib/pilot-input';
import { PilotUnavailable } from './services/aiPilotGateway';
import { assertPilotEnabled, PilotBlocked } from './services/aiPilotBudget';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { PilotOutputError } from './services/pilotOutput';
import { MAX_VISUAL_BYTES, validateVisualImage } from './services/visualTutor';
import { runSpatialVision } from './services/spatialVision';

const input = z.object({
  mode: spatialMode,
  provider: spatialProvider,
  language: z.string().trim().min(1).max(50),
  consent: z.literal(true),
  image: z.object({
    mimeType: z.literal('image/jpeg'),
    data: z.string().min(1).max(Math.ceil(MAX_VISUAL_BYTES / 3) * 4),
  }).strict(),
}).strict();

export const spatialVision = new Hono<{ Variables: { pilotUserId: number } }>();
spatialVision.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  return next();
});
spatialVision.onError((error, c) => {
  if (error instanceof PilotAuthError) return c.json({ status: 'unavailable', code: error.code },
    error.code === 'AUTH_REQUIRED' ? 401 : 503);
  if (error instanceof PilotBlocked) return c.json({ status: 'unavailable', code: error.reason },
    error.reason === 'AI_USER_DAILY_QUOTA_EXHAUSTED' || error.reason === 'AI_PROVIDER_BUDGET_EXHAUSTED' ? 429 : 503);
  if (error instanceof PilotInputError) return c.json({ status: 'error', code: 'INVALID_INPUT' }, 400);
  if (error instanceof PilotOutputError) return c.json({ status: 'unavailable', code: error.code },
    error.code === 'AI_RESPONSE_BLOCKED' ? 422 : 502);
  if (error instanceof PilotUnavailable && error.code === 'AI_KEYS_NOT_CONFIGURED') {
    return c.json({ status: 'unavailable', code: 'AI_KEYS_NOT_CONFIGURED' }, 503);
  }
  // Never echo provider errors, private images or secrets, including in logs.
  return c.json({ status: 'unavailable', code: 'AI_PROVIDER_UNAVAILABLE',
    message: 'The image analysis was not confirmed. The attempt may count; no automatic retry occurred.' }, 503);
});
spatialVision.use('*', async (c, next) => {
  assertPilotEnabled();
  c.set('pilotUserId', await authenticatePilotUser(c.req.header('authorization')));
  return next();
});
spatialVision.use('*', bodyLimit({ maxSize: 512 * 1024,
  onError: c => c.json({ status: 'error', code: 'AI_INPUT_TOO_LARGE' }, 413) }));
spatialVision.post('/', async c => {
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('content-type') ?? '')) {
    return c.json({ status: 'error', code: 'INVALID_INPUT' }, 415);
  }
  const parsed = input.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ status: 'error', code: 'INVALID_INPUT' }, 400);
  const { mode, provider, language, image } = parsed.data;
  // IMEI/serial imagery is never sent to an AI provider in this pilot.
  if (mode === 'SERIAL_AUDIT') return c.json({ status: 'unavailable', code: 'LOCAL_ONLY' }, 422);
  validateVisualImage(image.data);
  const result = await runSpatialVision(mode, image.data, c.get('pilotUserId'), language, provider);
  return c.json({ status: 'success', analysis: result.analysis,
    provider: result.provider, provider_model: result.model });
});
