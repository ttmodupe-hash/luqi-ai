/** Global ingress ceiling. Route-specific limits may be stricter.
 * Missing Content-Length does not mean an empty body (for example, chunked
 * HTTP/1.1 or HTTP/2). Delegate byte counting to Hono instead of skipping it.
 */
import type { MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';

export const MAX_REQUEST_BODY_BYTES = 50 * 1024 * 1024;

export function createRequestBodyGuard(maxSize = MAX_REQUEST_BODY_BYTES): MiddlewareHandler {
  if (!Number.isSafeInteger(maxSize) || maxSize < 1 || maxSize > MAX_REQUEST_BODY_BYTES) {
    throw new Error('Invalid request body limit');
  }
  const limit = bodyLimit({
    maxSize,
    onError: c => {
      c.header('Cache-Control', 'no-store');
      c.header('Pragma', 'no-cache');
      return c.json({ success: false, code: 'REQUEST_BODY_TOO_LARGE',
        error: 'Request body is too large' }, 413);
    },
  });
  return async (c, next) => {
    if (c.req.method === 'GET' || c.req.method === 'HEAD') return next();
    return limit(c, next);
  };
}
