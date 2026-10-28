import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { spatialAnalysis, SPATIAL_MODES } from '../src/lib/spatial-vision-contract';
import { PilotInputError } from '../src/lib/pilot-input';
import { assertPilotEnabled, checkPilotGatewayReadiness, PilotBlocked } from './services/aiPilotBudget';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { PilotOutputError } from './services/pilotOutput';
import { MAX_VISUAL_BYTES, validateVisualImage } from './services/visualTutor';
import { runSpatialVision } from './services/spatialVision';

const input = z.object({
  question: z.string().trim().min(1).max(500),
  language: z.string().trim().min(1).max(50),
  mode: z.enum(SPATIAL_MODES),
  provider: z.enum(['gemini', 'openai']),
  consent: z.literal(true),
  // Human confirmation, not automatic OCR verification or a redaction claim.
  serialCropConfirmed: z.boolean().optional(),
  image: z.object({ mimeType: z.literal('image/jpeg'),
    data: z.string().min(1).max(Math.ceil(MAX_VISUAL_BYTES / 3) * 4) }).strict(),
}).strict().refine(value => value.mode !== 'SERIAL_AUDIT' || value.serialCropConfirmed === true,
  'Serial-only mode requires explicit confirmation of a manually reviewed crop');

export const spatialVision = new Hono<{ Variables: { pilotUserId: number } }>();
spatialVision.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
  c.header('X-Content-Type-Options', 'nosniff');
  return next();
});
spatialVision.onError((error, c) => {
  if (error instanceof PilotAuthError) return c.json({ status: 'unavailable', code: error.code },
    error.code === 'AUTH_REQUIRED' ? 401 : 503);
  if (error instanceof PilotBlocked) return c.json({ status: 'unavailable', code: error.reason },
    ['AI_PROVIDER_BUDGET_EXHAUSTED', 'AI_USER_DAILY_QUOTA_EXHAUSTED'].includes(error.reason) ? 429 : 503);
  if (error instanceof PilotInputError) return c.json({ status: 'error', code: 'INVALID_INPUT' }, 400);
  if (error instanceof PilotOutputError) return c.json({ status: 'unavailable', code: error.code },
    error.code === 'AI_RESPONSE_BLOCKED' ? 422 : 502);
  // Never log provider errors, image bytes, identifiers or keys.
  return c.json({ status: 'unavailable', code: 'AI_PROVIDER_UNAVAILABLE',
    message: 'A complete image analysis could not be verified. An attempt may count toward your allowance. No automatic retry occurred.' }, 503);
});

spatialVision.get('/availability', async c => {
  const ready = await checkPilotGatewayReadiness();
  const configured = ready === 'configured_not_verified';
  return c.json({ configured, providers: {
    gemini: configured && !!process.env.LUQI_PILOT_GEMINI_API_KEY,
    openai: configured && !!process.env.LUQI_PILOT_OPENAI_API_KEY,
  }, note: 'Configuration only, not a live vision-response test or provider invoice.' });
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
  const { question, language, image, mode, provider } = parsed.data;
  validateVisualImage(image.data);
  const result = await runSpatialVision(question, image.data, c.get('pilotUserId'), mode, language, provider);
  // Defence in depth: return only the bounded validated public schema.
  return c.json({ status: 'success', analysis: spatialAnalysis.parse(result.analysis),
    provider: result.provider, provider_model: result.model });
});
