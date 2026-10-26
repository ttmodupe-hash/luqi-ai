import React, { useState, type FormEvent } from 'react';
import {
  CONSUMER_GUIDE_RECHECK_AFTER, CONSUMER_GUIDE_REVIEWED_ON,
  CONSUMER_ISSUES, CONSUMER_SOURCES, MAX_CONSUMER_STORY_LENGTH,
  consumerGuideIsCurrent, consumerSourcesFor, makeConsumerDraft, prepareConsumerStory,
  type DisputeType,
} from '../lib/consumer-rights-guide';

export type { DisputeType } from '../lib/consumer-rights-guide';

const input = 'block w-full min-w-0 max-w-full rounded-lg border border-slate-500 bg-slate-950 px-3 py-3 text-slate-100';
const categories: readonly { value: DisputeType; label: string }[] = [
  { value: 'UNSURE', label: 'Not sure / other issue' },
  { value: 'DEFECTIVE_GOODS', label: 'Faulty goods / warranty' },
  { value: 'UNFAIR_CANCELLATION', label: 'Cancellation fee / booking' },
  { value: 'ONLINE_SCAM', label: 'Online order / suspected scam' },
  { value: 'UNAUTHORIZED_DEBIT_ORDER', label: 'Disputed bank debit' },
  { value: 'POPIA_DATA_BREACH', label: 'Privacy or unwanted marketing' },
  { value: 'TELCO_BILLING_DISPUTE', label: 'Mobile / internet billing' },
  { value: 'MASHONISA_ILLEGAL_LOAN', label: 'Loan / retained bank card' },
  { value: 'DEBT_REVIEW_TRAP', label: 'Debt review / counselling' },
];

