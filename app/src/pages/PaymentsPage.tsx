import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { loadHostedOffer, type HostedOfferResponse } from '../lib/hosted-checkout';

export default function PaymentsPage() {
  const location = useLocation();
  const [result, setResult] = useState<HostedOfferResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  useEffect(() => {
    // A payment return/query string is never proof of a payment or entitlement.
    if (location.search) return;
    const controller = new AbortController();
    void loadHostedOffer(controller.signal).then(value => {
      if (!controller.signal.aborted) setResult(value);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [location.search]);
  if (location.search) return <Navigate to="/payments" replace />;
  const offer = result?.status === 'available' ? result.offer : null;
  return <main className="luqi-info" aria-labelledby="payments-heading">
    <p className="luqi-eyebrow">CLEAR DETAILS BEFORE YOU PAY</p>
    <h1 id="payments-heading">Payments</h1>
    {!result && !failed && <p role="status">Checking payment availability…</p>}
    {failed && <p role="status">Payment availability could not be confirmed. No payment has been started. Please try again later.</p>}
    {result?.status === 'unavailable' && <section aria-labelledby="payment-unavailable-heading">
      <h2 id="payment-unavailable-heading">Payments are not available yet</h2>
      <p>There is no active paid offer to purchase here. You can continue using LUQI’s available pilot tools.</p>
      <p>No money has been collected by opening this page.</p>
      <Link className="luqi-primary" to="/chat">Go to Chat</Link>
    </section>}
    {offer && <section aria-labelledby="paid-offer-heading">
      <p>One-time assisted service</p><h2 id="paid-offer-heading">{offer.title}</h2>
      <p>{offer.description}</p>
      <p><strong>{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: offer.currency }).format(offer.amountMinor / 100)} once</strong></p>
      <p>Seller: {offer.sellerName} · South Africa</p>
      <h3>What you receive</h3><ul>{offer.deliverables.map((item, index) => <li key={index}>{item}</li>)}</ul>
      <h3>Delivery</h3><p>{offer.delivery}</p>
      <h3>Revisions</h3><p>{offer.revisions}</p>
      <h3>Cancellation and refunds</h3><p>{offer.refunds}</p>
      <h3>Taxes and fees</h3><p>{offer.taxesAndFees}</p>
      <h3>Order support</h3><p><a href={`mailto:${offer.supportEmail}`}>{offer.supportEmail}</a></p>
      <p>Paystack handles payment details on its own website. Confirm the seller, service and total there before paying. Your LUQI login and private notes are not attached to the payment link.</p>
      <p>This purchase does not activate an AI subscription, app credits or extra AI allowance. Follow the seller’s delivery and receipt instructions for this assisted service.</p>
      <label className="block"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> I have reviewed the service, price, delivery and refund details above.</label>
      {reviewed && result?.status === 'available' ? <p><a className="luqi-primary" href={`/api/v1/commerce/checkout?id=${encodeURIComponent(offer.id)}&revision=${result.revision}`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Continue to Paystack</a></p>
        : <p>Review the offer details to continue to checkout.</p>}
      <p>If the offer changes before checkout opens, return here to review the current details.</p>
      <p>Returning to LUQI does not confirm a successful payment. Keep the provider’s receipt and use the order support contact if you need help.</p>
    </section>}
    <p><Link to="/pricing">Plans and available tools</Link> · <Link to="/contact">Help and feedback</Link></p>
  </main>;
}
