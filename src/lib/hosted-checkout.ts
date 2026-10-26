import { z } from 'zod';

/** Public commercial terms only. No token, email prefill, callback, balance or
 * paid entitlement can be supplied by the visitor or inferred from a redirect. */
const text = (maximum: number) => z.string().trim().min(1).max(maximum);
export const hostedOfferSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  provider: z.literal('paystack'),
  kind: z.literal('one_time_assisted_service'),
  title: text(120),
  description: text(800),
  amountMinor: z.number().int().positive().max(99_999_999),
  currency: z.literal('ZAR'),
  sellerName: text(160),
  sellerCountry: z.literal('ZA'),
  supportEmail: z.string().email().max(254).refine(value => !/[%\r\n?#]/.test(value)),
  deliverables: z.array(text(250)).min(1).max(8),
  delivery: text(800),
  revisions: text(800),
  refunds: text(1600),
  taxesAndFees: text(800),
  checkoutUrl: z.string().max(300).refine(value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'paystack.com' &&
        !url.port && !url.username && !url.password && !url.search && !url.hash &&
        /^\/pay\/[A-Za-z0-9_-]{1,100}$/.test(url.pathname);
    } catch { return false; }
  }, 'Invalid hosted payment page').transform(value => new URL(value).href),
}).strict();
export type HostedOffer = z.infer<typeof hostedOfferSchema>;
export const hostedOfferResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unavailable') }).strict(),
  z.object({ status: z.literal('available'), offer: hostedOfferSchema,
    revision: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
]);
export type HostedOfferResponse = z.infer<typeof hostedOfferResponseSchema>;

/** Fixed same-origin GET, bounded read and independent deadline; never retries
 * or forwards a LUQI session to a payment provider. */
export async function loadHostedOffer(signal: AbortSignal, request: typeof fetch = fetch): Promise<HostedOfferResponse> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectDeadline!: (reason: Error) => void;
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const abort = () => {
    controller.abort();
    if (reader) void reader.cancel().catch(() => {});
    rejectDeadline(new Error('Payment availability unavailable'));
  };
  if (signal.aborted) throw new Error('Payment availability unavailable');
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 10_000);
  const operation = async () => {
    const response = await request('/api/v1/commerce/offer', {
      method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json' }, signal: controller.signal,
    });
    if (!response.ok || response.redirected || controller.signal.aborted ||
        response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !response.body) {
      void response.body?.cancel().catch(() => {});
      throw new Error('Payment availability unavailable');
    }
    reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (controller.signal.aborted) throw new Error('Payment availability unavailable');
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 32_768) throw new Error('Payment availability unavailable');
        chunks.push(next.value);
      }
      const data = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
      return hostedOfferResponseSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)));
    } finally {
      void reader.cancel().catch(() => {}); reader.releaseLock(); reader = undefined;
    }
  };
  try { return await Promise.race([operation(), deadline]); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
