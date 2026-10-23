import { Link } from 'react-router';
import { ArrowUpRight, FlaskConical, NotebookPen, Check, ShieldCheck } from 'lucide-react';

export default function StartPage() {
  return <main className="luqi-start">
    <header className="luqi-start-heading">
      <p className="luqi-eyebrow">WELCOME TO THE LUQI PILOT</p>
      <h1>A useful place to begin.</h1>
      <p>Try a hands-on physics experiment, or create a space for your notes. Start with what works today.</p>
      <span className="luqi-start-label"><ShieldCheck size={17} aria-hidden="true" /> AI replies, voice and paid plans are not enabled.</span>
    </header>
    <div className="luqi-start-grid">
      <section className="luqi-start-card" aria-labelledby="start-physics">
        <span className="luqi-tool-icon luqi-icon-physics"><FlaskConical aria-hidden="true" /></span>
        <p className="luqi-card-kicker">NO ACCOUNT NEEDED</p>
        <h2 id="start-physics">Learn by experimenting.</h2>
        <p>Change a pendulum’s length, compare its motion and explore the energy in the system.</p>
        <ul><li><Check aria-hidden="true" /> Runs in your browser</li><li><Check aria-hidden="true" /> Adjustable simulation and graphs</li><li><Check aria-hidden="true" /> No AI generation required</li></ul>
        <Link className="luqi-primary" to="/pendulum-lab">Try the physics lab <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-notes">
        <span className="luqi-tool-icon luqi-icon-notes"><NotebookPen aria-hidden="true" /></span>
        <p className="luqi-card-kicker">ACCOUNT REQUIRED</p>
        <h2 id="start-notes">Give your ideas a home.</h2>
        <p>Create an account, start a conversation notebook and save a first note. Sign back in to find it later.</p>
        <ul><li><Check aria-hidden="true" /> Account-owned conversation history</li><li><Check aria-hidden="true" /> Download one conversation as JSON</li><li><Check aria-hidden="true" /> Confirm before deleting saved notes</li></ul>
        <Link className="luqi-primary" to="/join">Create your notes account <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <Link className="luqi-start-existing" to="/companion">Already have an account? Sign in</Link>
      </section>
    </div>
    <section className="luqi-start-details" aria-labelledby="pilot-expectations">
      <h2 id="pilot-expectations">What to expect from the pilot</h2>
      <p>Notes are stored on LUQI’s server and can be accessed by storage administrators. Use ordinary test notes and keep a separate copy of anything important. Deleting active notes does not erase backup copies immediately.</p>
      <p>Automatic password-reset emails are unavailable. AI answers, verified African-language support, payments and autonomous Omega workers are still being developed.</p>
      <div><Link to="/privacy">Privacy information</Link><Link to="/service-status">Check service status</Link><Link to="/contact">Help and feedback</Link></div>
    </section>
  </main>;
}
