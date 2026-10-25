/** Disabled-by-default project sync. Auth precedes feature/status disclosure. */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { ProjectVaultError, projectVaultStore } from './services/projectVaultStore';
import { vaultId, vaultWrite, vaultRemove } from './services/projectVaultContract';

export const privateProjectVault = new Hono<{ Variables: { userId: number } }>();
privateProjectVault.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  try { c.set('userId', await authenticatePilotUser(c.req.header('authorization'))); }
  catch (error) {
    const unavailable = error instanceof PilotAuthError && error.code === 'AUTH_UNAVAILABLE';
    return c.json({ code: unavailable ? 'AUTH_UNAVAILABLE' : 'AUTH_REQUIRED' }, unavailable ? 503 : 401);
  }
  return next();
});
privateProjectVault.use('*', bodyLimit({ maxSize: 40 * 1024, onError: c => c.json({ code: 'PROJECT_BODY_TOO_LARGE' }, 413) }));
privateProjectVault.onError((error, c) => {
  if (error instanceof ProjectVaultError) {
    const status = { PROJECT_NOT_FOUND: 404, PROJECT_CONFLICT: 409,
      PROJECT_LIMIT: 429, AUTH_REQUIRED: 401 } as const;
    return c.json({ code: error.code }, status[error.code]);
  }
  return c.json({ code: 'PROJECT_STORAGE_UNAVAILABLE' }, 503);
});
privateProjectVault.get('/status', async c => {
  if (Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  if (process.env.LUQI_PROJECT_VAULT_ENABLED !== 'true')
    return c.json({ availability: 'disabled', syncing: false, subscriptionActive: false });
  // Configuration is not proof of an active subscription or successful sync.
  return c.json({ ...await projectVaultStore.status(), subscriptionActive: false });
});
privateProjectVault.use('*', async (c, next) => {
  if (process.env.LUQI_PROJECT_VAULT_ENABLED !== 'true')
    return c.json({ code: 'PROJECT_VAULT_DISABLED' }, 503);
  return next();
});
const noQuery = (c: { req: { query: () => Record<string,string> }}) => Object.keys(c.req.query()).length === 0;
const jsonContent = (header?: string) => header?.split(';')[0].trim().toLowerCase() === 'application/json';
privateProjectVault.get('/', async c => {
  if (!noQuery(c)) return c.json({ code: 'INVALID_INPUT' }, 400);
  return c.json(await projectVaultStore.list(c.get('userId')));
});
privateProjectVault.get('/:id', async c => {
  const id = vaultId.safeParse(c.req.param('id'));
  if (!id.success || !noQuery(c)) return c.json({ code: 'INVALID_INPUT' }, 400);
  return c.json(await projectVaultStore.get(c.get('userId'), id.data));
});
privateProjectVault.put('/:id', async c => {
  const id = vaultId.safeParse(c.req.param('id'));
  if (!id.success || !noQuery(c) || !jsonContent(c.req.header('content-type')))
    return c.json({ code: 'INVALID_INPUT' }, 400);
  const submitted = vaultWrite.safeParse(await c.req.json().catch(() => null));
  if (!submitted.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const result = await projectVaultStore.save(c.get('userId'), id.data, submitted.data);
  return c.json(result, result.created ? 201 : 200);
});
privateProjectVault.post('/:id/remove', async c => {
  const id = vaultId.safeParse(c.req.param('id'));
  if (!id.success || !noQuery(c) || !jsonContent(c.req.header('content-type')))
    return c.json({ code: 'INVALID_INPUT' }, 400);
  const parsed = vaultRemove.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const result = await projectVaultStore.remove(c.get('userId'), id.data, parsed.data.expectedRevision);
  if (!result.removed || result.id !== id.data) throw Error('UNCONFIRMED_REMOVAL');
  return c.json(result);
});
// No billing, entitlement, admin, bulk erase, share, transfer or secret-recovery API.
privateProjectVault.all('*', c => c.json({ code: 'PROJECT_ROUTE_NOT_FOUND' }, 404));
