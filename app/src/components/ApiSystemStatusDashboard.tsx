import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const readiness = z.object({
  status: z.enum(['configured_not_verified', 'degraded']),
  checks: z.object({ runtime: z.string(), persistence: z.string(), ai_pilot: z.string() }),
});
type Readiness = z.infer<typeof readiness>;

export function ApiSystemStatusDashboard() {
  const [result, setResult] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef<AbortController | null>(null);

  async function refresh() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true); setResult(null); setError(false);
    try {
      const response = await fetch('/v1/readiness', {
        cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal,
      });
      if (response.status !== 200 && response.status !== 503) throw new Error('Unavailable');
      const data = readiness.parse(await response.json());
      if (!controller.signal.aborted) setResult(data);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => { void refresh(); return () => pending.current?.abort(); }, []);

  return <section className="my-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-100" aria-label="Service readiness" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Service readiness</h2>
      <button className="rounded-lg border border-slate-500 px-4 py-2 disabled:opacity-50" disabled={loading} onClick={() => void refresh()}>Refresh status</button>
    </div>
    {loading && <p role="status">Checking service readiness…</p>}
    {error && <p role="alert">Status unavailable. No healthy state or account balance has been assumed.</p>}
    {result && <dl className="grid grid-cols-2 gap-3">
      <dt>Overall</dt><dd>{result.status}</dd>
      <dt>Runtime</dt><dd>{result.checks.runtime}</dd>
      <dt>Database</dt><dd>{result.checks.persistence}</dd>
      <dt>AI pilot</dt><dd>{result.checks.ai_pilot}</dd>
    </dl>}
    <p className="text-sm text-slate-400">Readiness does not verify provider entitlement, live inference, latency or billing balances. Those measurements are unavailable here.</p>
  </section>;
}
export default ApiSystemStatusDashboard;
