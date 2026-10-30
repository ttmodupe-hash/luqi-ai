/** Two independent rollout gates. Default: no storage reads or listing exposure. */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { BusinessError, businessConnectStore as store } from './services/businessConnectStore';
import { BoundedRateLimiter } from './lib/httpGuard';
import { businessAction, businessId, businessModeration, businessReport, businessSearch, businessWrite } from '../contracts/businessConnect';

export const businessConnect = new Hono<{ Variables: { userId: number } }>();
businessConnect.use('*', async (c,next) => {
  c.header('Cache-Control','no-store'); c.header('Pragma','no-cache');
  c.header('X-Robots-Tag','noindex, nofollow');
  return next();
});
const enabled = () => process.env.LUQI_BUSINESS_CONNECT_ENABLED === 'true';
const publicEnabled = () => enabled() && process.env.LUQI_BUSINESS_CONNECT_PUBLIC_ENABLED === 'true';
businessConnect.get('/status',c => Object.keys(c.req.query()).length ? c.json({code:'INVALID_INPUT'},400) :
  c.json({ enabled:enabled(), publicDirectory:publicEnabled(),mode: enabled() ? (publicEnabled() ? 'public' : 'authenticated_preview') : 'disabled' }));
businessConnect.use('*',async(c,next) => {
  if (!enabled()) return c.json({code:'BUSINESS_CONNECT_DISABLED'},503);
  const publicRead = c.req.method === 'GET' && /\/directory(?:\/[a-f\d-]{36})?\/?$/i.test(c.req.path);
  if (!(publicRead && publicEnabled())) {
    try { c.set('userId',await authenticatePilotUser(c.req.header('authorization'))); }
    catch (e) {
      const unavailable = e instanceof PilotAuthError && e.code === 'AUTH_UNAVAILABLE';
      return c.json({code:unavailable ? 'AUTH_UNAVAILABLE' : 'AUTH_REQUIRED'},unavailable ? 503 : 401);
    }
  }
  const query = new URL(c.req.url).searchParams;
  if ([...new Set(query.keys())].some(k => query.getAll(k).length !== 1) ||
      (!c.req.path.endsWith('/directory') && query.size)) return c.json({code:'INVALID_INPUT'},400);
  if (c.req.method !== 'GET' && c.req.header('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    return c.json({code:'INVALID_INPUT'},400);
  return next();
});
businessConnect.use('*',bodyLimit({maxSize:32*1024,onError:c=>c.json({code:'BODY_TOO_LARGE'},413)}));
const throttle = new BoundedRateLimiter(40,60_000,5000);
businessConnect.use('*',async(c,next) => {
  if (c.req.method !== 'GET' && !throttle.permit(String(c.get('userId')))) return c.json({code:'LIMIT'},429);
  return next();
});
businessConnect.onError((e,c) => {
  if (e instanceof BusinessError) {
    const status = {NOT_FOUND:404,CONFLICT:409,DUPLICATE_REVIEW_REQUIRED:409,LIMIT:429,DENIED:403,CONSENT_REQUIRED:400} as const;
    return c.json({code:e.code},status[e.code]);
  }
  return c.json({code:'BUSINESS_STORAGE_UNAVAILABLE'},503);
});
businessConnect.get('/directory',async c => {
  const parsed = businessSearch.safeParse(c.req.query());
  if (!parsed.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.directory(parsed.data));
});
businessConnect.get('/directory/:id',async c => {
  const id = businessId.safeParse(c.req.param('id'));
  if (!id.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.publicPage(id.data));
});
businessConnect.get('/mine',async c => c.json(await store.mine(c.get('userId'))));
businessConnect.put('/mine/:id',async c => {
  const id = businessId.safeParse(c.req.param('id')), input = businessWrite.safeParse(await c.req.json().catch(()=>null));
  if (!id.success || !input.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.save(c.get('userId'),id.data,input.data),input.data.expectedRevision === 0 ? 201 : 200);
});
for (const action of ['submit','pause','delete'] as const) businessConnect.post('/mine/:id/'+action,async c => {
  const id = businessId.safeParse(c.req.param('id')), input = businessAction.safeParse(await c.req.json().catch(()=>null));
  if (!id.success || !input.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.ownerAction(c.get('userId'),id.data,input.data.expectedRevision,action));
});
businessConnect.get('/mine/:id/history',async c => {
  const id = businessId.safeParse(c.req.param('id'));
  if (!id.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.history(c.get('userId'),id.data));
});
businessConnect.post('/reports',async c => {
  const input = businessReport.safeParse(await c.req.json().catch(()=>null));
  if (!input.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.report(c.get('userId'),input.data),201);
});
businessConnect.get('/moderation/queue',async c => c.json(await store.reviewQueue(c.get('userId'))));
businessConnect.post('/moderation/profiles/:id',async c => {
  const id = businessId.safeParse(c.req.param('id')), input = businessModeration.safeParse(await c.req.json().catch(()=>null));
  if (!id.success || !input.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.moderate(c.get('userId'),id.data,input.data));
});
const confirmation = z.object({confirm:z.literal(true)}).strict();
businessConnect.post('/moderation/reports/:id/resolve',async c => {
  const id = businessId.safeParse(c.req.param('id')), input = confirmation.safeParse(await c.req.json().catch(()=>null));
  if (!id.success || !input.success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.resolveReport(c.get('userId'),id.data));
});
businessConnect.post('/moderation/retention',async c => {
  if (!confirmation.safeParse(await c.req.json().catch(()=>null)).success) return c.json({code:'INVALID_INPUT'},400);
  return c.json(await store.retention(c.get('userId')));
});
businessConnect.all('*',c=>c.json({code:'BUSINESS_ROUTE_NOT_FOUND'},404));
