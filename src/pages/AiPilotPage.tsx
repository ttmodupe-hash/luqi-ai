import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import AccountAccessForm from '../components/AccountAccessForm';
import { askPilot, pilotAvailability, PilotChatError, type PilotReply } from '../lib/ai-pilot';
import { useCustomerSession } from '../providers/customer-session';
import { MAX_PILOT_QUESTION_CHARS, buildPilotInput } from '../lib/pilot-input';
import { previewPilotHistory, type PilotConversationTurn } from '../lib/pilot-conversation';

export default function AiPilotPage({ embedded = false, initialQuestion = '' }: { embedded?: boolean; initialQuestion?: string } = {}) {
  const { session, acceptSession, signOut: signOutShared } = useCustomerSession();
  const previousToken = useRef<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [prompt, setPrompt] = useState(''); const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<PilotReply | null>(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [turns, setTurns] = useState<PilotConversationTurn[]>([]);
  const [shareContext, setShareContext] = useState(false);
  const questionLength = prompt.trim().length;
  const tooLong = questionLength > MAX_PILOT_QUESTION_CHARS;
  const contextPreview = shareContext ? previewPilotHistory(turns) : [];
  const contextTooLong = (() => {
    if (!prompt.trim() || tooLong) return false;
    try { buildPilotInput(prompt.trim(), 'auto', contextPreview); return false; }
    catch { return true; }
  })();
  const epoch = useRef(0); const locked = useRef(false);
  const pending = useRef<AbortController | null>(null);

  // Switching identity must never forward the previous user's question or consent.
  useEffect(() => {
    const token = session?.token ?? null;
    if (previousToken.current && previousToken.current !== token) {
      epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
      setPrompt(''); setAnswer(null); setConsent(false); setBusy(false); setUncertain(false);
      setTurns([]); setShareContext(false); setNotice('');
    }
    previousToken.current = token;
  }, [session?.token]);

  useEffect(() => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10_000);
    void pilotAvailability(controller.signal).then(value => {
      if (!controller.signal.aborted) setAvailable(value);
    }).catch(() => {}).finally(() => { clearTimeout(timer); setChecking(false); });
    return () => { epoch.current++; controller.abort(); pending.current?.abort(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() && initialQuestion.length <= MAX_PILOT_QUESTION_CHARS) {
      setPrompt(initialQuestion);
    }
  }, [initialQuestion]);

  function signOut() {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    previousToken.current = null; signOutShared(); setPrompt(''); setAnswer(null); setNotice(''); setConsent(false); setBusy(false); setUncertain(false);
    setTurns([]); setShareContext(false);
  }
  async function submit() {
    if (!session || !consent || !available || locked.current || uncertain || !prompt.trim() || tooLong || contextTooLong) return;
    const submittedQuestion = prompt;
    const approvedHistory = shareContext ? previewPilotHistory(turns) : [];
    locked.current = true; setBusy(true); setAnswer(null); setNotice('');
    // Sharing is a one-request decision; subsequent prompts default to no context.
    setShareContext(false);
    const version = epoch.current; const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const result = await askPilot(session.token, submittedQuestion, controller.signal, fetch, approvedHistory);
      if (epoch.current === version) {
        setAnswer(result);
        setTurns(previous => {
          const next: PilotConversationTurn[] = [
            ...previous,
            { sender: 'user', text: submittedQuestion },
            { sender: 'ai', text: result.response },
          ];
          return next.slice(-8);
        });
        setPrompt('');
      }
    } catch (error) {
      if (epoch.current !== version) return;
      const code = error instanceof PilotChatError ? error.code : 'RESPONSE_UNCONFIRMED';
      if (code === 'AUTH_REQUIRED') { signOut(); setNotice('Your session ended. Sign in again.'); return; }
      if (code === 'RESPONSE_UNCONFIRMED') {
        setUncertain(true); setNotice('The reply could not be confirmed. A provider attempt may have been charged. We will not retry automatically.');
      } else if (code === 'AI_INPUT_TOO_LARGE' || code === 'INVALID_INPUT') {
        setNotice('Your question could not be sent as entered. Shorten or correct it; no provider attempt was started.');
      } else if (code === 'AI_RESPONSE_BLOCKED') {
        setNotice('The provider declined the request or withheld its reply. No further provider was tried after that decision. The attempt may still count toward your allowance.');
      } else if (code === 'AI_REPLY_INCOMPLETE') {
        setNotice('The provider stopped before completing a reply. Unfinished text was not shown and no automatic continuation was requested. The attempt may still count toward your allowance. Try a shorter question.');
      } else if (code === 'AI_RESPONSE_INVALID') {
        setNotice('The provider reply could not be verified. It was not shown or retried automatically. The attempt may still count toward your allowance.');
      } else if (code === 'AI_USER_DAILY_QUOTA_EXHAUSTED') setNotice('Your daily allowance of 20 provider attempts has been reached. Try another UTC day.');
      else if (code === 'AI_PROVIDER_BUDGET_EXHAUSTED') setNotice('The monthly provider allowance has been reached. No further attempt was started on that provider.');
      else setNotice('AI replies are unavailable. Failed provider attempts may still count toward the allowance.');
    } finally {
      clearTimeout(timer);
      if (epoch.current === version) { locked.current = false; pending.current = null; setBusy(false); }
    }
  }

  const Root = embedded ? 'section' : 'main';
  const Heading = embedded ? 'h2' : 'h1';
  const Subheading = embedded ? 'h3' : 'h2';
  return <Root className={embedded ? 'luqi-info luqi-guide-ai' : 'luqi-info'} aria-labelledby="ai-trial-heading">
    <p className="luqi-eyebrow">SIGNED-IN TEXT TRIAL</p><Heading id="ai-trial-heading">Try a question with LUQI</Heading>
    <p>Ask a real AI question. Gemini answers first, with OpenAI as a separately limited fallback. This is an experimental text-only trial; answers can be wrong. No browsing, sources, tools, files, voice or autonomous actions are enabled.</p>
    <p role="status">{checking ? 'Checking AI configuration…' : available
      ? 'Provider access is configured. Live replies remain subject to provider availability and shared spending limits.'
      : 'AI requests are paused or unavailable. No question can be sent from this page.'}</p>
    <p>Up to 20 provider attempts per account per UTC day. A fallback uses another attempt. Replies are limited to 512 tokens. African-language accuracy has not been independently evaluated.</p>
    {notice && <p role="alert">{notice}</p>}
    {!session ? <AccountAccessForm purpose="ai" onAuthenticated={value => { epoch.current++; acceptSession(value); setNotice(''); setAnswer(null); setTurns([]); setShareContext(false); }} /> : <>
      <section><p>Signed in as {session.user.email}. This LUQI login works across customer tools in this tab.</p><button className="luqi-secondary" type="button" onClick={signOut}>Sign out</button></section>
      <section><Subheading>Ask LUQI</Subheading>
        <p>Only your question is sent by default. Optionally include a short, reviewed conversation preview for a follow-up. Your private notes and account email are never attached. Questions and replies stay in this page’s memory; leaving, reloading or signing out clears them.</p>
        <form onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label className="block" htmlFor="ai-question">Your question</label>
          <textarea id="ai-question" className="luqi-access-input" rows={5}
            aria-describedby="ai-question-limit" aria-invalid={tooLong || contextTooLong || undefined}
            disabled={busy || uncertain} required value={prompt} onChange={event => setPrompt(event.target.value)} />
          <p id="ai-question-limit">{questionLength}/{MAX_PILOT_QUESTION_CHARS} characters. Request formatting uses the rest of the 6000-character input limit.
            {tooLong && ' Shorten your question. It will not be sent or shortened automatically.'}
            {contextTooLong && ' Your question plus selected conversation context exceeds the input limit. Shorten the question or turn off context; nothing will be sent.'}</p>
          {turns.length > 0 && <div className="luqi-chat-context">
            <label className="block"><input type="checkbox" checked={shareContext} disabled={busy}
              onChange={event => setShareContext(event.target.checked)} /> Include recent conversation context in this request (optional)</label>
            <p>Off by default. If enabled, up to four recent turns, shortened to 350 characters each, will be sent to the provider with your next question. Review the exact preview first.</p>
            {shareContext && <details open><summary>Review the conversation context to be sent</summary>
              <ol>{contextPreview.map((turn, index) => <li key={index}><strong>{turn.sender === 'user' ? 'You' : 'LUQI'}:</strong> {turn.text}</li>)}</ol>
            </details>}
          </div>}
          <label className="block"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /> I understand my question goes to Google Gemini and may also go to OpenAI. I will use ordinary test content.</label>
          <p><Link to="/privacy">Read the provider privacy information</Link></p>
          <button className="luqi-primary" disabled={!available || !consent || !prompt.trim() || tooLong || contextTooLong || busy || uncertain}>
            {busy ? 'Waiting for a reply…' : 'Send question'}
          </button>
        </form>
        {uncertain && <button className="luqi-secondary" type="button" onClick={() => { setUncertain(false); setPrompt(''); setNotice(''); }}>Start a new question</button>}
      </section>
      {turns.length > 2 && <section aria-label="Earlier conversation turns"><Subheading>Earlier conversation</Subheading>
        <ol>{turns.slice(0, -2).map((turn, index) => <li key={index}>
          <strong>{turn.sender === 'user' ? 'You' : 'LUQI'}:</strong> <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{turn.text}</span>
        </li>)}</ol>
      </section>}
      {answer && <section aria-labelledby="ai-reply-heading"><Subheading id="ai-reply-heading">AI reply</Subheading>
        <p><strong>Your question:</strong> {turns.at(-2)?.text}</p>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{answer.response}</p>
        <p>Provider: {answer.provider} · Model: {answer.provider_model}</p>
      </section>}
    </>}
    <p>Notes are optional. This conversation stays in this page's memory and is not saved to Notes. <Link to="/start">Explore other tools</Link></p>
  </Root>;
}
