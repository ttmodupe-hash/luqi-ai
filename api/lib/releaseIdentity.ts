import type { Handler } from 'hono';

// Public source revision only. Never expose authors, deployment IDs, account
// data, flags or environment diagnostics through this route.
export const releaseIdentity: Handler = c => {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
  if (Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_RELEASE_REQUEST' }, 400);
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA;
  if (!commit || !/^[a-f0-9]{40}$/.test(commit)) {
    return c.json({ code: 'RELEASE_IDENTITY_UNAVAILABLE' }, 503);
  }
  return c.json({ format: 'luqi.release.v1', commit });
};
