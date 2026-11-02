import { useState } from 'react';
import { Link } from 'react-router';
import { getAnalyticsConsent, readLocalMetrics, type Metric } from '../lib/uiTelemetry';
import ApiSystemStatusDashboard from '../components/ApiSystemStatusDashboard';

/** Missing measurements are unavailable, never invented successful executions. */
export default function TelemetryDashboardPage() {
  const [samples, setSamples] = useState<Metric[]>([]);
  const [sampleConsent, setSampleConsent] = useState(getAnalyticsConsent);
  function refreshLocal() {
    setSampleConsent(getAnalyticsConsent());
    setSamples(readLocalMetrics());
  }
  return <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-10 text-slate-100" style={{ overflowWrap: 'anywhere' }}>
    <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Pilot operations</p>
    <h1 className="mt-2 text-3xl font-bold">Telemetry and diagnostics</h1>
    <p className="mt-4 text-slate-300">Check the reported service configuration below. Execution totals, latency, success rates and diagnostic history are unavailable.</p>

    <section className="my-6 space-y-4 rounded-xl border border-teal-800 bg-slate-950 p-5" aria-label="Local opt-in performance measurements">
      <h2 className="text-xl font-semibold">Local performance diagnostics · this device only</h2>
      <p className="text-sm text-slate-300">Optional measurements are stored only in this browser tab's memory. No account-wide or server-wide analytics have been collected by this panel. No telemetry is sent to Luqi's servers.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={refreshLocal} className="rounded-lg border border-teal-500 px-4 py-2 text-teal-200">Refresh local measurements</button>
        <Link className="text-sm text-teal-200 underline" to="/privacy">Manage diagnostic consent</Link>
      </div>
      {!sampleConsent ? <p role="status" className="text-sm text-slate-300">Local diagnostics are switched off. Enable them explicitly in Privacy settings to begin measuring future interactions.</p>
        : samples.length === 0 ? <p role="status" className="text-sm text-slate-300">No local measurements yet. Missing metrics are unavailable, not zero.</p>
        : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="pb-2 text-left text-slate-300">Opted-in metrics collected in this tab since enabling diagnostics</caption>
            <thead><tr><th className="p-2">Metric</th><th className="p-2">Outcome</th><th className="p-2">Samples</th><th className="p-2">Maximum</th></tr></thead>
            <tbody>{samples.map(row => <tr className="border-t border-slate-700" key={row.name + row.outcome}>
              <td className="p-2">{row.name.replaceAll('_', ' ')}</td>
              <td className="p-2">{row.outcome}</td>
              <td className="p-2">{row.count}</td>
              <td className="p-2">{row.max.toFixed(row.unit === 'score' ? 3 : 0)} {row.unit === 'ms' ? 'ms' : row.unit === 'score' ? 'CLS' : 'events'}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <p className="text-xs text-slate-400">CLS is a dimensionless layout-shift score and may remain unavailable until the page is hidden. LCP is reported only when consent was active early enough to observe it; INP, cross-device history and production error rates are not measured here.</p>
    </section>
    <ApiSystemStatusDashboard />

    <section className="my-6 space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-5" aria-labelledby="telemetry-limits">
      <h2 id="telemetry-limits" className="text-xl font-semibold">What these checks do not prove</h2>
      <p className="text-slate-300">A responding service is not proof that every feature works, that no errors occurred, or that a backup can be restored. No empty history, sample percentage or configured key is treated as a verified result.</p>
      <p className="text-slate-300">Account recovery, security review, backup restoration and actual provider costs require separate operator verification. No private account details or operator logs are shown here.</p>
    </section>

    <section className="my-6 space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-5" aria-labelledby="autonomy-limits">
      <h2 id="autonomy-limits" className="text-xl font-semibold">Autonomous execution is unavailable</h2>
      <p className="text-slate-300">This page does not run generated code, start a worker, change production, or submit a paid AI request. The old refinement controls remain unavailable until authorization, isolation, spending controls and real execution evidence have been reviewed.</p>
      <p className="text-slate-300">The separate AI text trial requires sign-in and explicit submission. Your private notes are not automatically sent to a provider.</p>
    </section>

    <nav className="flex flex-wrap gap-3" aria-label="Available pilot tools">
      <Link className="rounded-lg border border-teal-500 px-4 py-3 text-teal-200" to="/ai-trial">Open AI text trial</Link>
      <Link className="rounded-lg border border-slate-500 px-4 py-3" to="/companion">Open private notes</Link>
      <Link className="rounded-lg border border-slate-500 px-4 py-3" to="/start">Get started</Link>
    </nav>
  </main>;
}
