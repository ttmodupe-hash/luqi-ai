/** Owner-authenticated queue API. Does not start workers or enable providers. */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { omegaId, omegaSubmission } from './services/omegaTaskContract';
import { OmegaTaskError, omegaTaskStore } from './services/omegaTaskStore';

export const omegaTasks = new Hono<{ Variables: { userId: number } }>();
omegaTasks.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  try { c.set('userId', await authenticatePilotUser(c.req.header('authorization'))); }
  catch (error) {
    const unavailable = error instanceof PilotAuthError && error.code === 'AUTH_UNAVAILABLE';
    return c.json({ code: unavailable ? 'AUTH_UNAVAILABLE' : 'AUTH_REQUIRED' }, unavailable ? 503 : 401);
  }
  return next();
});
omegaTasks.use('*', bodyLimit({ maxSize: 16384, onError: c => c.json({ code: 'INVALID_INPUT' }, 413) }));
omegaTasks.onError((error, c) => {
  if (error instanceof OmegaTaskError) {
    const status = { OMEGA_TASK_NOT_FOUND: 404, OMEGA_TASK_CONFLICT: 409,
      OMEGA_TASK_LIMIT: 429, AUTH_REQUIRED: 401 } as const;
    return c.json({ code: error.code }, status[error.code]);
  }
  // Storage errors/ambiguous commits are not confirmations of a task outcome.
  return c.json({ code: 'OMEGA_STORAGE_UNAVAILABLE' }, 503);
});
omegaTasks.get('/status', async c => {
  if (Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  if (process.env.LUQI_OMEGA_WEB_ENABLED !== 'true') return c.json({ intake: 'disabled',
    execution: 'disabled', workerVerified: false, handlers: [] });
  return c.json(await omegaTaskStore.status());
});
omegaTasks.use('*', async (c, next) => {
  if (process.env.LUQI_OMEGA_WEB_ENABLED !== 'true') return c.json({ code: 'OMEGA_WEB_DISABLED' }, 503);
  return next();
});
omegaTasks.post('/', async c => {
  const input = omegaSubmission.safeParse(await c.req.json().catch(() => null));
  if (!input.success || Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  const result = await omegaTaskStore.submit(c.get('userId'), input.data);
  return c.json(result, result.created ? 201 : 200);
});
omegaTasks.get('/', async c => {
  const page = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20),
    before: omegaId.optional() }).strict().safeParse(c.req.query());
  if (!page.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  return c.json({ tasks: await omegaTaskStore.list(c.get('userId'), page.data.limit, page.data.before) });
});
omegaTasks.get('/:id', async c => {
  const id = omegaId.safeParse(c.req.param('id'));
  if (!id.success || Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  return c.json({ task: await omegaTaskStore.get(c.get('userId'), id.data) });
});
omegaTasks.post('/:id/cancel', async c => {
  const id = omegaId.safeParse(c.req.param('id'));
  const body = z.object({ confirm: z.literal(true) }).strict().safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success || Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  return c.json({ task: await omegaTaskStore.cancel(c.get('userId'), id.data) });
});
// There is intentionally no run, approve, recover, arbitrary handler or admin API.
omegaTasks.all('*', c => c.json({ code: 'OMEGA_ROUTE_NOT_FOUND' }, 404));
