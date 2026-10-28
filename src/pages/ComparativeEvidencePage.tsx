import { useState } from 'react';
import { Link } from 'react-router';
import { EVIDENCE_CASES, EVIDENCE_REVIEWED_ON, EVIDENCE_RECHECK_AFTER,
  evidenceIsCurrent, evidenceSourcesFor, type EvidenceTopic } from '../lib/comparative-evidence';

/** Source-linked local reading aid, not a religion-ranking, truth or inference service. */
export default function ComparativeEvidencePage() {
  const [topic, setTopic] = useState<EvidenceTopic>('creation');
  const current = evidenceIsCurrent();
  const item = EVIDENCE_CASES.find(e => e.id === topic) ?? EVIDENCE_CASES[0];
  return <main className="mx-auto max-w-5xl min-w-0 space-y-6 px-3 py-6 text-slate-100 sm:px-5 sm:py-9" aria-labelledby="evidence-title">
    <header className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi knowledge · source-linked · no account</p>
      <h1 id="evidence-title" className="text-3xl font-bold sm:text-4xl">Faith, history and scientific evidence</h1>
      <p className="text-slate-200">Compare traditional accounts with measurable evidence, manuscripts and interpretations. A curated reading guide, not a live research engine or a verdict on the truth of a religion.</p>
    </header>
    <section className="space-y-2 rounded-xl border border-amber-500/70 bg-slate-900 p-4" aria-label="Limits of evidence">
      <h2 className="text-lg font-semibold">Compare evidence, not people’s worth</h2>
      <p className="text-sm">Science tests measurable claims. Archaeology and textual criticism assess surviving objects and documents. Spiritual meanings, ethical interpretations and metaphysical beliefs are not all experimentally testable. Scholars and believers may disagree.</p>
      <p className="text-sm">Links checked {EVIDENCE_REVIEWED_ON}; recheck after {EVIDENCE_RECHECK_AFTER}. English only; no certified translation, independent academic sign-off, search, location, microphone, account or paid model call.</p>
      {!current && <p role="alert" className="text-sm text-amber-200">This source review has expired. Detailed summaries are withheld pending re-review; original source links remain below.</p>}
    </section>
    <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-label="Choose a comparison">
      <h2 className="text-xl font-semibold">Choose a question to explore</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Comparative evidence topics">
        {EVIDENCE_CASES.map(entry => <button key={entry.id} type="button" aria-pressed={topic === entry.id}
          className={'rounded-lg border px-3 py-3 text-left font-semibold ' + (topic === entry.id ?
            'border-cyan-300 bg-cyan-900 text-white' : 'border-slate-500 bg-slate-800')}
          onClick={() => setTopic(entry.id)}>{entry.title}</button>)}
      </div>
    </section>
    <section className="space-y-4" aria-live="polite" aria-label="Comparative evidence reading">
      <h2 className="text-2xl font-bold">{item.title}</h2><p className="text-sm text-cyan-200">{item.traditions}</p>
      {current && <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {([
          ['1. Scriptural or traditional account', item.tradition],
          ['2. Scientific or material evidence', item.empirical],
          ['3. Historical and textual context', item.history],
          ['4. Interpretations and uncertainty', item.interpretation],
        ] as const).map(([heading, body]) => <article key={heading} className="min-w-0 space-y-2 rounded-xl border border-slate-600 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold">{heading}</h3><p className="text-sm leading-relaxed text-slate-200">{body}</p>
        </article>)}
        <article className="space-y-2 rounded-xl border border-cyan-700 bg-slate-900 p-4 md:col-span-2">
          <h3 className="font-semibold">Luqi learning summary — not a faith verdict</h3><p className="text-sm">{item.summary}</p>
        </article>
      </div>}
    </section>
    <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-label="Sources for selected comparison">
      <h2 className="text-xl font-semibold">Check original sources</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm">{evidenceSourcesFor(item).map(s => <li key={s.id}>
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words text-cyan-200 underline underline-offset-2">{s.publisher}: {s.title}</a>
      </li>)}</ul>
      <p className="text-xs text-slate-300">A linked scholarly or institutional source supports specific claims; it does not endorse every theological interpretation or answer every open question.</p>
    </section>
    <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h2 className="font-semibold">Continue exploring with Luqi</h2>
      <p className="text-sm text-slate-200">For questions beyond these seven studies, use the existing Luqi Chat with explicit consent. Chat does not independently browse or authenticate newly published scholarship.</p>
      <Link to="/chat" className="text-cyan-200 underline underline-offset-2">Open Luqi Chat</Link>
      <p className="text-xs text-slate-300">Future: scholarly review across more African, Abrahamic, Dharmic and East Asian traditions, validated African-language terminology and citation evaluation. No invented translations or religion rankings.</p>
    </section>
  </main>;
}
