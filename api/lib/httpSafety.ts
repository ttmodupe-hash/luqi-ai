/** Shared HTTP safety rules. Never log exception text, URLs or request bodies. */
import type { ErrorHandler, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { routePath } from 'hono/route';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { logger } from './logger';
import { applyResponseFraming } from './framePolicy';
import { createRequestBodyGuard } from './requestBodyGuard';

export const privateResponsePolicy: MiddlewareHandler = async (c, next) => {
  await next();
  applyResponseFraming(c);
  if (/^\/(?:api|auth|v1|trpc)(?:\/|$)/.test(c.req.path) || c.req.path === '/health') {
    c.header('Cache-Control', 'no-store');
    c.header('Pragma', 'no-cache');
  }
};

// boot.ts installs this shared request boundary after the IP throttle and before
// routes. Keep the exported name for compatibility, but enforce the body ceiling
// here as well: its later legacy guard skips requests without Content-Length.
const requestBodyGuard = createRequestBodyGuard();
export const requestTelemetry: MiddlewareHandler = async (c, next) => {
  const requestId = randomUUID();
  const start = Date.now();
  c.header('X-Request-Id', requestId);
  const response = await requestBodyGuard(c, next);
  logger.info({ requestId, method: c.req.method,
    // The registered pattern contains no caller's parameter/query values.
    path: routePath(c, -1) || 'unmatched',
    status: response instanceof Response ? response.status : c.res.status,
    durationMs: Date.now() - start }, 'request');
  return response;
};

export const redactedHttpError: ErrorHandler = (error, c) => {
  const requestId = c.res.headers.get('X-Request-Id') || randomUUID();
  const validation = error instanceof ZodError;
  const aborted = error.name === 'AbortError';
  const status = validation ? 400 : aborted ? 408 : error instanceof HTTPException &&
    error.status >= 400 && error.status <= 599 ? error.status : 500;
  const message = validation ? 'Invalid request' : aborted ? 'Request interrupted' :
    status >= 500 ? 'Service temporarily unavailable' : 'Request could not be completed';
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
  // SQL/provider errors and Zod issue payloads may contain private data.
  logger.error({ requestId, status, failure: validation ? 'validation' :
    aborted ? 'aborted' : error instanceof HTTPException ? 'http' : 'internal' }, 'request failed');
  return c.json({ success: false, error: message, requestId }, status);
};
