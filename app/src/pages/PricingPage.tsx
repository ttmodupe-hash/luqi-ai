import { Link } from 'react-router';
export default function PricingPage() {
  return <main className="luqi-info"><p className="luqi-eyebrow">CURRENT AVAILABILITY</p>
    <h1>Plans and availability</h1>
    <p>Paid plans, credit purchases and checkout are not available. LUQI does not offer active commercial subscriptions in this pilot.</p>
    <section><h2>What you can try today</h2><p>Explore the physics lab in your browser, or create an account to save private conversation notes. These features do not generate AI replies.</p><Link className="luqi-primary" to="/start">Choose your first step</Link></section>
    <section><h2>What is still in development</h2><p>AI chat, generated video and voice, autonomous workers and commercial plans need further integration and review. No purchase, top-up or background job can be started from this page.</p></section>
    <Link to="/service-status">Check service status</Link>
  </main>;
}
