import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isPublicKeyOffer, loadHostedOffer } from '../lib/hosted-checkout';
import { beginPublicKeyCheckout, checkoutSelection, OfferChangedError, receiptEmailSchema, type CheckoutSnapshot } from '../lib/paystack-popup';

type CheckoutStatus = 'loading' | 'ready' | 'opening' | 'returned' | 'closed' | 'failed' | 'unavailable';

/** Separate document: no customer session, Chat/Notes state, router or analytics. */
export default function PaystackCheckoutPage() {
  const [selection] = useState(() => checkoutSelection(window.location.search, window.location.hash));
  const [snapshot, setSnapshot] = useState<CheckoutSnapshot | null>(null);
  const [status, setStatus] = useState<CheckoutStatus>('loading');
  const [email, setEmail] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const started = useRef(false);
  useEffect(() => {
    const lifecycle = new AbortController(); controller.current = lifecycle;
    if (!selection) setStatus('unavailable');
    else void loadHostedOffer(lifecycle.signal).then(result => {
      if (lifecycle.signal.aborted) return;
      if (result.status !== 'available' || !isPublicKeyOffer(result.offer) ||
          result.offer.id !== selection.id || result.revision !== selection.revision) {
        setStatus('unavailable'); return;
      }
      setSnapshot({ offer: result.offer, revision: result.revision }); setStatus('ready');
    }).catch(() => { if (!lifecycle.signal.aborted) setStatus('unavailable'); });
    return () => lifecycle.abort();
  }, [selection]);
  const offer = snapshot?.offer;
  async function openCheckout(event: FormEvent) {
    event.preventDefault();
    const signal = controller.current?.signal;
    if (started.current || status !== 'ready' || !snapshot || !reviewed || !signal ||
        !receiptEmailSchema.safeParse(email).success) return;
    started.current = true; setStatus('opening');
    const update = (next: CheckoutStatus) => { if (!signal.aborted) { setEmail(''); setStatus(next); } };
    try {
      await beginPublicKeyCheckout(snapshot, email, signal, {
        onSuccess: () => update('returned'), onCancel: () => update('closed'), onError: () => update('failed'),
      });
    } catch (error) { update(error instanceof OfferChangedError ? 'unavailable' : 'failed'); }
  }
  return <main aria-labelledby="checkout-heading">
    <p className="eyebrow">LUQI · ONE-TIME ASSISTED SERVICE</p>
    <h1 id="checkout-heading">Checkout</h1>
    {status === 'loading' && <p role="status">Checking checkout availability…</p>}
    {status === 'unavailable' && <section role="status"><h2>Checkout is unavailable</h2>
      <p>Return to the offer to check current availability and terms. No new checkout was started here.</p></section>}
    {offer && status !== 'unavailable' && <section aria-labelledby="checkout-offer">
      <h2 id="checkout-offer">{offer.title}</h2><p>{offer.description}</p>
      <p className="price">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: offer.currency }).format(offer.amountMinor / 100)} once</p>
      <p>Seller: {offer.sellerName} · South Africa</p>
      <h3>What you receive</h3><ul>{offer.deliverables.map((item, index) => <li key={index}>{item}</li>)}</ul>
      <h3>Delivery</h3><p>{offer.delivery}</p><h3>Revisions</h3><p>{offer.revisions}</p>
      <h3>Cancellation and refunds</h3><p>{offer.refunds}</p><h3>Taxes and fees</h3><p>{offer.taxesAndFees}</p>
      <p>Order support: <a href={'mailto:' + offer.supportEmail}>{offer.supportEmail}</a></p>
      <p>This is a one-time assisted service. It does not activate an AI subscription, app credits or extra AI allowance.</p>
      {status === 'ready' && <form onSubmit={openCheckout}>
        <label htmlFor="receipt-email">Receipt email</label>
        <input id="receipt-email" type="email" autoComplete="off" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
        <p>When you open checkout, this email is shared with Paystack for your payment and receipt. Your LUQI login, Chat and private notes are not attached. Enter payment details only inside Paystack.</p>
        <label className="review"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />
          I have reviewed the seller, price, service, delivery and refund details.</label>
        <button disabled={!reviewed || !receiptEmailSchema.safeParse(email).success}>Open Paystack checkout</button>
      </form>}
      {status === 'opening' && <p role="status">Opening Paystack checkout… Confirm the seller and total inside Paystack before paying. If it does not appear, check your receipts before trying again.</p>}
      {status === 'returned' && <section role="status"><h3>Checkout returned</h3><p>LUQI has not independently verified payment here. Keep Paystack’s receipt. The seller must verify the actual payment, amount and service before fulfilling your order.</p></section>}
      {(status === 'closed' || status === 'failed') && <p role="status">Checkout {status === 'closed' ? 'closed' : 'could not be confirmed'}. Check your Paystack receipts and contact order support before trying again. This page will not automatically start another payment.</p>}
    </section>}
    <p><a href="/#/payments">Return to the offer</a> · <a href="/#/chat">Go to Chat</a></p>
  </main>;
}
