import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import AccountAccessForm from '../components/AccountAccessForm';
import { askPilot, pilotAvailability, PilotChatError, type PilotReply } from '../lib/ai-pilot';
import type { AccountSession } from '../lib/private-conversations';

export default function AiPilotPage() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [prompt, setPrompt] = useState(''); const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<PilotReply | null>(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const epoch = useRef(0); const locked = useRef(false);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10_000);
    void pilotAvailability(controller.signal).then(value => {
      if (!controller.signal.aborted) setAvailable(value);
    }).catch(() => {}).finally(() => { clearTimeout(timer); setChecking(false); });
    return () => { epoch.current++; controller.abort(); pending.current?.abort(); clearTimeout(timer); };
  }, []);

  function signOut() {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    setSession(null); setPrompt(''); setAnswer(null); setNotice(''); setConsent(false); setBusy(false); setUncertain(false);
  }
  async function submit() {
    if (!session || !consent || !available || locked.current || uncertain || !prompt.trim()) return;
    locked.current = true; setBusy(true); setAnswer(null); setNotice('');
    const version = epoch.current; const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const result = await askPilot(session.token, prompt, controller.signal);
      if (epoch.current === version) { setAnswer(result); setPrompt(''); }
    } catch (error) {
      if (epoch.current !== version) return;
      const code = error instanceof PilotChatError ? error.code : 'RESPONSE_UNCONFIRMED';
      if (code === 'AUTH_REQUIRED') { signOut(); setNotice('Your session ended. Sign in again.'); return; }
      if (code === 'RESPONSE_UNCONFIRMED') {
        setUncertain(true); setNotice('The reply could not be confirmed. A provider attempt may have been charged. We will not retry automatically.');
      } else if (code === 'AI_USER_DAILY_QUOTA_EXHAUSTED') setNotice('Your daily allowance of 20 provider attempts has been reached. Try another UTC day.');
      else if (code === 'AI_PROVIDER_BUDGET_EXHAUSTED') setNotice('The monthly provider allowance has been reached. No further attempt was started on that provider.');
      else setNotice('AI replies are unavailable. Failed provider attempts may still count toward the allowance.');
    } finally {
      clearTimeout(timer);
      if (epoch.current === version) { locked.current = false; pending.current = null; setBusy(false); }
    }
  }

  return <main className="luqi-info" aria-labelledby="ai-trial-heading">
    <p className="luqi-eyebrow">SIGNED-IN TEXT TRIAL</p><h1 id="ai-trial-heading">Try a question with LUQI</h1>
    <p>Gemini answers first, with OpenAI as a separately limited fallback. This is an experimental text-only trial; answers can be wrong. No browsing, sources, tools, files, voice or autonomous actions are enabled.</p>
    <p role="status">{checking ? 'Checking AI configuration…' : available
      ? 'Provider access is configured. Live replies remain subject to provider availability and shared spending limits.'
      : 'AI requests are paused or unavailable. No question can be sent from this page.'}</p>
    <p>Up to 20 provider attempts per account per UTC day. A fallback uses another attempt. Replies are limited to 512 tokens. African-language accuracy has not been independently evaluated.</p>
    {notice && <p role="alert">{notice}</p>}
    {!session ? <AccountAccessForm purpose="ai" onAuthenticated={value => { epoch.current++; setSession(value); setNotice(''); }} /> : <>
      <section><p>Signed in as {session.user.email}</p><button className="luqi-secondary" type="button" onClick={signOut}>Sign out</button></section>
      <section><h2>Ask one question</h2>
        <p>Only the question below is sent to the providers. Your private notes and account email are not added to it. Questions and replies stay in this page’s memory; leaving, reloading or signing out clears them.</p>
        <form onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label className="block">Your question<textarea className="luqi-access-input" rows={5} maxLength={6000}
            disabled={busy || uncertain} required value={prompt} onChange={event => setPrompt(event.target.value)} /></label>
          <p>{prompt.length}/6000 characters</p>
          <label className="block"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /> I understand my question goes to Google Gemini and may also go to OpenAI. I will use ordinary test content.</label>
          <p><Link to="/privacy">Read the provider privacy information</Link></p>
          <button className="luqi-primary" disabled={!available || !consent || !prompt.trim() || busy || uncertain}>
            {busy ? 'Waiting for a reply…' : 'Send question'}
          </button>
        </form>
        {uncertain && <button className="luqi-secondary" type="button" onClick={() => { setUncertain(false); setPrompt(''); setNotice(''); }}>Start a new question</button>}
      </section>
      {answer && <section aria-labelledby="ai-reply-heading"><h2 id="ai-reply-heading">AI reply</h2>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{answer.response}</p>
        <p>Provider: {answer.provider} · Model: {answer.provider_model}</p>
      </section>}
    </>}
    <p><Link to="/companion">Open your private notes</Link> · <Link to="/start">Back to getting started</Link></p>
  </main>;
}
