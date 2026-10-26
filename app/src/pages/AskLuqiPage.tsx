import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Compass, Globe2, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import AiPilotPage from './AiPilotPage';
import { GUIDE_EXAMPLES, guideLuqiNeed, MAX_GUIDE_NEED_CHARS } from '../lib/luqi-intent-guide';
import '../luqi-guide.css';

/** No paid AI or booking is called by the local guide; only explicit AI trial consent can submit. */
export default function AskLuqiPage() {
  const [need, setNeed] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [error, setError] = useState('');
  const result = guideLuqiNeed(submitted);
  function guide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guideLuqiNeed(need)) {
      setError('Describe what you need in 500 characters or fewer.');
      return;
    }
    setError('');
    setSubmitted(need.trim());
  }
  function selectExample(value: string) {
    setNeed(value);
    setSubmitted(value);
    setError('');
  }
  function askAi() {
    if (!result || !submitted) return;
    setAiDraft(submitted);
    const target = document.getElementById('luqi-guide-ai');
    if (typeof target?.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return <main className="luqi-guide">
    <section className="luqi-guide-hero" aria-labelledby="luqi-guide-title">
      <div className="luqi-guide-eyebrow"><Globe2 size={17} aria-hidden="true" /> AFRICA IN MIND · OPEN TO EVERYONE</div>
      <h1 id="luqi-guide-title">Tell LUQI what you need.<br/><em>Start from here.</em></h1>
      <p className="luqi-guide-lede">A more human way to explore, learn, create and plan. Describe your goal in your own words. LUQI will show what works today, what still needs a trusted source, and where to go next.</p>
      <form onSubmit={guide} className="luqi-guide-form">
        <label htmlFor="luqi-guide-need"><MessageCircle size={19} aria-hidden="true" /> What would you like help with?</label>
        <textarea id="luqi-guide-need" value={need} maxLength={MAX_GUIDE_NEED_CHARS} rows={3}
          onChange={event => { setNeed(event.target.value); setError(''); }}
          placeholder="I'm visiting Cape Town. Help me understand where to stay, what to do and what I should check before booking."
          aria-describedby="luqi-guide-privacy" required />
        <div className="luqi-guide-form-bottom">
          <span id="luqi-guide-privacy"><ShieldCheck size={15} aria-hidden="true" /> This first step runs locally. No AI call, booking or payment.</span>
          <button className="luqi-guide-submit" type="submit" disabled={!need.trim()}>
            Find my next step <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        {error && <p role="alert" className="luqi-guide-error">{error}</p>}
      </form>
      <div className="luqi-guide-examples" aria-label="Try a starting point">
        <span>Or try</span>
        {GUIDE_EXAMPLES.map(example => <button type="button" key={example.label}
          onClick={() => selectExample(example.need)}>{example.label}</button>)}
      </div>
    </section>

    {result && <section className="luqi-guide-result" aria-labelledby="luqi-guide-result-title" aria-live="polite">
      <div className="luqi-guide-result-heading">
        <div><p className="luqi-guide-overline">YOUR NEXT STEP · LOCAL GUIDANCE</p>
          <h2 id="luqi-guide-result-title">{result.title}</h2></div>
        <span className={'luqi-guide-state luqi-guide-state-' + result.status}>{result.statusLabel}</span>
      </div>
      <p>{result.detail}</p>
      <p className="luqi-guide-followup"><strong>To help you further:</strong> {result.nextQuestion}</p>
      <p className="luqi-guide-caution"><ShieldCheck size={17} aria-hidden="true" /> {result.caution}</p>
      <div className="luqi-guide-actions">
        {result.primaryPath && result.primaryLabel && <Link to={result.primaryPath} className="luqi-guide-secondary">
          {result.primaryLabel} <ArrowRight size={17} aria-hidden="true" />
        </Link>}
        {result.kind !== 'urgent' && <button type="button" className="luqi-guide-submit" onClick={askAi}>
          Use my question in the AI text trial <ArrowRight size={17} aria-hidden="true" />
        </button>}
      </div>
      {result.bookingPreview && <div className="luqi-booking-review" aria-labelledby="luqi-booking-review-title">
        <div className="luqi-booking-illustration"><Compass size={29} aria-hidden="true" /><span>No live listing</span></div>
        <div className="luqi-booking-review-body">
          <p className="luqi-guide-overline">BOOKING TRANSPARENCY</p>
          <h3 id="luqi-booking-review-title">See the real offer before you commit</h3>
          <p>No verified property, experience or transport offer is connected yet. LUQI cannot display a real booking or accept payment.</p>
          <p>A future verified offer must show provider, authentic photos and location, dates and group size, live availability timestamp, total price and fees in the stated currency, cancellation terms, and who processes payment.</p>
          <strong className="luqi-booking-unavailable">Booking and checkout unavailable</strong>
        </div>
      </div>}
    </section>}

    <section className="luqi-guide-chat-section" aria-labelledby="luqi-guide-chat-heading" id="luqi-guide-ai">
      <div className="luqi-guide-chat-heading">
        <Sparkles size={22} aria-hidden="true" />
        <div><p className="luqi-guide-overline">REAL TEXT AI · LIMITED PILOT</p>
          <h2 id="luqi-guide-chat-heading">Ask LUQI a question</h2></div>
      </div>
      <p>For an actual AI-generated text reply, use the signed-in trial below. It requires your consent, has shared usage limits and does not browse live travel listings or book anything. Notes sign-in is separate for now.</p>
      <AiPilotPage embedded initialQuestion={aiDraft} />
    </section>

    <section className="luqi-guide-bottom" aria-label="More ways to use LUQI">
      <h2>More than a travel companion.</h2>
      <p>LUQI is growing into one place for Africa's visitors and residents to explore, learn, create, work and find opportunities — with trusted information, not invented availability.</p>
      <div>
        <Link to="/start">Explore today's tools <ArrowRight size={17} aria-hidden="true" /></Link>
        <Link to="/companion">Open private notes <ArrowRight size={17} aria-hidden="true" /></Link>
        <Link to="/service-status">Check availability <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
  </main>;
}
