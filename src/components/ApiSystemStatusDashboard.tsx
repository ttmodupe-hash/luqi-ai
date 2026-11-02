import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const readiness = z.object({
  status: z.enum(['configured_not_verified', 'degraded']),
  checks: z.object({ runtime: z.string(), persistence: z.string(), ai_pilot: z.string() }),
});
type Readiness = z.infer<typeof readiness>;

function explainReadiness(result: Readiness) {
  const serverResponding = result.checks.runtime === 'up';
  const databaseConnected = result.checks.persistence === 'connected';
  return {
    summary: serverResponding && databaseConnected && result.status === 'configured_not_verified'
      ? 'Application and database checks passed. This did not test an AI reply.'
      : 'One or more readiness checks need attention. This result alone does not establish a complete outage.',
    server: serverResponding ? 'Responding' :
      result.checks.runtime === 'unavailable' || result.checks.runtime === 'down' ? 'Unavailable' : 'Not confirmed',
    database: databaseConnected ? 'Connected' :
      result.checks.persistence === 'unavailable' || result.checks.persistence === 'disconnected'
        ? 'Unavailable' : 'Not confirmed',
    ai: result.checks.ai_pilot === 'configured_not_verified' ? 'Configured — replies not tested' :
      result.checks.ai_pilot === 'disabled' ? 'Not enabled' : 'Not confirmed',
  };
}

export function ApiSystemStatusDashboard({ humanReadable = false }: { humanReadable?: boolean }) {
  const [result, setResult] = useState<Readiness | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef<AbortController | null>(null);

  async function refresh() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true); setResult(null); setCheckedAt(null); setError(false);
    try {
      const response = await fetch('/v1/readiness', {
        cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal,
      });
      if (response.status !== 200 && response.status !== 503) throw new Error('Unavailable');
      const data = readiness.parse(await response.json());
      if (!controller.signal.aborted) { setResult(data); setCheckedAt(new Date()); }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => { void refresh(); return () => pending.current?.abort(); }, []);
  const explained = result && humanReadable ? explainReadiness(result) : null;

  return <section className="my-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-100" aria-label="Service readiness" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{humanReadable ? 'Current service checks' : 'Service readiness'}</h2>
      <button className="rounded-lg border border-slate-500 px-4 py-2 disabled:opacity-50" disabled={loading} onClick={() => void refresh()}>Refresh status</button>
    </div>
    {loading && <p role="status">Checking service readiness…</p>}
    {error && <p role="alert">Status unavailable. No healthy state or account balance has been assumed.</p>}
    {result && !humanReadable && <dl className="grid grid-cols-2 gap-3">
      <dt>Overall</dt><dd>{result.status}</dd>
      <dt>Runtime</dt><dd>{result.checks.runtime}</dd>
      <dt>Database</dt><dd>{result.checks.persistence}</dd>
      <dt>AI pilot</dt><dd>{result.checks.ai_pilot}</dd>
    </dl>}
    {explained && <div aria-live="polite" className="space-y-4">
      <p className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">{explained.summary}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 px-4 py-3">
          <dt className="text-sm text-slate-400">Application server</dt>
          <dd className="mt-1 font-semibold">{explained.server}</dd>
        </div>
        <div className="rounded-lg border border-slate-800 px-4 py-3">
          <dt className="text-sm text-slate-400">Database</dt>
          <dd className="mt-1 font-semibold">{explained.database}</dd>
        </div>
        <div className="rounded-lg border border-slate-800 px-4 py-3">
          <dt className="text-sm text-slate-400">AI configuration</dt>
          <dd className="mt-1 font-semibold">{explained.ai}</dd>
        </div>
        <div className="rounded-lg border border-slate-800 px-4 py-3">
          <dt className="text-sm text-slate-400">Current AI response</dt>
          <dd className="mt-1 font-semibold">Not tested by this page</dd>
        </div>
      </dl>
    </div>}
    {humanReadable && result && checkedAt && <p className="text-xs text-slate-400">
      Checked at {checkedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} (device time). This is a one-time check, not continuous monitoring.
    </p>}
    <p className="text-sm text-slate-400">{humanReadable
      ? 'This read-only check does not send an AI question. It cannot confirm current provider responses, sustained availability, response times or actual billing.'
      : 'Readiness does not verify provider entitlement, live inference, latency or billing balances. Those measurements are unavailable here.'}</p>
  </section>;
}
export default ApiSystemStatusDashboard;
