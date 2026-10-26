import { Link } from 'react-router';
import { ArrowUpRight, FlaskConical, NotebookPen, Layers3, BriefcaseBusiness, GraduationCap, Scale, Check, ShieldCheck } from 'lucide-react';

export default function StartPage() {
  return <main className="luqi-start">
    <header className="luqi-start-heading">
      <p className="luqi-eyebrow">WELCOME TO THE LUQI PILOT</p>
      <h1>A useful place to begin.</h1>
      <p>Try a limited AI text question, explore physics, calculate a travel budget or vehicle service date, prepare a client quote, practise flashcards, or save your ideas as notes.</p>
      <p><Link className="luqi-primary" to="/ai-trial">Try the AI text trial <ArrowUpRight size={18} aria-hidden="true" /></Link></p>
      <span className="luqi-start-label"><ShieldCheck size={17} aria-hidden="true" /> Voice and paid plans are not enabled. AI text has a separate limited trial.</span>
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
      <section className="luqi-start-card" aria-labelledby="start-omega">
        <span className="luqi-tool-icon luqi-icon-agents"><Layers3 aria-hidden="true" /></span>
        <p className="luqi-card-kicker">NO ACCOUNT OR AI PAYMENT</p>
        <h2 id="start-omega">Put Omega to work on useful numbers.</h2>
        <p>Add amounts in one currency or check a vehicle's service date and mileage using your own figures.</p>
        <ul><li><Check aria-hidden="true" /> Exact budget totals in your browser</li><li><Check aria-hidden="true" /> Supplied service intervals, not mechanical advice</li><li><Check aria-hidden="true" /> No account or stored task needed</li></ul>
        <Link className="luqi-primary" to="/omega-tasks">Try Omega calculations <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-business">
        <span className="luqi-tool-icon luqi-icon-business"><BriefcaseBusiness aria-hidden="true" /></span>
        <p className="luqi-card-kicker">NO ACCOUNT OR AI CHARGE</p>
        <h2 id="start-business">Prepare a quotation for your next customer.</h2>
        <p>Create a draft ZAR quote, download it as text and check whether a selling price covers your costs.</p>
        <ul><li><Check aria-hidden="true" /> Itemised draft quotations</li><li><Check aria-hidden="true" /> Gross margin and break-even calculations</li><li><Check aria-hidden="true" /> Runs locally without sharing customer details</li></ul>
        <Link className="luqi-primary" to="/business-desk">Open the business desk <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-study">
        <span className="luqi-tool-icon luqi-icon-study"><GraduationCap aria-hidden="true" /></span>
        <p className="luqi-card-kicker">STUDY LOCALLY · NO AI CHARGE</p>
        <h2 id="start-study">Practise what you want to remember.</h2>
        <p>Build flashcards from your trusted materials, check your recall and plan topics ahead of an exam.</p>
        <ul><li><Check aria-hidden="true" /> User-authored flashcards and review dates</li><li><Check aria-hidden="true" /> Export and reopen your deck</li><li><Check aria-hidden="true" /> No subscription or AI required</li></ul>
        <Link className="luqi-primary" to="/study-desk">Open the study desk <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-rights">
        <span className="luqi-tool-icon luqi-icon-study"><Scale aria-hidden="true" /></span>
        <p className="luqi-card-kicker">FREE SOURCE-LINKED INFORMATION · NO ACCOUNT</p>
        <h2 id="start-rights">Understand asylum and refugee procedures.</h2>
        <p>See cited UNHCR, government and court information, current review dates, and where to get qualified legal help. Sepitori and other language reviews are being prepared.</p>
        <ul><li><Check aria-hidden="true" /> Direct links to original sources</li><li><Check aria-hidden="true" /> Shows when source summaries need rechecking</li><li><Check aria-hidden="true" /> No personal story, AI call or submission required</li></ul>
        <Link className="luqi-primary" to="/rights-guide">Open the rights guide <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-consumer-rights">
        <span className="luqi-tool-icon luqi-icon-business"><ShieldCheck aria-hidden="true" /></span>
        <p className="luqi-card-kicker">FREE LOCAL GUIDANCE · NO AI CALL OR ACCOUNT</p>
        <h2 id="start-consumer-rights">Understand your consumer options.</h2>
        <p>Describe an anonymised consumer concern, choose its category, review official complaint sources and prepare an editable factual message.</p>
        <ul><li><Check aria-hidden="true" /> No story uploads or automatic email</li><li><Check aria-hidden="true" /> Sector-specific routes and source links</li><li><Check aria-hidden="true" /> General information, not a legal verdict</li></ul>
        <Link className="luqi-primary" to="/consumer-rights">Open the consumer guide <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
    </div>
    <section className="luqi-start-details" aria-labelledby="pilot-expectations">
      <h2 id="pilot-expectations">What to expect from the pilot</h2>
      <p>Notes are stored on LUQI’s server and can be accessed by storage administrators. Use ordinary test notes and keep a separate copy of anything important. Deleting active notes does not erase backup copies immediately.</p>
      <p>Automatic password-reset emails are unavailable. Verified African-language support, payments, live-data Omega modules and autonomous workers are still being developed.</p>
      <p><Link to="/ai-trial">View the signed-in AI text trial</Link> to check whether questions are currently enabled. It uses separate provider processing and spending limits; your notes are not sent automatically.</p>
      <div><Link to="/privacy">Privacy information</Link><Link to="/service-status">Check service status</Link><Link to="/contact">Help and feedback</Link></div>
    </section>
  </main>;
}
