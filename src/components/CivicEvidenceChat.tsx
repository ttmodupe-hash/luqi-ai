import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useCustomerSession } from '../providers/customer-session';
import { customerSessionBoundary } from '../lib/customer-session-boundary';
import { stageCivicSignIn, readCivicResume, clearCivicResume } from '../lib/interaction-handoff';
import CivicEvidencePanel, { CivicPassageView, useCivicReviewClock } from './CivicEvidencePanel';
import { civicQuestionProblem, civicReviewCurrent, getCivicClaim, type CivicClaim, type PassageKind } from '../lib/civic-evidence';
import { askCivicEvidence, CivicChatError } from '../lib/civic-evidence-client';
type Turn = { question: string; passageIds: string[]; outOfScope: boolean; mode: 'reviewed' | 'ai' };
export default function CivicEvidenceChat({ claimId }: { claimId: string }) {
  const { session } = useCustomerSession();
  const claim = getCivicClaim(claimId);
  if (!claim) return <section className="space-y-3 p-5 text-slate-100" aria-label="Unknown civic evidence">
    <h1 className="text-xl font-bold">That evidence record is not recognised</h1>
    <p>No source, claim or question from this link was sent to AI.</p>
    <Link className="text-cyan-200 underline" to="/chat?civic=1">Choose a reviewed evidence record</Link>
  </section>;
  // Remount on identity/claim change: no question, consent or model reply crosses accounts.
  return <CivicConversation key={claim.id + ':' + (session?.token ?? 'guest')} claim={claim} token={session?.token ?? null} owner={customerSessionBoundary(session)} />;
}
function CivicConversation({ claim, token, owner }: { claim: CivicClaim; token: string | null; owner: string | null }) {
  const now = useCivicReviewClock();
  const current = civicReviewCurrent(claim, now);
  const [question, setQuestion] = useState(() => readCivicResume(owner, claim.id));
  const [keepForSignIn, setKeepForSignIn] = useState(false);
  useEffect(() => { clearCivicResume(); }, []);
  const [consent, setConsent] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(true), locked = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const version = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; version.current++; pending.current?.abort(); locked.current = false; };
  }, []);
  useEffect(() => {
    const guard = (event: Event) => {
      if ((question.trim() || busy) && !window.confirm('Leave this evidence conversation? Your unsent question will be cleared. Any AI attempt already started may still count toward your allowance.')) event.preventDefault();
    };
    window.addEventListener('luqi:leave-civic', guard);
    return () => window.removeEventListener('luqi:leave-civic', guard);
  }, [question, busy]);
  function addReviewed(kind: PassageKind) {
    if (locked.current) return;
    const passage = claim.passages.find(item => item.kind === kind)!;
    setTurns(previous => [...previous, { question: passage.title, passageIds: [passage.id], outOfScope: false, mode: 'reviewed' as const }].slice(-6));
  }
  async function submit() {
    const problem = civicQuestionProblem(question);
    if (!token || !consent || !current || problem || locked.current || uncertain) return;
    locked.current = true; setBusy(true); setNotice(''); setConsent(false);
    const controller = new AbortController(); pending.current = controller;
    const epoch = ++version.current, submitted = question.trim();
    const timer = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const reply = await askCivicEvidence(token, claim.id, submitted, turns.at(-1)?.passageIds ?? [], controller.signal);
      if (!mounted.current || version.current !== epoch) return;
      setTurns(previous => [...previous, { question: submitted, passageIds: reply.passageIds, outOfScope: reply.outOfScope, mode: 'ai' as const }].slice(-6));
      setQuestion('');
    } catch (error) {
      if (!mounted.current || version.current !== epoch) return;
      const code = error instanceof CivicChatError ? error.code : 'RESPONSE_UNCONFIRMED';
      const messages: Record<string, string> = {
        CIVIC_PRIVATE_IDENTIFIER: 'Remove personal ID numbers. Use the IEC directly for personal voter checks.',
        CIVIC_SOURCES_STALE: 'This source review has expired. Read the dated evidence and reconfirm with its publisher; AI selection is paused.',
        CIVIC_REPLY_UNVERIFIED: 'The reply did not match this reviewed evidence edition and was not displayed. No generated claim or citation was accepted.',
        AUTH_REQUIRED: 'Sign in through your existing Luqi account before requesting AI assistance.',
        AI_USER_DAILY_QUOTA_EXHAUSTED: 'Your existing daily AI allowance is reached. The reviewed explanations remain free to read.',
        AI_PROVIDER_BUDGET_EXHAUSTED: 'The existing provider allowance is reached. The reviewed explanations remain available.',
      };
      setNotice((messages[code] ?? 'AI assistance could not be confirmed. Your question and the reviewed evidence remain available.') + ' No automatic retry was made. An attempted reply may still count toward your allowance.');
      // A deliberate new-question action is required after any failed/ambiguous attempt.
      setUncertain(true);
    } finally {
      window.clearTimeout(timer);
      if (mounted.current && version.current === epoch) { pending.current = null; locked.current = false; setBusy(false); }
    }
  }
  const problem = civicQuestionProblem(question);
  return <section aria-labelledby="civic-chat-title" className="mx-auto w-full min-w-0 max-w-5xl space-y-5 p-3 text-slate-100 sm:p-6">
    <header className="space-y-2">
      <h1 id="civic-chat-title" className="text-2xl font-bold">Luqi Civic Evidence Supporter</h1>
      <p className="text-sm text-slate-300">Ask about this record, not which party to vote for. AI selects relevant reviewed explanations; it does not write new evidence, search live or independently verify a claim.</p>
      <p className="text-xs text-slate-300">Reviewed replies are in English. Follow-ups use this record and the last displayed passage IDs only. This conversation is not saved by Luqi. Only an approved question is sent to the configured provider; no voting profile is created.</p>
      <nav aria-label="Civic chat navigation" className="flex flex-wrap gap-4 py-2 text-sm">
        <Link to="/chat?civic=1" className="text-cyan-200 underline">All civic evidence</Link>
        <Link to="/chat" className="text-cyan-200 underline">General Luqi Chat</Link>
      </nav>
    </header>
    <CivicEvidencePanel claim={claim} chatLink={false} />
    <section aria-label="Free reviewed clarification" className="space-y-3 rounded-xl border border-slate-600 p-4">
      <h2 className="text-lg font-semibold">Clarify without an AI request</h2>
      <p className="text-sm text-slate-300">These buttons show the dated, source-linked explanations. No account, provider or payment is needed.</p>
      <div className="flex flex-wrap gap-2">
        {([['meaning','Explain the meaning'],['limit','What does it not prove?'],['next','What should I check?']] as const).map(([kind,label]) => <button key={kind} type="button" disabled={busy} onClick={() => addReviewed(kind)} className="min-h-11 rounded-lg border border-cyan-500 bg-cyan-950 px-3 py-3 text-sm disabled:opacity-50">{label}</button>)}
      </div>
    </section>
    <div role="log" aria-label="Civic explanation conversation" aria-live="polite" className="space-y-4">
      {turns.map((turn,index) => <section key={index} aria-label={'Explanation ' + (index + 1)} className="min-w-0 space-y-2 rounded-xl border border-slate-600 p-4">
        <p className="break-words text-sm font-semibold">{turn.question}</p>
        <p className="text-xs text-cyan-200">{turn.mode === 'ai' ? 'AI-selected reviewed explanation' : 'Reviewed explanation — no AI request'} · source review {claim.reviewedOn}</p>
        {!current && <p className="text-sm text-amber-200">Source review expired; reconfirm with the original publisher.</p>}
        {turn.outOfScope ? <p className="text-sm">This question is outside the reviewed evidence for this record. Luqi has not verified an answer. Consult the original source or choose another evidence record; no party verdict is implied.</p>
          : turn.passageIds.map(id => <CivicPassageView key={id} passage={claim.passages.find(p => p.id === id)!} />)}
        {turn.mode === 'ai' && <p className="text-xs text-slate-400">The model selected these passages; relevance can be mistaken. Check their stated coverage and original sources.</p>}
      </section>)}
    </div>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-3 rounded-xl border border-cyan-800 bg-slate-950 p-4" aria-label="Ask the civic evidence supporter">
      <h2 className="text-lg font-semibold">Ask your own clarification</h2>
      <label htmlFor="civic-question" className="block text-sm">Question about this evidence</label>
      <textarea id="civic-question" value={question} maxLength={1000} disabled={busy} rows={3} onChange={event => setQuestion(event.target.value)} aria-describedby="civic-question-privacy" className="w-full min-w-0 rounded-lg border border-slate-500 bg-slate-900 p-3 text-white" />
      <p id="civic-question-privacy" className="text-xs text-slate-300">{question.length}/1000. Do not enter ID numbers, contact details or voting preferences. No private notes, location or account profile are sent with this question.</p>
      {problem === 'private_identifier' && <p role="alert" className="text-sm text-amber-200">Remove the personal ID number before continuing.</p>}
      {!token && <div className="space-y-2 text-sm text-slate-200">
        <label className="flex items-start gap-2"><input type="checkbox" checked={keepForSignIn} onChange={event => setKeepForSignIn(event.target.checked)} />Keep this question in this tab while I sign in (not in the URL or browser storage).</label>
        <p>AI assistance uses your existing Luqi account. <Link to="/login" className="text-cyan-200 underline" onClick={() => stageCivicSignIn(claim.id, keepForSignIn && !problem ? question : '')}>Sign in to Luqi</Link> and return to this evidence record. The evidence and free clarification buttons remain available now.</p>
      </div>}
      {!current && <p role="note" className="text-sm text-amber-200">Source review expired. AI requests are disabled until the review is renewed.</p>}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} disabled={busy || !token || !current} onChange={event => setConsent(event.target.checked)} className="mt-1" />
        <span>I approve sending this question to Luqi’s configured AI provider using my existing allowance. The service selects reviewed passages; it does not search for new facts.</span></label>
      <button type="submit" disabled={!token || !consent || !current || !!problem || busy || uncertain} className="min-h-11 rounded-lg bg-cyan-900 px-4 py-3 text-sm font-semibold disabled:opacity-50">{busy ? 'Checking the reviewed evidence…' : 'Ask evidence supporter'}</button>
      {notice && <p role="status" className="text-sm text-amber-200">{notice}</p>}
      {uncertain && <button type="button" className="min-h-11 rounded-lg border border-slate-500 px-3 py-3 text-sm" onClick={() => { setUncertain(false); setQuestion(''); setConsent(false); setNotice('Previous attempt may count. Enter a new question and approve it before sending.'); }}>Start another question</button>}
    </form>
    {turns.length > 0 && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-slate-500 px-3 py-3 text-sm" onClick={() => { setTurns([]); setQuestion(''); setConsent(false); }}>Clear this evidence conversation</button>}
  </section>;
}
