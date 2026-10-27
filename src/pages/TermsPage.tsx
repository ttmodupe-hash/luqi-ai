import { Link } from 'react-router';
export default function TermsPage() {
  return <main className="luqi-info"><p className="luqi-eyebrow">CURRENT PILOT SCOPE</p>
    <h1>Pilot use information</h1>
    <p>Luqi is being tested as an AI text companion with a limited signed-in trial and optional tools for creating, learning and saving private notes.</p>
    <section><h2>Available features</h2><p>The notes workspace stores messages you write; it does not reply as an AI companion or automatically learn from your notes. The physics lab is an interactive simulation, with no active AI tutor.</p></section>
    <section><h2>Optional AI trial</h2><p>A separate signed-in text trial is available only when its provider configuration and shared spending allowance permit requests. You must acknowledge provider processing before sending a question. Replies may fail, be incomplete or be incorrect. The trial has no live browsing or verified sources, no automatic retries, and no independently validated African-language accuracy. Failed attempts and provider fallback count toward the limits. It does not automatically save or learn from your private notes.</p><Link to="/ai-trial">View the AI trial and its current status</Link></section>
    <section><h2>One-time assisted services</h2><p>If an assisted service is available, its payment page shows the seller, exact one-time price, deliverables, delivery, revisions, refund terms and order support before a link to provider-hosted checkout. Review those details before paying. The provider handles payment details; Luqi does not infer payment success from a return link or grant AI credits automatically.</p><Link to="/payments">View payment availability and service terms</Link></section>
    <section><h2>Unavailable features</h2><p>AI subscriptions, purchased app credits, generated video and voice, and autonomous Omega workers are not enabled. This pilot makes no commercial licensing or automatic-refund promises for those features.</p></section>
    <section><h2>Using a development service</h2><p>Features may change or be unavailable. Keep a separate copy of important notes, use ordinary test content and review the privacy information before creating an account. The service is not intended for emergency, medical, legal or financial decisions.</p></section>
    <section><h2>Questions and feedback</h2><p>Use the published help options for technical feedback. Account recovery and private-data requests require a verified private contact; public GitHub issues are not a private support channel.</p><Link to="/contact">View help options</Link></section>
    <Link to="/privacy">Read the pilot privacy information</Link>
  </main>;
}
