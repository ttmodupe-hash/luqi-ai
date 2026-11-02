import { z } from 'zod';
import { isPublicKeyOffer, loadHostedOffer, type PublicKeyOffer } from './hosted-checkout';

export const receiptEmailSchema = z.string().trim().email().max(254);
export type CheckoutSnapshot = { offer: PublicKeyOffer; revision: string };
type Callbacks = { onSuccess: () => void; onCancel: () => void; onError: () => void };
export type PaystackOptions = Callbacks & {
  key: string; email: string; amount: number; currency: 'ZAR'; reference: string;
  metadata: { luqi_offer_id: string; luqi_offer_revision: string };
};
export type PopupConstructor = new () => { newTransaction(options: PaystackOptions): unknown };
declare global { interface Window { PaystackPop?: PopupConstructor } }

export class OfferChangedError extends Error {
  constructor() { super('Checkout availability changed'); }
}
export function checkoutSelection(search: string, hash = '') {
  const params = new URLSearchParams(search);
  const id = params.get('id') ?? '';
  const revision = params.get('revision') ?? '';
  if (hash || [...params].length !== 2 || params.getAll('id').length !== 1 ||
      params.getAll('revision').length !== 1 ||
      !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || !/^[a-f0-9]{64}$/.test(revision)) return null;
  return { id, revision };
}

/** Called only after the buyer's explicit action in the isolated document.
 * No third-party script is installed into the signed-in LUQI application. */
export function loadPaystackPopup(signal: AbortSignal): Promise<PopupConstructor> {
  if (signal.aborted) return Promise.reject(new Error('Checkout unavailable'));
  if (typeof window.PaystackPop === 'function') return Promise.resolve(window.PaystackPop);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      script.onload = null; script.onerror = null;
      if (success && !signal.aborted && typeof window.PaystackPop === 'function') resolve(window.PaystackPop);
      else { script.remove(); reject(new Error('Checkout unavailable')); }
    };
    const abort = () => finish(false);
    const timer = setTimeout(abort, 10_000);
    script.onload = () => finish(true); script.onerror = abort;
    signal.addEventListener('abort', abort, { once: true });
    document.head.append(script);
  });
}

/** No secret key, account identity, private context, subscription or entitlement
 * is used. A callback is UI feedback only: the seller verifies actual receipts. */
export async function beginPublicKeyCheckout(
  snapshot: CheckoutSnapshot, buyerEmail: string, signal: AbortSignal, callbacks: Callbacks,
  dependencies: { request?: typeof fetch; loadPopup?: typeof loadPaystackPopup } = {},
): Promise<void> {
  const email = receiptEmailSchema.parse(buyerEmail);
  const requireCurrentOffer = async () => {
    const current = await loadHostedOffer(signal, dependencies.request);
    if (signal.aborted || current.status !== 'available' || !isPublicKeyOffer(current.offer) ||
        current.offer.id !== snapshot.offer.id || current.revision !== snapshot.revision ||
        current.offer.paystackPublicKey !== snapshot.offer.paystackPublicKey) throw new OfferChangedError();
    return current.offer;
  };
  await requireCurrentOffer();
  const Popup = await (dependencies.loadPopup ?? loadPaystackPopup)(signal);
  // Loading a provider script can take time. Recheck withdrawal/terms again.
  const offer = await requireCurrentOffer();
  if (signal.aborted) throw new OfferChangedError();
  const random = new Uint8Array(16); crypto.getRandomValues(random);
  const reference = 'luqi-' + offer.id.slice(0, 32) + '-' + snapshot.revision.slice(0, 12) +
    '-' + [...random].map(byte => byte.toString(16).padStart(2, '0')).join('');
  new Popup().newTransaction({
    key: offer.paystackPublicKey, email, amount: offer.amountMinor, currency: offer.currency,
    reference, metadata: { luqi_offer_id: offer.id, luqi_offer_revision: snapshot.revision },
    onSuccess: () => { if (!signal.aborted) callbacks.onSuccess(); },
    onCancel: () => { if (!signal.aborted) callbacks.onCancel(); },
    onError: () => { if (!signal.aborted) callbacks.onError(); },
  });
}
