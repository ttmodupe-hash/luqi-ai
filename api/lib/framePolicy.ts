import type { Context } from 'hono';

// Exact static teaching documents embedded by src/App.tsx. Never permit an
// entire directory, caller-supplied origin, account route or SPA fallback.
export const embeddedLabPaths = [
  '/labs/biology_lab.html',
  '/labs/chemistry_lab.html',
  '/labs/algebra_lab.html',
  '/labs/geometry_lab.html',
] as const;
const labs = new Set<string>(embeddedLabPaths);

export function framePolicy(path: string, method: string, status: number, contentType: string) {
  const embed = labs.has(path) && (method === 'GET' || method === 'HEAD') &&
    status === 200 && /^text\/html(?:;|$)/i.test(contentType.trim());
  return {
    xFrameOptions: embed ? 'SAMEORIGIN' : 'DENY',
    contentSecurityPolicy: `frame-ancestors '${embed ? 'self' : 'none'}'`,
  };
}

/** Called after downstream middleware, including the old global DENY header. */
export function applyResponseFraming(c: Context): void {
  const policy = framePolicy(c.req.path, c.req.method, c.res.status,
    c.res.headers.get('Content-Type') || '');
  c.header('X-Frame-Options', policy.xFrameOptions);
  // Multiple CSP policies intersect. Preserve existing script/resource rules
  // and any stricter framing policy rather than replacing them.
  c.header('Content-Security-Policy', policy.contentSecurityPolicy, { append: true });
}
