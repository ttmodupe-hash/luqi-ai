import { Link } from 'react-router';
import { ArrowUpRight, FlaskConical, MessageCircle, Layers3, BriefcaseBusiness, GraduationCap, Scale, Check, ShieldCheck } from 'lucide-react';

export default function StartPage() {
  return <main className="luqi-start">
    <header className="luqi-start-heading">
      <p className="luqi-eyebrow">Welcome to the Luqi pilot</p>
      <h1>A useful place to begin.</h1>
      <p>Try a limited AI text question, explore physics, calculate a travel budget or vehicle service date, prepare a client quote, practise flashcards, or save your ideas as notes.</p>
      <p><Link className="luqi-primary" to="/chat">Ask Luqi <ArrowUpRight size={18} aria-hidden="true" /></Link></p>
      <p><Link to="/install">Install Luqi on your phone</Link> — add the safe web app to your Android or iPhone home screen.</p>
      <p><Link to="/ai-trial">Try the AI text trial</Link> — availability is limited, and your Luqi sign-in works for both Chat and Notes.</p>
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
        <span className="luqi-tool-icon luqi-icon-notes"><MessageCircle aria-hidden="true" /></span>
        <p className="luqi-card-kicker">ONE ACCOUNT FOR CUSTOMER TOOLS</p>
        <h2 id="start-notes">One Luqi account, starting with Chat.</h2>
        <p>Create one Luqi account and begin with Chat. Private notes and Luqi task history are optional; your login works across customer tools in this tab.</p>
        <ul><li><Check aria-hidden="true" /> Sign in once while navigating this tab</li><li><Check aria-hidden="true" /> Chat without creating or saving notes</li><li><Check aria-hidden="true" /> Private notes remain optional</li></ul>
        <Link className="luqi-primary" to="/join">Create your Luqi account <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <Link className="luqi-start-existing" to="/login">Already have an account? Sign in</Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-omega">
        <span className="luqi-tool-icon luqi-icon-agents"><Layers3 aria-hidden="true" /></span>
        <p className="luqi-card-kicker">NO ACCOUNT OR AI PAYMENT</p>
        <h2 id="start-omega">Use Luqi for practical calculations.</h2>
        <p>Add amounts in one currency or check a vehicle's service date and mileage using your own figures.</p>
        <ul><li><Check aria-hidden="true" /> Exact budget totals in your browser</li><li><Check aria-hidden="true" /> Supplied service intervals, not mechanical advice</li><li><Check aria-hidden="true" /> No account or stored task needed</li></ul>
        <Link className="luqi-primary" to="/omega-tasks">Try Luqi calculations <ArrowUpRight size={18} aria-hidden="true" /></Link>
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
      <section className="luqi-start-card" aria-labelledby="start-driver-rights">
        <span className="luqi-tool-icon luqi-icon-business"><ShieldCheck aria-hidden="true" /></span>
        <p className="luqi-card-kicker">FREE · NO ACCOUNT OR AI CHARGE</p>
        <h2 id="start-driver-rights">Know your rights at a traffic stop.</h2>
        <p>Stay safe, understand police powers, identify red flags for bribes, and check South African road law with original source links.</p>
        <ul><li><Check aria-hidden="true" /> Immediate three-step roadside guide</li><li><Check aria-hidden="true" /> Explains exceptions to searches and fines</li><li><Check aria-hidden="true" /> Source dates and official reporting contacts</li></ul>
        <Link className="luqi-primary" to="/driver-rights">Open driver rights guide <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-rights">
        <span className="luqi-tool-icon luqi-icon-study"><Scale aria-hidden="true" /></span>
        <p className="luqi-card-kicker">FREE SOURCE-LINKED INFORMATION · NO ACCOUNT</p>
        <h2 id="start-rights">Understand asylum and refugee procedures.</h2>
        <p>See cited UNHCR, government and court information, current review dates, and where to get qualified legal help. Sepitori and other language reviews are being prepared.</p>
        <ul><li><Check aria-hidden="true" /> Direct links to original sources</li><li><Check aria-hidden="true" /> Shows when source summaries need rechecking</li><li><Check aria-hidden="true" /> No personal story, AI call or submission required</li></ul>
        <Link className="luqi-primary" to="/rights-guide">Open the rights guide <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-comparative-evidence">
        <span className="luqi-tool-icon luqi-icon-study"><GraduationCap aria-hidden="true" /></span>
        <p className="luqi-card-kicker">FREE SOURCE-LINKED READING · NO ACCOUNT</p>
        <h2 id="start-comparative-evidence">Compare faith, history and science.</h2>
        <p>Explore seven source-linked questions across religion, African heritage, manuscripts and scientific methods without a paid model request.</p>
        <ul><li><Check aria-hidden="true" /> Four distinct evidence layers</li><li><Check aria-hidden="true" /> Direct museum and academic citations</li><li><Check aria-hidden="true" /> No scoring or judging religions</li></ul>
        <Link className="luqi-primary" to="/comparative-evidence">Open comparative evidence guide <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section className="luqi-start-card" aria-labelledby="start-consumer-rights">
        <span className="luqi-tool-icon luqi-icon-business"><ShieldCheck aria-hidden="true" /></span>
        <p className="luqi-card-kicker">FREE LOCAL GUIDANCE · NO AI CALL OR ACCOUNT</p>
        <h2 id="start-consumer-rights">Understand your consumer options.</h2>
        <p>Read three immediate steps before sharing a personal story, then find official complaint sources and optionally prepare an editable factual message.</p>
        <ul><li><Check aria-hidden="true" /> No story uploads or automatic email</li><li><Check aria-hidden="true" /> Sector-specific routes and source links</li><li><Check aria-hidden="true" /> General information, not a legal verdict</li></ul>
        <Link className="luqi-primary" to="/consumer-rights">Open the consumer guide <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
    </div>
    <section className="luqi-start-details" aria-labelledby="pilot-expectations">
      <h2 id="pilot-expectations">What to expect from the pilot</h2>
      <p>Notes are stored on Luqi’s server and can be accessed by storage administrators. Use ordinary test notes and keep a separate copy of anything important. Deleting active notes does not erase backup copies immediately.</p>
      <p>Automatic password-reset emails are unavailable. Verified African-language support, payments, live-data Luqi capabilities and autonomous workers are still being developed.</p>
      <p><Link to="/ai-trial">View the signed-in AI text trial</Link> to check whether questions are currently enabled. It uses separate provider processing and spending limits; your notes are not sent automatically.</p>
      <div><Link to="/privacy">Privacy information</Link><Link to="/service-status">Check service status</Link><Link to="/contact">Help and feedback</Link></div>
    </section>
  </main>;
}
