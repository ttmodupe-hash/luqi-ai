import { useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import ApiSystemStatusDashboard from '../components/ApiSystemStatusDashboard';
import { clearLocalDiagnostics, estimateLocalP95UpperBound, getLocalDiagnostics, recordLocalRoute,
  setLocalDiagnosticsEnabled, subscribeLocalDiagnostics } from '../lib/local-diagnostics';

/** Distinguishes genuine in-tab observations from unverified global platform statistics. */
export default function TelemetryDashboardPage() {
  const signals = useSyncExternalStore(subscribeLocalDiagnostics, getLocalDiagnostics, getLocalDiagnostics);
  const totalVisits = Object.values(signals.routes).reduce((a,b) => a+b,0);
  const requests = Object.values(signals.api);
  const attempts = requests.reduce((sum,x) => sum+x.calls,0);
  const failed = requests.reduce((sum,x) => sum+x.failed,0);
  const averageMs = attempts ? Math.round(requests.reduce((sum,x) => sum+x.totalMs,0)/attempts) : null;
  const p95CeilingMs = estimateLocalP95UpperBound(signals.api);
  return <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-10 text-slate-100" style={{ overflowWrap:'anywhere' }}>
    <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Pilot operations</p>
    <h1 className="mt-2 text-3xl font-bold">Telemetry and diagnostics</h1>
    <p className="mt-4 text-slate-300">Check the reported service configuration below. Execution totals, latency, success rates and diagnostic history are unavailable from the server on this page. Optional local measurements below are not production-wide statistics.</p>

    <ApiSystemStatusDashboard />

    <section className="my-6 space-y-4 rounded-xl border border-teal-700 bg-slate-950 p-5" aria-labelledby="local-telemetry-heading">
      <h2 id="local-telemetry-heading" className="text-xl font-semibold">Private, in-tab performance diagnostics</h2>
      <p className="text-slate-300">Off by default. When you opt in, Luqi counts coarse navigation and control activations, known Chat request status/latency, and browser loading shifts for this tab only. No prompts, form values, links, account identifiers, network IPs, device location or raw click histories are captured. Nothing is uploaded or saved in browser storage.</p>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-600 p-3">
        <input aria-label="Enable private in-tab diagnostics" type="checkbox" checked={signals.enabled}
          onChange={event => {
            setLocalDiagnosticsEnabled(event.target.checked);
            if (event.target.checked) recordLocalRoute('/telemetry');
          }} />
        <span>Enable private diagnostics for this tab</span>
      </label>
      {signals.enabled ? <>
        <dl className="grid grid-cols-2 gap-3" aria-label="Observed diagnostic counters">
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Page-group views</dt>
            <dd><output aria-label="Page-group views recorded">{totalVisits}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Control activations</dt>
            <dd><output aria-label="Control activations recorded">{signals.controls}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Homepage goals submitted</dt>
            <dd><output aria-label="Homepage goals submitted">{signals.journey.home_goal}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Local guide next steps</dt>
            <dd><output aria-label="Local next steps recorded">{signals.journey.guide_ready}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Guest send / confirmed</dt>
            <dd><output aria-label="Guest send and confirmed counts">{signals.journey.guest_send} / {signals.journey.guest_reply}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Signed-in send / confirmed</dt>
            <dd><output aria-label="Signed-in send and confirmed counts">{signals.journey.signed_send} / {signals.journey.signed_reply}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Measured API roundtrips</dt>
            <dd><output aria-label="Measured API roundtrips">{attempts}</output> (failed: {failed})</dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Average recorded API latency</dt>
            <dd><output aria-label="Average API latency">{averageMs === null ? 'Not measured' : averageMs+' ms'}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Local p95 latency bucket ceiling</dt>
            <dd><output aria-label="Local p95 latency bucket ceiling">{p95CeilingMs === null ? 'Not measured' : '≤ '+p95CeilingMs+' ms'}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Largest content paint</dt>
            <dd><output aria-label="Largest content paint">{signals.vitals.lcpMs === null ? 'Not measured' : signals.vitals.lcpMs+' ms'}</output></dd></div>
          <div className="rounded-lg border border-slate-700 p-3"><dt className="text-slate-300">Layout shifts / long tasks</dt>
            <dd><output aria-label="Layout shifts and long tasks">{(signals.vitals.clsMilli/1000).toFixed(3)} / {signals.vitals.longTasks}</output></dd></div>
        </dl>
        <p role="status" className="text-sm text-teal-200">
          {signals.conserveMotion
            ? 'Measured slow rendering: decorative motion is reduced for the rest of this opted-in session.'
            : 'No automatic layout reorder or cache mutation. Motion adapts only if measured rendering becomes slow.'}
          {signals.truncated ? ' Diagnostic measurement cap reached; no more samples are stored.' : ''}
        </p>
        <button type="button" className="min-h-11 rounded-lg border border-slate-500 px-4 py-2"
          onClick={clearLocalDiagnostics}>Clear local measurements</button>
      </> : <p role="status" className="text-sm text-slate-300">Diagnostics off. Nothing measured or transmitted. Consent and counters reset on reload, disable, or clearing this tab.</p>}
      <p className="text-xs text-slate-400">Counts are per tab, not unique users or verified conversion rates. The p95 value is an approximate upper bucket boundary for requests in this tab, not a precise percentile or server-wide SLO. API timings cover only instrumented, named Chat endpoints. Railway separately measures service-wide HTTP status and latency. This page never creates a billing event, uploads analytics or changes an application cache.</p>
    </section>

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
