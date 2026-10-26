import type { MiddlewareHandler } from 'hono';

/** The provider runs only in a separate no-opener document, never in Chat. */
export const paymentDocumentHeaders: MiddlewareHandler = async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  c.header('Content-Security-Policy', [
    "default-src 'none'", "script-src 'self' https://js.paystack.co",
    // The vendor overlay styles its frame dynamically. Inline scripts remain blocked.
    "style-src 'self' 'unsafe-inline'", "connect-src 'self' https://api.paystack.co",
    "frame-src https://checkout.paystack.com", "img-src 'self' data:",
    "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", "object-src 'none'",
  ].join('; '));
  await next();
};
