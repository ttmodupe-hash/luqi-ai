import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { getPersistentMySqlPool } from './queries/connection';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { AuthThrottleError, reservePasswordChangeAttempt } from './services/authThrottle';
import { changeAccountPassword, PasswordChangeError } from './services/passwordChange';

export const accountSecurity = new Hono<{ Variables: { userId: number } }>();
const input = z.object({ currentPassword: z.string().min(1).max(72), newPassword: z.string().min(12).max(72) }).strict();
accountSecurity.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  try { c.set('userId', await authenticatePilotUser(c.req.header('authorization'))); }
  catch (error) {
    const unavailable = error instanceof PilotAuthError && error.code === 'AUTH_UNAVAILABLE';
    return c.json({ code: unavailable ? 'AUTH_UNAVAILABLE' : 'AUTH_REQUIRED' }, unavailable ? 503 : 401);
  }
  return next();
});
accountSecurity.use('*', bodyLimit({ maxSize: 4096,
  onError: c => c.json({ code: 'PASSWORD_BODY_TOO_LARGE' }, 413) }));
accountSecurity.onError((_error, c) => c.json({ code: 'PASSWORD_CHANGE_UNAVAILABLE' }, 503));
accountSecurity.post('/password', async c => {
  if (Object.keys(c.req.query()).length || c.req.header('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return c.json({ code: 'INVALID_INPUT' }, 400);
  }
  const parsed = input.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  try {
    await reservePasswordChangeAttempt(c.get('userId'));
    await changeAccountPassword(getPersistentMySqlPool(), c.get('userId'), c.req.header('authorization')!.slice(7),
      parsed.data.currentPassword, parsed.data.newPassword);
    return c.json({ changed: true, signInRequired: true });
  } catch (error) {
    if (error instanceof AuthThrottleError) {
      c.header('Retry-After', String(error.retryAfter));
      return c.json({ code: error.code }, error.code === 'AUTH_RATE_LIMITED' ? 429 : 503);
    }
    if (error instanceof PasswordChangeError) {
      const status = error.code === 'AUTH_REQUIRED' || error.code === 'CURRENT_PASSWORD_INVALID' ? 401
        : error.code === 'INVALID_INPUT' || error.code === 'PASSWORD_REUSED' ? 400
        : error.code === 'PASSWORD_CHANGE_CONFLICT' ? 409 : 503;
      return c.json({ code: error.code }, status);
    }
    throw error;
  }
});
