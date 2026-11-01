import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CIVIC_STATUS_LABELS, civicEvidenceLink, civicReviewCurrent, getCivicSource, type CivicClaim, type CivicPassage } from '../lib/civic-evidence';
export function useCivicReviewClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return now;
}
export function CivicPassageView({ passage }: { passage: CivicPassage }) {
  return <div className="min-w-0 space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3">
    <h4 className="font-semibold text-white">{passage.title}</h4>
    <p className="text-sm leading-relaxed text-slate-200">{passage.text}</p>
    <p className="text-xs text-slate-300">{passage.kind === 'next' ? 'Luqi reading guide based on: ' : 'Evidence source: '}
      {passage.sourceIds.map(id => { const source = getCivicSource(id); return source && <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="mr-2 text-cyan-200 underline">{source.publisher}</a>; })}
    </p>
  </div>;
}
export default function CivicEvidencePanel({ claim, chatLink = true }: { claim: CivicClaim; chatLink?: boolean }) {
  const now = useCivicReviewClock();
  const current = civicReviewCurrent(claim, now);
  return <article aria-labelledby={'civic-title-' + claim.id} className="min-w-0 space-y-4 rounded-2xl border border-slate-600 bg-slate-900 p-4 text-slate-100 sm:p-5">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{claim.topic} · {claim.jurisdiction}</p>
      <h2 id={'civic-title-' + claim.id} className="mt-2 text-xl font-bold">{claim.title}</h2>
    </div>
    <div className="space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3">
      <h3 className="text-sm font-semibold">Claim being examined</h3>
      <p className="text-sm">{claim.claim}</p>
      <p className="text-xs text-slate-300">{claim.claimOrigin}</p>
      <p className="text-sm font-semibold text-amber-200">{current ? CIVIC_STATUS_LABELS[claim.status] : 'Review expired — reconfirm with the publisher'}</p>
      {!current && <p role="note" className="text-sm text-amber-200">The dated record remains visible for transparency. AI selection is paused until the source review is renewed.</p>}
    </div>
    <p className="text-sm text-slate-200"><strong>Coverage and limits:</strong> {claim.coverage}</p>
    <p className="text-xs text-slate-300">Source review: <time dateTime={claim.reviewedOn}>{claim.reviewedOn}</time> · Recheck by {new Date(claim.reviewAfter).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} SAST. This is a dated review, not continuous monitoring.</p>
    <details className="rounded-lg border border-slate-600 p-3">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">Read the evidence and limitations</summary>
      <div className="mt-3 space-y-3">{claim.passages.map(passage => <CivicPassageView key={passage.id} passage={passage} />)}</div>
    </details>
    <div className="space-y-3" aria-label="Original evidence sources">
      {claim.sourceIds.map(id => { const source = getCivicSource(id); return source && <section key={id} className="min-w-0 space-y-2 text-sm">
        <h3 className="font-semibold"><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">{source.title}</a></h3>
        <p className="text-xs text-slate-300">{source.publisher} · Publication date: {source.publishedOn ?? 'not stated on this source page'}</p>
        <blockquote className="border-l-2 border-cyan-500 pl-3 text-slate-200">“{source.excerpt}”</blockquote>
        <p className="text-xs text-slate-300">Source location: {source.locator}</p>
        <p className="text-xs text-amber-200">{source.reviewMethod}</p>
        <details className="text-xs text-slate-300"><summary className="cursor-pointer py-2">Excerpt provenance</summary>
          <p className="py-2">SHA-256 of the short excerpt retained in this edition, not the whole document or proof of its truth:</p>
          <code className="block break-all">{source.excerptSha256}</code>
        </details>
      </section>; })}
    </div>
    <details className="text-xs text-slate-300"><summary className="cursor-pointer py-2">Correction history</summary>
      {claim.corrections.map((correction,index) => <p key={index} className="py-1">{correction.date}: {correction.note}</p>)}
    </details>
    <div className="flex flex-wrap gap-3">
      {chatLink && <Link to={civicEvidenceLink(claim.id)} className="min-h-11 rounded-lg bg-cyan-900 px-4 py-3 text-sm font-semibold text-white">Ask Luqi about this evidence</Link>}
      <Link to="/contact" className="min-h-11 rounded-lg border border-slate-500 px-3 py-3 text-sm underline">Report a correction</Link>
    </div>
    <p className="text-xs text-slate-400">For corrections, quote record <code>{claim.id}</code>. Do not include your ID number or vote choice.</p>
  </article>;
}
