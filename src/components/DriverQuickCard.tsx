import { Link } from 'react-router';
import { DRIVER_QUICK, DRIVER_RECHECK_AFTER, type DriverMode } from '../lib/driver-rights';

/** No service request: typing a roadside phrase displays instant local safety steps. */
export default function DriverQuickCard({ mode }: { mode: DriverMode }) {
  const quick = DRIVER_QUICK[mode];
  return <section className="mx-3 my-3 min-w-0 space-y-2 rounded-xl border border-amber-500 bg-slate-950 p-3 text-slate-100 sm:mx-4"
    aria-labelledby="luqi-driver-quick-title" aria-live="polite">
    <h2 id="luqi-driver-quick-title" className="text-base font-bold">{quick.title}</h2>
    <p className="text-xs font-semibold text-amber-200">Do not use the phone while driving. This answer is local, not paid AI or emergency dispatch.</p>
    <ol className="list-inside list-decimal space-y-2 text-sm font-semibold">
      {quick.steps.map((step, i) => <li key={i}>{step}</li>)}
    </ol>
    <p className="text-xs text-slate-300">Basic safety summary. Detailed legal sources must be rechecked after {DRIVER_RECHECK_AFTER}.</p>
    <Link className="inline-block break-words text-sm font-semibold text-cyan-200 underline underline-offset-2"
      to="/driver-rights">Open full South African driver rights and source links</Link>
  </section>;
}