export const ConsumerRightsAssistant: React.FC = () => {
  const [type, setType] = useState<DisputeType>('UNSURE');
  const [story, setStory] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [submitted, setSubmitted] = useState<ReturnType<typeof prepareConsumerStory>>(null);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const current = consumerGuideIsCurrent();
  const valid = story.trim().length >= 10 && story.trim().length <= MAX_CONSUMER_STORY_LENGTH;
  const sources = submitted ? consumerSourcesFor(submitted.category) : CONSUMER_SOURCES;
  const letter = submitted && current ? draft : '';

  function clearResult() {
    setSubmitted(null);
    setCopied(false);
    setCopyNotice('');
    setDraft('');
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearResult();
    if (!current) return;
    const prepared = prepareConsumerStory(type, story);
    setSubmitted(prepared);
    if (prepared) setDraft(makeConsumerDraft(organisation, prepared.userStory));
  }
  async function copyLetter() {
    if (!letter || typeof navigator.clipboard?.writeText !== 'function') {
      setCopyNotice('Copy is not available in this browser. You can select the editable draft yourself.');
      return;
    }
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setCopyNotice('Copied locally. Please check the facts and remove unnecessary personal details before sending.');
    } catch {
      setCopyNotice('Clipboard permission was denied. Select the draft below to copy it manually.');
    }
  }

  return (
    <main className="mx-auto my-6 max-w-4xl space-y-6 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-7 text-slate-100 sm:px-7" aria-labelledby="consumer-guide-title">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Free source-linked information · South Africa</p>
        <h1 id="consumer-guide-title" className="text-2xl font-bold sm:text-3xl">Consumer rights: understand your options</h1>
        <p className="text-sm text-slate-300">
          Explain a concern in your own words and select the closest issue category.
          LUQI will show general preparation questions, possible routes to explore and links to official sources.
          It does not independently verify your story or reach a legal finding.
        </p>
      </header>

      <section className="space-y-2 rounded-xl border border-amber-500/60 bg-slate-900 p-4" aria-labelledby="consumer-safety-title">
        <h2 id="consumer-safety-title" className="text-lg font-semibold">LUQI can make mistakes</h2>
        <p className="text-sm">
          This is general consumer-rights information, not legal advice or representation.
          Rights, exceptions, deadlines and complaint jurisdiction depend on your circumstances.
          Verify the original sources and consult a qualified or authorised professional before acting on an urgent or disputed legal matter.
        </p>
        <p className="text-sm">
          The story you type here is processed only on this page, in your browser memory. This version does not
          send it to an AI provider or LUQI's server, and does not save or submit it. Please exclude ID numbers,
          addresses, bank details, passwords, account numbers and other people's personal data.
        </p>
        <p className="text-sm">
          If you are threatened or believe a payment is being stolen, contact your bank or the appropriate emergency
          authorities promptly using independently verified contact details. Do not wait for this guide.
        </p>
      </section>

      <section className="space-y-2" aria-labelledby="consumer-review-date">
        <h2 id="consumer-review-date" className="text-lg font-semibold">Source freshness</h2>
        <p className="text-sm text-slate-300">
          Source list checked {CONSUMER_GUIDE_REVIEWED_ON}; recheck required after {CONSUMER_GUIDE_RECHECK_AFTER}.
          This is not live legal research or qualified legal approval.
        </p>
        {!current && <p role="alert" className="rounded-lg border border-rose-400 bg-slate-900 p-3 text-sm">
          This guide's source review has expired. Local advice summaries and letter preparation are paused until sources
          are checked again. The original regulator and legislation links below remain available.
        </p>}
      </section>

      <form onSubmit={prepare} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <div className="space-y-1">
          <label htmlFor="consumer-category" className="font-semibold">What kind of problem is it?</label>
          <select id="consumer-category" className={input} value={type} disabled={!current}
            onChange={event => { setType(event.target.value as DisputeType); clearResult(); }}>
            {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="consumer-business" className="font-semibold">Supplier name (optional, non-sensitive)</label>
          <input id="consumer-business" className={input} maxLength={100} autoComplete="off" value={organisation}
            disabled={!current} placeholder="e.g. the shop or service provider"
            onChange={event => { setOrganisation(event.target.value); clearResult(); }} />
        </div>
        <div className="space-y-1">
          <label htmlFor="consumer-story" className="font-semibold">What happened? (redact personal details)</label>
          <textarea id="consumer-story" className={input} rows={5} maxLength={MAX_CONSUMER_STORY_LENGTH}
            disabled={!current} value={story}
            placeholder="Example: I bought a kettle about three months ago. It stopped heating and the retailer offered store credit only."
            aria-describedby="consumer-story-note" onChange={event => { setStory(event.target.value); clearResult(); }} />
          <p id="consumer-story-note" className="text-xs text-slate-300">
            {story.length}/{MAX_CONSUMER_STORY_LENGTH} characters. Use anonymised facts. Do not enter a full legal affidavit or personal document.
          </p>
        </div>
        <button type="submit" disabled={!current || !valid}
          className="rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          Prepare my options locally
        </button>
        <p className="text-xs text-slate-300">The outcome is category-based guidance, not an AI analysis or an automatic legal demand.</p>
      </form>

      {submitted && current && (
        <section className="space-y-4" aria-labelledby="consumer-options">
          <div className="space-y-2 rounded-xl border border-cyan-700 bg-slate-900 p-4">
            <h2 id="consumer-options" className="text-xl font-semibold">{submitted.guide.title}</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Potential information to consider — facts not independently verified</p>
            <p className="text-sm leading-relaxed">{submitted.guide.explanation}</p>
          </div>
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4" aria-labelledby="consumer-questions">
            <h3 id="consumer-questions" className="font-semibold">Questions to clarify before deciding</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              {submitted.guide.questions.map(question => <li key={question}>{question}</li>)}
            </ul>
          </section>
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4" aria-labelledby="consumer-steps">
            <h3 id="consumer-steps" className="font-semibold">Options to explore</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              {submitted.guide.options.map(option => <li key={option}>{option}</li>)}
            </ul>
          </section>
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4" aria-labelledby="consumer-references">
            <h3 id="consumer-references" className="font-semibold">Official legislation and complaint information</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              {sources.map(source => <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="break-words text-cyan-300 underline underline-offset-2">
                  {source.publisher}: {source.name}
                </a>
              </li>)}
            </ul>
            <p className="mt-3 text-xs text-slate-400">A link is not proof that this authority has accepted your particular complaint.</p>
          </section>
          <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-4" aria-labelledby="consumer-letter">
            <h3 id="consumer-letter" className="font-semibold">Optional factual complaint draft — review before sending</h3>
            <p className="text-xs text-slate-300">
              This is not a lawyer's notice, a finding of wrongdoing or an automatically transmitted email.
              Correct inaccuracies, remove private details and select the recipient yourself.
            </p>
            <textarea aria-label="Your editable factual complaint draft" className={input + ' font-mono text-xs'}
              rows={12} value={draft} onChange={event => { setDraft(event.target.value); setCopied(false); }} />
            <button type="button" onClick={() => { void copyLetter(); }}
              className="rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-100">
              {copied ? 'Draft copied' : 'Copy reviewed draft'}
            </button>
            {copyNotice && <p role="status" className="text-sm">{copyNotice}</p>}
          </section>
        </section>
      )}

      <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-4" aria-labelledby="consumer-official-links">
        <h2 id="consumer-official-links" className="text-lg font-semibold">Official sources and referral organisations</h2>
        <p className="text-sm text-slate-300">
          Different organisations cover different complaints. Choose the most relevant body after checking its scope and current requirements.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {CONSUMER_SOURCES.map(source => <li key={source.id}>
            <a href={source.url} target="_blank" rel="noopener noreferrer"
              className="break-words text-cyan-300 underline underline-offset-2">{source.publisher}: {source.name}</a>
          </li>)}
        </ul>
      </section>
      <p className="text-xs text-slate-400">
        This first version is in English. Sepitori and other African-language legal explanations require native-speaker and qualified terminology review.
        Voice, email sending, government submissions, uploads and live AI analysis are not connected to this workflow.
      </p>
    </main>
  );
};

export default ConsumerRightsAssistant;
