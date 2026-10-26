import { Link } from 'react-router';
export default function ContactPage() {
  return <main className="luqi-info"><p className="luqi-eyebrow">HELP US IMPROVE LUQI</p>
    <h1>Help and feedback</h1>
    <p>Describe what you tried, what you expected and what happened. Include the page name and device type; keep personal data out of technical reports.</p>
    <section><h2>Report a technical problem</h2><p>Technical issues can be reported on the project’s GitHub repository. Reports there are public. Do not include passwords, account tokens, email addresses, private notes or screenshots containing them.</p><a className="luqi-primary" href="https://github.com/ttmodupe-hash/luqi-ai/issues/new" target="_blank" rel="noopener noreferrer">Open a public technical issue</a></section>
    <section><h2>Consumer concerns</h2><p>Use LUQI’s free, source-linked consumer guide to organise a redacted account of what happened, review possible complaint channels and prepare a factual message without AI calls or automatic sending. It does not make legal findings.</p><Link to="/consumer-rights">Prepare a consumer concern locally</Link></section>
    <section><h2>Change a known password</h2><p>Sign in to your notes, choose Change password and enter your current and new passwords. You will be signed out after a confirmed change. This does not recover a forgotten password.</p><Link to="/companion">Open notes and account settings</Link></section>
    <section><h2>Account recovery or private questions</h2><p>A verified private support address has not yet been published here. If you received a pilot invitation, reply privately through that existing conversation. Automatic password-reset emails are unavailable; do not post an account-recovery request in a public issue.</p></section>
    <section><h2>Check availability first</h2><p>The status page reports runtime, database and AI readiness separately. It does not confirm that every product feature is available.</p><Link to="/service-status">Check service status</Link></section>
    <Link to="/start">Back to getting started</Link>
  </main>;
}
