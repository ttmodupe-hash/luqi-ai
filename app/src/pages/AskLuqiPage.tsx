import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Compass, Globe2, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import AiPilotPage from './AiPilotPage';
import LuqiPromptCoach from '../components/LuqiPromptCoach';
import { useCustomerSession } from '../providers/customer-session';
import { GUIDE_EXAMPLES, GUIDE_NEXT_STEPS, guideLuqiNeed, MAX_GUIDE_NEED_CHARS } from '../lib/luqi-intent-guide';
import { buildTravelEnquiry, MAX_TRAVEL_DESTINATION, MAX_TRAVEL_DETAIL } from '../lib/travel-enquiry';
import SovereignRegionBar from '../components/SovereignRegionBar';
import { getKhoroCriticalThinkingSteps } from '../services/panAfricanSovereignEngine';
import '../luqi-guide.css';

const emptyTrip = () => ({ destination: '', dates: '', travellers: '2', budget: '', preferences: '' });

/** One entry into real local tools and an optional, consent-gated AI trial. No automatic actions. */
export default function AskLuqiPage() {
  const { session } = useCustomerSession();
  const previousToken = useRef<string | null>(null);
  const [need, setNeed] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [coachDraftReady, setCoachDraftReady] = useState(false);
  const [error, setError] = useState('');
  const [trip, setTrip] = useState(emptyTrip);
  const [travelDraft, setTravelDraft] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  // Preserve anonymous-to-account handoff, but never paint former-account material.
  useLayoutEffect(() => {
    const token = session?.token ?? null;
    if (previousToken.current && previousToken.current !== token) {
      setNeed(''); setSubmitted(''); setAiDraft(''); setCoachDraftReady(false); setError('');
      setTrip(emptyTrip()); setTravelDraft(''); setCopyStatus('');
    }
    previousToken.current = token;
  }, [session?.token]);

  const result = guideLuqiNeed(submitted);
  const urgentNeed = guideLuqiNeed(need)?.kind === 'urgent';
  function clearTravel() { setTrip(emptyTrip()); setTravelDraft(''); setCopyStatus(''); }
  function guide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guideLuqiNeed(need)) {
      setError('Describe what you need in 500 characters or fewer.');
      return;
    }
    setError(''); setSubmitted(need.trim()); setCoachDraftReady(false); clearTravel();
  }
  function selectExample(value: string) {
    setNeed(value); setSubmitted(value); setError(''); setCoachDraftReady(false); clearTravel();
  }
  function askAi() {
    if (!result || result.kind === 'urgent' || !submitted) return;
    setAiDraft(submitted); setCoachDraftReady(false);
    document.getElementById('luqi-guide-ai')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }
  function changeTrip(field: keyof ReturnType<typeof emptyTrip>, value: string) {
    setTrip(current => ({ ...current, [field]: value }));
    setTravelDraft(''); setCopyStatus('');
  }
  function prepareTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || (result.kind !== 'booking' && result.kind !== 'travel')) return;
    const draft = buildTravelEnquiry({ goal: submitted, ...trip });
    setTravelDraft(draft || '');
    setCopyStatus(draft ? '' : 'Enter a destination and a valid group size (1–30). No request was sent.');
  }
  async function copyTrip() {
    if (!travelDraft) return;
    if (!navigator.clipboard?.writeText) {
      setCopyStatus('Copy is not available here. Select the draft text to copy it yourself.'); return;
    }
    try {
      await navigator.clipboard.writeText(travelDraft);
      setCopyStatus('Copied locally. You decide where and whether to share it.');
    } catch {
      setCopyStatus('Copy was blocked. Select the draft text and copy it manually.');
    }
  }
  return <main className="luqi-guide">
    <section className="luqi-guide-intro" aria-labelledby="luqi-guide-chat-heading">
      <p className="luqi-guide-overline"><Globe2 size={17} aria-hidden="true" /> AFRICA IN MIND · MADE FOR REAL LIFE</p>
      <h1 id="luqi-guide-chat-heading">Chat with Luqi</h1>
      <p>Tell Luqi what you're trying to do. Start with free, private-to-this-tab guidance and follow a working tool — or choose the signed-in AI text trial. You decide before any AI question is sent.</p>
      <div className="luqi-guide-intro-actions" role="group" aria-label="Choose how to start">
        <button type="button" className="luqi-guide-submit" onClick={() => document.getElementById('luqi-guide-need')?.focus()}>
          Tell Luqi my goal <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button type="button" className="luqi-guide-secondary" onClick={() => document.getElementById('luqi-guide-ai')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}>
          Go straight to AI Chat <Sparkles size={17} aria-hidden="true" />
        </button>
      </div>
      <p className="luqi-guide-intro-note"><ShieldCheck size={16} aria-hidden="true" /> No booking, payment, account creation or model call happens just by entering a goal.</p>
    </section>
    <SovereignRegionBar />
    <section className="luqi-guide-hero" aria-labelledby="luqi-guide-title">
      <p className="luqi-guide-eyebrow"><MessageCircle size={17} aria-hidden="true" /> START WITH YOUR GOAL · NO SIGN-IN REQUIRED</p>
      <h2 id="luqi-guide-title">Tell Luqi what you need.<br/><em>See a real next step.</em></h2>
      <p className="luqi-guide-lede">Whether you're visiting Africa, learning, creating or building a business, describe your goal. This local guide shows a useful path and clearly marks what cannot yet be verified.</p>
      <form onSubmit={guide} className="luqi-guide-form">
        <label htmlFor="luqi-guide-need">What would you like help with?</label>
        <textarea id="luqi-guide-need" value={need} maxLength={MAX_GUIDE_NEED_CHARS} rows={3}
          onChange={event => { setNeed(event.target.value); setError(''); setCoachDraftReady(false); }}
          spellCheck autoCorrect="on" autoCapitalize="sentences" autoComplete="off"
          placeholder="I'm visiting Cape Town. Help me find a place to stay and check what I'll pay."
          aria-describedby="luqi-guide-privacy" required />
        <div className="luqi-guide-form-bottom">
          <span id="luqi-guide-privacy"><ShieldCheck size={15} aria-hidden="true" /> This step stays in your tab. No live search, booking or paid AI request.</span>
          <button className="luqi-guide-submit" type="submit" disabled={!need.trim()}>
            Find my next step <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        {error && <p role="alert" className="luqi-guide-error">{error}</p>}
        <p className="luqi-guide-coach-note">Not sure how to ask? The free writing helper below can prepare a clearer draft before you decide whether to sign in. Nothing is sent automatically.</p>
        {urgentNeed && <p role="alert" className="luqi-guide-error">For urgent safety needs, use official emergency services. The AI writing helper is paused for this request.</p>}
        <LuqiPromptCoach draft={need} disabled={urgentNeed} focusTargetId="luqi-guide-need"
          onApply={value => { setNeed(value); setError(''); setCoachDraftReady(false); }}
          onUseGuidedDraft={value => {
            if (urgentNeed) return;
            setAiDraft(value); setCoachDraftReady(true); setSubmitted(''); setError(''); clearTravel();
            document.getElementById('luqi-guide-ai')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
          }} />
        {coachDraftReady && <p role="status" className="luqi-guide-coach-ready">Your reviewed draft is ready in optional AI Chat below. Sign-in and separate consent are required to send it.</p>}
      </form>
      <div className="luqi-guide-examples" aria-label="Try a starting point">
        <span>Try an example</span>
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
      <div className="luqi-guide-plan" aria-label="Practical next steps">
        <h3>Here's a useful way forward</h3>
        <ol>{GUIDE_NEXT_STEPS[result.kind].map(step => <li key={step}>{step}</li>)}</ol>
      </div>
      {result.kind !== 'urgent' && <details className="luqi-region-reasoning">
        <summary>Think two steps ahead with KHORO</summary>
        <p>A practical first-principles checklist — questions to investigate, not a legal ruling or AI-generated fact.</p>
        <ol>{getKhoroCriticalThinkingSteps(
          result.kind === 'business' ? 'business' :
          result.kind === 'study' ? 'study' :
          result.kind === 'rights' || result.kind === 'consumer' ? 'rights' : 'general'
        ).map(step => <li key={step}>{step}</li>)}</ol>
      </details>}
      <p className="luqi-guide-followup"><strong>To help you further:</strong> {result.nextQuestion}</p>
      <p className="luqi-guide-caution"><ShieldCheck size={17} aria-hidden="true" /> {result.caution}</p>
      <div className="luqi-guide-actions">
        {result.primaryPath && result.primaryLabel && <Link to={result.primaryPath} className="luqi-guide-secondary">
          {result.primaryLabel} <ArrowRight size={17} aria-hidden="true" />
        </Link>}
        {result.kind !== 'urgent' && <button type="button" className="luqi-guide-submit" onClick={askAi}>
          Use my question in AI Chat <ArrowRight size={17} aria-hidden="true" />
        </button>}
      </div>
      {result.bookingPreview && <div className="luqi-booking-review" aria-labelledby="luqi-booking-review-title">
        <div className="luqi-booking-illustration"><Compass size={29} aria-hidden="true" /><span>No live listing</span></div>
        <div className="luqi-booking-review-body">
          <p className="luqi-guide-overline">BOOKING TRANSPARENCY</p>
          <h3 id="luqi-booking-review-title">See the real offer before you commit</h3>
          <p>No verified property, experience or transport offer is connected yet. Luqi cannot display a real booking or accept payment.</p>
          <p>A future verified offer must show provider, authentic photos and location, dates and group size, live availability timestamp, total price and fees in the stated currency, cancellation terms, and who processes payment.</p>
          <strong className="luqi-booking-unavailable">Booking and checkout unavailable</strong>
        </div>
      </div>}
      {(result.kind === 'booking' || result.kind === 'travel') && <section className="luqi-guide-travel" aria-labelledby="luqi-guide-travel-heading">
        <p className="luqi-guide-overline">USEFUL NOW · NOTHING IS RESERVED</p>
        <h3 id="luqi-guide-travel-heading">Prepare an enquiry for a real provider</h3>
        <p>Write a short brief you can review and copy yourself. Luqi does not search listings, transmit your details, confirm availability or contact anyone.</p>
        <form onSubmit={prepareTrip} autoComplete="off">
          <div className="luqi-guide-travel-fields">
            <label>Destination (city, area or country)
              <input value={trip.destination} maxLength={MAX_TRAVEL_DESTINATION} required
                onChange={event => changeTrip('destination', event.target.value)} placeholder="Cape Town, South Africa" />
            </label>
            <label>When are you going? (optional)
              <input value={trip.dates} maxLength={MAX_TRAVEL_DESTINATION}
                onChange={event => changeTrip('dates', event.target.value)} placeholder="10–15 December" />
            </label>
            <label>Number of travellers
              <input type="number" inputMode="numeric" value={trip.travellers} min={1} max={30} required
                onChange={event => changeTrip('travellers', event.target.value)} />
            </label>
            <label>Maximum total budget and currency (optional)
              <input value={trip.budget} maxLength={MAX_TRAVEL_DESTINATION}
                onChange={event => changeTrip('budget', event.target.value)} placeholder="R3 000 total" />
            </label>
            <label className="luqi-guide-travel-wide">Accessibility needs or preferences (optional)
              <textarea value={trip.preferences} maxLength={MAX_TRAVEL_DETAIL} rows={2}
                onChange={event => changeTrip('preferences', event.target.value)} placeholder="Wheelchair access, family-friendly, close to transport…" />
            </label>
          </div>
          <p className="luqi-guide-travel-note">Please use non-sensitive details. This is for your own review; entering details does not send them anywhere.</p>
          <button className="luqi-guide-submit" type="submit">Prepare provider enquiry</button>
        </form>
        {travelDraft && <div className="luqi-guide-travel-output">
          <label htmlFor="luqi-travel-enquiry-draft">Your editable-by-copy draft (not a booking)</label>
          <textarea id="luqi-travel-enquiry-draft" value={travelDraft} readOnly rows={10} />
          <button className="luqi-guide-secondary" type="button" onClick={() => { void copyTrip(); }}>Copy enquiry</button>
        </div>}
        {copyStatus && <p role="status" className="luqi-guide-travel-note">{copyStatus}</p>}
      </section>}
    </section>}
    <section className="luqi-guide-chat-section luqi-chat-first" aria-labelledby="luqi-guide-ai-heading" id="luqi-guide-ai">
      <div className="luqi-guide-chat-heading"><Sparkles size={22} aria-hidden="true" />
        <div><p className="luqi-guide-overline">OPTIONAL · CONSENT-GATED TEXT AI PILOT</p>
          <h2 id="luqi-guide-ai-heading">Continue with AI Chat</h2></div></div>
      <p>Your selected question can be copied into the AI composer. Signing in, preparing a question or checking readiness does not send a paid inference request.</p>
      <AiPilotPage embedded initialQuestion={aiDraft} />
    </section>
    <section className="luqi-guide-bottom" aria-label="More ways to use Luqi">
      <h2>Useful tools, connected by your goal.</h2>
      <p>Luqi connects you to real browser-based tools for study, business, creative work and local calculations. It does not pretend to have live reservations, official data feeds or autonomous agents.</p>
      <div>
        <Link to="/start">See available tools <ArrowRight size={17} aria-hidden="true" /></Link>
        <Link to="/companion">Open private notes <ArrowRight size={17} aria-hidden="true" /></Link>
        <Link to="/service-status">Check service status <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
  </main>;
}
