import { Link } from 'react-router';
import ApiSystemStatusDashboard from '../components/ApiSystemStatusDashboard';

/** Missing measurements are unavailable, never invented successful executions. */
export default function TelemetryDashboardPage() {
  return <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-10 text-slate-100" style={{ overflowWrap: 'anywhere' }}>
    <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Pilot operations</p>
    <h1 className="mt-2 text-3xl font-bold">Telemetry and diagnostics</h1>
    <p className="mt-4 text-slate-300">Check the reported service configuration below. Execution totals, latency, success rates and diagnostic history are unavailable.</p>

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
