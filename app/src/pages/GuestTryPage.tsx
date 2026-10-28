import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useCustomerSession } from '../providers/customer-session';
import { ArrowRight, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import SafePilotText from '../components/SafePilotText';
import '../guest-trial.css';

type Turn = { sender: 'user' | 'ai'; text: string };
type Trial = { enabled: boolean; remaining: number; limit: number;
  reason: 'ready' | 'paused' | 'complete' | 'unavailable' };
const unavailable: Trial = { enabled: false, remaining: 0, limit: 3, reason: 'unavailable' };
const examples = [
  'Explain gravity to my two-year-old using a colourful ball.',
  'Help me write a friendly message to a customer.',
  'Give me three ideas for a small business in South Africa.',
];
const MAX_PROMPT = 800;
const MAX_RESPONSE_BYTES = 30_000;

async function readBoundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) throw new Error('Response too large');
  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) throw new Error('Response too large');
  return JSON.parse(text);
}
function isTrial(value: unknown): value is Trial {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  return typeof x.enabled === 'boolean' && typeof x.remaining === 'number' && x.remaining >= 0 &&
    x.remaining <= 3 && x.limit === 3 && ['ready', 'paused', 'complete', 'unavailable'].includes(String(x.reason));
}

/** A real guest AI call is made only when the visitor separately consents and
 * clicks Send. No login or browser model key; the HttpOnly guest cookie is
 * issued and validated by the server.
 */
