import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import AccountAccessForm from '../components/AccountAccessForm';
import { askPilot, pilotAvailability, PilotChatError, type PilotReply } from '../lib/ai-pilot';
import { useCustomerSession } from '../providers/customer-session';
import { useSovereignRegion } from '../providers/sovereign-region';
import { AFRICAN_REGIONAL_PROFILES } from '../services/panAfricanSovereignEngine';
import { MAX_PILOT_QUESTION_CHARS, buildPilotInput } from '../lib/pilot-input';
import { previewPilotHistory, type PilotConversationTurn } from '../lib/pilot-conversation';
import { guideLuqiNeed } from '../lib/luqi-intent-guide';
import SafePilotText from '../components/SafePilotText';
import { Send, Sparkles } from 'lucide-react';
import { useOptionalChatWorkspace } from '../providers/chat-workspace';
import '../chat.css';

export default function AiPilotPage({ embedded = false, initialQuestion = '', workspaceMode = false }: { embedded?: boolean; initialQuestion?: string; workspaceMode?: boolean } = {}) {
  const { session, acceptSession, signOut: signOutShared } = useCustomerSession();
  const optionalChatWorkspace = useOptionalChatWorkspace();
  const workspace = workspaceMode ? optionalChatWorkspace : null;
  const { region } = useSovereignRegion();
  const [shareRegion, setShareRegion] = useState(false);
  const previousToken = useRef<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [prompt, setPrompt] = useState(''); const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<PilotReply | null>(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [turns, setTurns] = useState<PilotConversationTurn[]>([]);
  const [shareContext, setShareContext] = useState(false);
  // Changing a country invalidates prior optional provider-processing approval.
  useEffect(() => { setShareRegion(false); }, [region]);
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
  const availabilityPending = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const selectionSeen = useRef<number | null>(null);

  // A transient startup failure must not force a reload (and lose the session).
  // Only this public GET is repeatable. Never replay an AI request or clear its
  // uncertain outcome when the user checks configuration again.
  const checkAvailability = useCallback(async () => {
    if (!mounted.current || availabilityPending.current) return;
    const controller = new AbortController(); availabilityPending.current = controller;
    setChecking(true); setAvailable(false);
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const value = await pilotAvailability(controller.signal);
      if (!controller.signal.aborted && availabilityPending.current === controller) setAvailable(value);
    } catch { /* Keep requests paused; no inference or automatic retry. */ }
    finally {
      clearTimeout(timer);
      if (mounted.current && availabilityPending.current === controller) {
        availabilityPending.current = null; setChecking(false);
      }
    }
  }, []);

  // Clear the former identity before paint; never forward its question or consent.
  useLayoutEffect(() => {
    const token = session?.token ?? null;
    if (previousToken.current && previousToken.current !== token) {
      epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
      setPrompt(''); setAnswer(null); setConsent(false); setBusy(false); setUncertain(false);
      setTurns([]); setShareContext(false); setShareRegion(false); setNotice('');
    }
    previousToken.current = token;
  }, [session?.token]);

  // Switching recent chats cancels any pending response and clears old consent.
  // The history is limited to confirmed replies in this tab, never storage.
  useLayoutEffect(() => {
    if (!workspace || selectionSeen.current === workspace.selectionVersion) return;
    selectionSeen.current = workspace.selectionVersion;
    const wasPending = locked.current;
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    setPrompt(''); setAnswer(workspace.activeThread?.lastReply ?? null);
    setTurns(workspace.activeThread?.turns ?? []);
    setShareContext(false); setShareRegion(false); setConsent(false);
    setBusy(false); setUncertain(false);
    setNotice(wasPending ? 'The pending reply was cancelled locally. An attempt may still count toward your allowance.' : '');
  }, [workspace?.selectionVersion]);

  useEffect(() => {
    mounted.current = true;
    void checkAvailability();
    return () => {
      mounted.current = false; epoch.current++;
      availabilityPending.current?.abort(); availabilityPending.current = null;
      pending.current?.abort();
    };
  }, [checkAvailability]);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim() && initialQuestion.length <= MAX_PILOT_QUESTION_CHARS) {
      setPrompt(initialQuestion);
    }
  }, [initialQuestion]);

  function signOut() {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    previousToken.current = null; signOutShared(); setPrompt(''); setAnswer(null); setNotice(''); setConsent(false); setBusy(false); setUncertain(false);
    setTurns([]); setShareContext(false); setShareRegion(false);
  }
  function newChat() {
    if (locked.current) return;
    if (workspace) { workspace.startNewChat(); return; }
    epoch.current++;
    setPrompt(''); setAnswer(null); setTurns([]); setShareContext(false);
    setConsent(false); setShareRegion(false); setUncertain(false); setNotice('Chat cleared. You are still signed in.');
  }
  async function submit() {
    if (!session || !consent || !available || availabilityPending.current || locked.current || uncertain || !prompt.trim() || tooLong || contextTooLong) return;
    const submittedQuestion = prompt;
    const approvedHistory = shareContext ? previewPilotHistory(turns) : [];
    const approvedRegion = shareRegion && region !== 'PAN_AFRICAN_AU' ? region : undefined;
    // Keep the last confirmed reply visible while a follow-up is pending or
    // fails. The next successful reply replaces it; errors never erase it.
    locked.current = true; setBusy(true); setNotice('');
    // Sharing is a one-request decision; subsequent prompts default to no context.
    setShareContext(false); setShareRegion(false);
    const version = epoch.current; const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const result = await askPilot(session.token, submittedQuestion, controller.signal, fetch, approvedHistory, approvedRegion);
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
        workspace?.recordConfirmedReply(submittedQuestion, result);
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

  // The next-step link comes only from the customer's own verified question,
  // never from model output or an untrusted tool command. No tool runs automatically.
  const nextStep = answer ? guideLuqiNeed(turns.at(-2)?.text) : null;
  const actionablePath = nextStep?.primaryPath && nextStep.primaryPath !== '/ai-trial' ? nextStep.primaryPath : null;
  if (workspace) {
    const canSend = !!session && !checking && available && consent && !!prompt.trim() &&
      !tooLong && !contextTooLong && !busy && !uncertain;
    return <main className="luqi-chat-canvas" aria-labelledby="luqi-workspace-chat-heading">
      <header className="luqi-chat-canvas-header">
        <div>
          <h1 id="luqi-workspace-chat-heading">LUQIChat</h1>
          <p>Your AI conversation, with useful tools one click away.</p>
        </div>
        <span className="luqi-chat-canvas-tag">Limited text pilot</span>
      </header>
      <div className="luqi-chat-availability-row">
        <span role="status">{checking ? 'Checking AI readiness…' :
          available ? 'AI provider configured · real replies depend on live limits' :
            'AI requests paused · no question can be sent'}</span>
        <button type="button" disabled={checking || busy} onClick={() => { void checkAvailability(); }}>
          {checking ? 'Checking…' : 'Check availability'}
        </button>
      </div>
      {notice && <p role="alert" className="luqi-chat-notice">{notice}</p>}
      <section className="luqi-chat-transcript" aria-label="Confirmed conversation in this tab">
        {!turns.length ? <div className="luqi-chat-welcome">
          <span className="luqi-chat-welcome-symbol"><Sparkles size={25} aria-hidden="true" /></span>
          <h2>What can LUQI help you with?</h2>
          <p>Explore ideas, learning and everyday problems with a practical African perspective. Ask a question below, or jump straight into a working tool on the left.</p>
          {session && <div className="luqi-chat-quick-prompts" role="group" aria-label="Starting questions">
            {[
              ['Study with LUQI', 'Explain a useful study technique with a simple example.'],
              ['Plan my business', 'Help me plan the first three steps for a small business idea.'],
              ['Write a message', 'Help me draft a friendly response to a customer.'],
              ['Explore Africa', 'What should I research before visiting a new African country?'],
            ].map(([label, text]) => <button type="button" key={label} disabled={busy || uncertain}
              onClick={() => { setPrompt(text); document.getElementById('ai-question')?.focus(); }}>{label}</button>)}
          </div>}
        </div> : <>
          {turns.map((turn, index) => <article key={index}
            className={'luqi-chat-message ' + (turn.sender === 'user' ? 'luqi-chat-message-user' : 'luqi-chat-message-ai')}>
            <strong>{turn.sender === 'user' ? 'You' : 'LUQIChat'}</strong>
            <p>{turn.sender === 'user' ? turn.text : <SafePilotText text={turn.text} />}</p>
          </article>)}
          {answer && <p className="luqi-chat-provider">Last confirmed answer: {answer.provider} · {answer.provider_model}</p>}
          {actionablePath && <p className="luqi-chat-next-step">Continue using a real tool: <Link to={actionablePath}>{nextStep?.primaryLabel}</Link>. This suggestion is based on your question, not a verified AI action.</p>}
        </>}
      </section>
      {!session ? <div className="luqi-chat-login">
        <p>Use one LUQI account for Chat, private notes and your other signed-in services.</p>
        <AccountAccessForm purpose="ai" onAuthenticated={value => {
          epoch.current++; acceptSession(value); setNotice(''); setAnswer(null);
          setTurns([]); setShareContext(false);
        }} />
      </div> : <form className="luqi-chat-compose-panel" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <label className="block" htmlFor="ai-question">Your question</label>
        <textarea id="ai-question" rows={2} required value={prompt}
          aria-describedby="ai-question-limit" aria-invalid={tooLong || contextTooLong || undefined}
          disabled={busy || uncertain} maxLength={MAX_PILOT_QUESTION_CHARS + 1}
          placeholder="Ask LUQI about an idea, a study topic, a trip or a challenge…"
          onChange={event => setPrompt(event.target.value)} />
        <label className="luqi-chat-consent">
          <input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />
          <span>I understand this question may go to Gemini or OpenAI within the trial limits. I'll use non-sensitive content.</span>
        </label>
        <details className="luqi-chat-compose-details">
          <summary>Conversation context, country guide and limits (optional)</summary>
          <p>Consent is per request. No private notes, account email, browsing or voice are attached automatically.</p>
          {turns.length > 0 && <label><input type="checkbox" checked={shareContext} disabled={busy}
            onChange={event => setShareContext(event.target.checked)} /> Include reviewed previous turns in this question (off by default)</label>}
          {shareContext && <ol aria-label="Context to send">{contextPreview.map((turn, index) => <li key={index}>
            <strong>{turn.sender === 'user' ? 'You' : 'LUQI'}:</strong> {turn.text}
          </li>)}</ol>}
          {region !== 'PAN_AFRICAN_AU' && <label><input type="checkbox" checked={shareRegion} disabled={busy}
            onChange={event => setShareRegion(event.target.checked)} /> Include selected guide for {AFRICAN_REGIONAL_PROFILES[region].country} in this one request</label>}
          <p>Country context requires a separate opt-in. <Link to="/ask">Choose a country in the local guide</Link>. Neither this guide nor the text model makes a booking or legal filing.</p>
          <p>20 provider attempts per account per UTC day, maximum 512 reply tokens, limited shared provider budget. Fallback may consume another attempt.</p>
          <p>Chat history remains only in this tab, with up to four recent exchanges per thread. Switching chats or reloading discards unsent drafts. Nothing is saved in private notes.</p>
          <Link to="/privacy">Privacy and provider information</Link>
        </details>
        <div className="luqi-chat-compose-actions">
          <span id="ai-question-limit" className="luqi-chat-limit">
            {questionLength}/{MAX_PILOT_QUESTION_CHARS} characters
            {contextTooLong && ' · Question and optional context exceed the allowed input'}
            {tooLong && ' · Shorten before sending'}
          </span>
          {uncertain ? <button type="button" onClick={() => {
            setUncertain(false); setPrompt(''); setNotice('');
          }}>Start a new question</button> : <button type="button" disabled={busy} onClick={newChat}>New chat</button>}
          <button type="submit" disabled={!canSend}>
            <Send size={16} aria-hidden="true" /> {busy ? 'Waiting…' : 'Send question'}
          </button>
        </div>
      </form>}
      <p className="luqi-chat-caption">
        Only verified replies appear here. A timeout is never retried automatically.
        This in-tab history is cleared on sign-out or reload; it is not cloud-saved.
        <Link to="/service-status"> Service status</Link> · <Link to="/privacy">Privacy</Link>
      </p>
    </main>;
  }

  const Root = embedded ? 'section' : 'main';
  const Heading = embedded ? 'h2' : 'h1';
  const Subheading = embedded ? 'h3' : 'h2';
  return <Root className={embedded ? 'luqi-info luqi-guide-ai' : 'luqi-info'} aria-labelledby="ai-trial-heading">
    <p className="luqi-eyebrow">SIGNED-IN TEXT TRIAL</p><Heading id="ai-trial-heading">Try a question with LUQI</Heading>
    <p>Get help with writing, studying and ideas. Review the answer: AI can make mistakes.</p>
    <p role="status">{checking ? 'Checking AI configuration…' : available
      ? 'Provider access is configured. Live replies remain subject to provider availability and shared spending limits.'
      : 'AI requests are paused or unavailable. No question can be sent from this page.'}</p>
    <div className="luqi-chat-availability">
      <button className="luqi-secondary" type="button" disabled={checking || busy} onClick={() => { void checkAvailability(); }}>
        {checking ? 'Checking availability…' : 'Check availability again'}
      </button>
      {!checking && !available && <p>Your sign-in and question stay here while you check again. This check does not send a question.</p>}
    </div>
    <p>Up to 20 provider attempts per account per UTC day. Replies are limited to 512 tokens.</p>
    {notice && <p role="alert">{notice}</p>}
    {!session ? <AccountAccessForm purpose="ai" onAuthenticated={value => { epoch.current++; acceptSession(value); setNotice(''); setAnswer(null); setTurns([]); setShareContext(false); }} /> : <>
      <section><p>Signed in as {session.user.email}.</p>
        <div className="luqi-chat-actions">
          <button className="luqi-secondary" type="button" disabled={busy} onClick={newChat}>New chat</button>
          <button className="luqi-secondary" type="button" onClick={signOut}>Sign out</button>
        </div>
      </section>
      <section><Subheading>Ask LUQI</Subheading>
        <p>Ask in your own words, or try a starting question. Only your question is sent by default.</p>
        <form onSubmit={event => { event.preventDefault(); void submit(); }}>
          {!turns.length && !prompt && <fieldset className="luqi-chat-starters" disabled={busy || uncertain}>
            <legend>Try a starting question</legend>
            {[
              ['Help me study', 'Explain one useful study technique and give me a short example.'],
              ['Plan an idea', 'Help me turn a small business idea into three practical first steps.'],
              ['Draft a message', 'Help me write a polite message to a customer about a delayed delivery.'],
            ].map(([label, question]) => <button className="luqi-secondary" key={label} type="button" onClick={() => {
              setPrompt(question); document.getElementById('ai-question')?.focus();
            }}>{label}</button>)}
          </fieldset>}
          <label className="block" htmlFor="ai-question">Your question</label>
          <textarea id="ai-question" className="luqi-access-input" rows={5}
            aria-describedby="ai-question-limit" aria-invalid={tooLong || contextTooLong || undefined}
            disabled={busy || uncertain} required value={prompt} onChange={event => setPrompt(event.target.value)} />
          <p id="ai-question-limit">{questionLength}/{MAX_PILOT_QUESTION_CHARS} characters.
            {tooLong && ' Shorten your question. It will not be sent or shortened automatically.'}
            {contextTooLong && ' Your question plus selected conversation context exceeds the input limit. Shorten the question or turn off context; nothing will be sent.'}</p>
          {turns.length > 0 && <div className="luqi-chat-context">
            <label className="block"><input type="checkbox" checked={shareContext} disabled={busy}
              onChange={event => setShareContext(event.target.checked)} /> Include recent conversation context in this request (optional)</label>
            <p>Off by default. Review the exact preview before including recent messages.</p>
            {shareContext && <details open><summary>Review the conversation context to be sent</summary>
              <ol>{contextPreview.map((turn, index) => <li key={index}><strong>{turn.sender === 'user' ? 'You' : 'LUQI'}:</strong> {turn.text}</li>)}</ol>
            </details>}
          </div>}
          {region !== 'PAN_AFRICAN_AU' && <label className="block"><input type="checkbox" checked={shareRegion} disabled={busy}
            onChange={event => setShareRegion(event.target.checked)} /> Include my selected country guide ({AFRICAN_REGIONAL_PROFILES[region].country}) for this one AI request. It is not verified geolocation or legal advice; country information goes to the provider only if I opt in.</label>}
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
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><SafePilotText text={answer.response} /></p>
        <p>Provider: {answer.provider} · Model: {answer.provider_model}</p>
        {actionablePath && <p className="luqi-chat-next-step">Want to continue using a real LUQI tool? <Link to={actionablePath}>{nextStep?.primaryLabel}</Link>. This is based on your question, not a fact checked by the AI; nothing is sent or booked automatically. Copy anything you want to keep before leaving Chat.</p>}
      </section>}
    </>}
    <details className="luqi-chat-details">
      <summary>How Chat works</summary>
      <p>Gemini answers first, with OpenAI as a separately limited fallback. A fallback uses another provider attempt. This is an experimental text-only trial. No browsing, sources, tools, files, voice or autonomous actions are enabled. African-language accuracy has not been independently evaluated.</p>
      <p>Only your question is sent by default. Optionally include a short, reviewed conversation preview for a follow-up: up to four recent turns, shortened to 350 characters each. Request formatting uses the rest of the 6000-character input limit. Your private notes and account email are never attached.</p>
      <p>Questions and replies stay in this page’s memory; leaving, reloading or signing out clears them. New chat clears this conversation and provider consent while keeping you signed in. Your LUQI login works across customer tools in this tab; a full reload ends it.</p>
    </details>
    <p>Notes are optional. This conversation stays in this page's memory and is not saved to Notes. <Link to="/start">Explore other tools</Link></p>
  </Root>;
}
