import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { hostedOfferSchema, type HostedOfferResponse } from '../src/lib/hosted-checkout';

/** A digest binds the reviewed public offer to the exact published terms.
 * It is not merchant verification: approval, fixed price, receipts, support
 * and fulfilment must be checked separately before setting the rollout flag. */
export function hostedOfferDigest(value: unknown): string {
  const offer = hostedOfferSchema.parse(value);
  return createHash('sha256').update(JSON.stringify(offer)).digest('hex');
}

export function configuredHostedOffer(env: NodeJS.ProcessEnv = process.env): HostedOfferResponse {
  if (env.LUQI_HOSTED_CHECKOUT_ENABLED !== 'true') return { status: 'unavailable' };
  const raw = env.LUQI_HOSTED_CHECKOUT_OFFER;
  const accepted = env.LUQI_HOSTED_CHECKOUT_ACCEPTED_SHA256;
  if (!raw || Buffer.byteLength(raw, 'utf8') > 16_384 || !/^[a-f0-9]{64}$/.test(accepted ?? '')) {
    return { status: 'unavailable' };
  }
  try {
    const offer = hostedOfferSchema.parse(JSON.parse(raw));
    if (hostedOfferDigest(offer) !== accepted) return { status: 'unavailable' };
    return { status: 'available', offer, revision: accepted! };
  } catch { return { status: 'unavailable' }; }
}

// No payment initiation, callback, wallet write or provider request is exposed.
export const hostedCheckout = new Hono();
hostedCheckout.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  await next();
});
hostedCheckout.get('/offer', c => {
  if (Object.keys(c.req.query()).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  return c.json(configuredHostedOffer());
});
hostedCheckout.get('/checkout', c => {
  const params = new URL(c.req.url).searchParams;
  const result = configuredHostedOffer();
  if (result.status !== 'available' || [...params].length !== 2 ||
      params.getAll('id').length !== 1 || params.getAll('revision').length !== 1 ||
      params.get('id') !== result.offer.id || params.get('revision') !== result.revision) {
    return c.redirect('/#/payments', 302);
  }
  // Recheck current rollout/terms at handoff. Never forward query parameters,
  // buyer identity or a LUQI token to the fixed provider-owned destination.
  c.header('Referrer-Policy', 'no-referrer');
  return c.redirect(result.offer.checkoutUrl, 302);
});
hostedCheckout.all('*', c => c.json({ code: 'METHOD_NOT_ALLOWED' }, 405));