export default function GuestTryPage() {
  const { session } = useCustomerSession();
  const [trial, setTrial] = useState<Trial>(unavailable);
  const [checking, setChecking] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState('');
  const sending = useRef(false);
  const pending = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    const control = new AbortController();
    const timeout = setTimeout(() => control.abort(), 10_000);
    try {
      const response = await fetch('/api/v1/guest-chat', { method: 'GET',
        credentials: 'same-origin', signal: control.signal, cache: 'no-store' });
      const value = await readBoundedJson(response);
      if (!control.signal.aborted) setTrial(response.ok && isTrial(value) ? value : unavailable);
    } catch { if (!control.signal.aborted) setTrial(unavailable); }
    finally { clearTimeout(timeout); if (!control.signal.aborted) setChecking(false);
      else setChecking(false); }
  }, []);

  useEffect(() => {
    if (!session) void refresh();
    return () => { pending.current?.abort(); };
  }, [refresh, session]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = prompt.trim();
    if (sending.current || busy || !trial.enabled || !consent || !question ||
        question.length > MAX_PROMPT || uncertain) return;
    sending.current = true; setBusy(true); setNotice('');
    const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 35_000);
    try {
      const history = turns.slice(-2).map(({ sender, text }) => ({ sender, text: text.slice(0, 250) }));
      const response = await fetch('/api/v1/guest-chat', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question, ...(history.length ? { history } : {}) }),
      });
      const value = await readBoundedJson(response) as Record<string, unknown>;
      if (!response.ok || value.status !== 'success' || value.provider !== 'gemini' ||
          typeof value.response !== 'string' || !value.response.trim() || value.response.length > 20_000 ||
          !Number.isInteger(value.remaining) || (value.remaining as number) < 0 ||
          (value.remaining as number) > 3) {
        if (response.status === 429 && value.code === 'GUEST_TRIAL_COMPLETE') {
          setTrial({ enabled: false, remaining: 0, limit: 3, reason: 'complete' });
          setNotice('You have used your three guest replies. Create a Luqi account to continue with the signed-in allowance.');
        } else if (response.status === 429 && value.code === 'GUEST_TRIAL_PAUSED') {
          setTrial({ enabled: false, remaining: 0, limit: 3, reason: 'paused' });
          setNotice('The shared guest allowance is paused. No additional request was started.');
        } else {
          setUncertain(true);
          setNotice('Luqi could not confirm this reply. A guest attempt may have counted, and we will not retry it automatically.');
        }
        return;
      }
      setTurns(old => [...old, { sender: 'user' as const, text: question }, { sender: 'ai' as const, text: value.response as string }].slice(-6));
      setPrompt('');
      const remaining = value.remaining as number;
      setTrial({ enabled: remaining > 0, remaining, limit: 3, reason: remaining ? 'ready' : 'complete' });
    } catch {
      setUncertain(true);
      setNotice('The connection was interrupted. A guest reply may have counted; Luqi will not send another request automatically.');
    } finally {
      clearTimeout(timer); pending.current = null; sending.current = false; setBusy(false);
    }
  }

  // Existing customers should use their own governed allowance, not the guest pool.
  if (session) return <Navigate to="/chat" replace />;
  return <main className="luqi-guest-trial" aria-labelledby="luqi-guest-heading">
    <div className="luqi-guest-intro">
      <p className="luqi-eyebrow"><Sparkles size={16} aria-hidden="true" /> TRY LUQI WITHOUT REGISTERING</p>
      <h1 id="luqi-guest-heading">Ask first. Decide later.</h1>
      <p>Try up to three real AI replies during the current month without an account. Ask Luqi to explain something, help write a message, or plan an idea. You control each request.</p>
      <p className="luqi-guest-honesty"><ShieldCheck size={18} aria-hidden="true" /> No demo answers, payment or automatic model calls. The server uses a strictly limited, secure guest cookie. Recent messages from this tab are included to understand follow-up questions.</p>
    </div>
    <section className="luqi-guest-chat" aria-label="Guest conversation">
      <div className="luqi-guest-bar">
        <span><MessageCircle size={19} aria-hidden="true" /> Luqi guest Chat</span>
        <span role="status">{checking ? 'Checking availability…' :
          trial.enabled ? `${trial.remaining} of ${trial.limit} replies remaining` :
          trial.reason === 'complete' ? 'Guest trial complete' :
          trial.reason === 'paused' ? 'Guest allowance paused' : 'Guest AI unavailable'}</span>
      </div>
      <div className="luqi-guest-messages" aria-label="Guest replies in this tab">
        {!turns.length ? <div className="luqi-guest-welcome">
          <h2>What would you like to explore?</h2>
          <p>Start with one real question. Your previous confirmed question and Luqi's reply can help with a short follow-up.</p>
          <div className="luqi-guest-examples" role="group" aria-label="Try a guest question">
            {examples.map(example => <button type="button" key={example} disabled={busy}
              onClick={() => { setPrompt(example); document.getElementById('luqi-guest-question')?.focus(); }}>{example}</button>)}
          </div>
        </div> : turns.map((turn, i) => <article key={i} className={'luqi-guest-message luqi-guest-' + turn.sender}>
          <strong>{turn.sender === 'user' ? 'You' : 'Luqi'}</strong>
          {turn.sender === 'user' ? <p>{turn.text}</p> : <div className="luqi-chat-richtext"><SafePilotText text={turn.text} /></div>}
        </article>)}
      </div>
      {notice && <p role="alert" className="luqi-guest-notice">{notice}</p>}
      {trial.enabled && <form onSubmit={send} className="luqi-guest-composer">
        <label htmlFor="luqi-guest-question">Message Luqi</label>
        <textarea id="luqi-guest-question" value={prompt} rows={3} maxLength={MAX_PROMPT}
          disabled={busy || uncertain} placeholder="What would you like to know or create?"
          onChange={e => setPrompt(e.target.value)} />
        {!consent && <label className="luqi-guest-consent">
          <input type="checkbox" checked={consent} disabled={busy}
            onChange={e => setConsent(e.target.checked)} />
          <span>I agree to send this question and up to two short recent messages to Google Gemini for the guest trial. I won't share sensitive information. <Link to="/privacy">Privacy</Link>.</span>
        </label>}
        {consent && <p className="luqi-guest-consented">You approved this tab's guest questions for Google Gemini. You still choose when to press Send.</p>}
        <div className="luqi-guest-compose-actions">
          <span>{prompt.trim().length}/{MAX_PROMPT} characters · No paid retry</span>
          <button type="submit" disabled={!trial.enabled || !consent || !prompt.trim() || busy || uncertain}>
            {busy ? 'Waiting for Luqi…' : 'Ask Luqi'} <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </form>}
      {uncertain && <button type="button" className="luqi-guest-refresh" onClick={() => {
        setUncertain(false); setPrompt(''); setNotice('');
        void refresh();
      }}>Check remaining guest replies</button>}
      {!checking && !trial.enabled && <div className="luqi-guest-finished">
        <h2>{trial.reason === 'complete' ? 'Enjoyed chatting? Keep going with Luqi.' : 'Try Luqi in another way'}</h2>
        <p>{trial.reason === 'complete'
          ? 'Your guest allowance has ended. Registration gives you a separate signed-in AI allowance and access to private notes and account-only services.'
          : 'The real guest AI trial is currently limited or unavailable. Free local guides, calculators and the basic Studio remain accessible without an account.'}</p>
        <Link className="luqi-guest-primary" to="/join">Create a free account</Link>
        <Link to="/ask">Explore free Luqi tools</Link>
      </div>}
    </section>
    <section className="luqi-guest-benefits" aria-labelledby="luqi-guest-benefits-heading">
      <h2 id="luqi-guest-benefits-heading">Why create a Luqi account?</h2>
      <div>
        <article><h3>Keep asking</h3><p>A registered account has a larger, separately limited daily Chat allowance when AI is available.</p></article>
        <article><h3>Keep useful ideas</h3><p>Use private notes and the signed-in tools. Guest chats and unsaved drafts are not transferred automatically.</p></article>
        <article><h3>Create more</h3><p>Explore image-learning tools and develop a project with Luqi. Some advanced services are still in development.</p></article>
      </div>
      <p>Guest history lasts only in this tab. Registering does not automatically buy anything or subscribe you to a plan.</p>
      <Link className="luqi-guest-primary" to="/join">Create my Luqi account <ArrowRight size={17} aria-hidden="true" /></Link>
      <Link to="/chat">Already registered? Sign in through Chat</Link>
    </section>
  </main>;
}
