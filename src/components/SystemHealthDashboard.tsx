import React, { useEffect, useState } from 'react';

interface ErrorLogNode {
  id: string;
  faultComponent: string;
  severityLevel: string;
  errorTraceDump: string;
  resolvedStatus: boolean;
  remediationAction: string | null;
  timestamp: string;
}

export const SystemHealthDashboard: React.FC = () => {
  const [errorLogs, setErrorLogs] = useState<ErrorLogNode[]>([]);
  const [isSystemHealthy, setIsSystemHealthy] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system/diagnostics-ledger')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.errorsList)) {
          setErrorLogs(data.errorsList);
          const hasFatalOutage = data.errorsList.some(
            (err: ErrorLogNode) => err.severityLevel === 'CRITICAL_HALT' && !err.resolvedStatus
          );
          setIsSystemHealthy(!hasFatalOutage);
        }
      })
      .catch((err) => console.error('Failed to load diagnostics:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto bg-slate-950 border border-slate-900 rounded-3xl text-slate-100 shadow-2xl">
      <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-4 mb-6 gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🛡️</span> Autonomic Guard & Health Shield
          </h2>
          <p className="text-xs text-slate-400">Real-time code error detection and self-patching tracking logs</p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-bold rounded-full border ${
            isSystemHealthy
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
          }`}
        >
          {isSystemHealthy ? '● All Systems Secure' : '⚠️ Circuit Breaker Tripped'}
        </span>
      </div>

      {/* Real-time Diagnostics Flow Stream */}
      <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
        Live System Exception Stream Logs
      </h3>
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse bg-slate-900 rounded-xl">
            Querying Autonomic Diagnostics Ledger...
          </div>
        ) : errorLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-dashed border-slate-800">
            No system execution runtime errors registered in the current logging ledger. All sandbox perimeters operational.
          </div>
        ) : (
          errorLogs.map((log) => (
            <div key={log.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-purple-400 font-bold">📍 Component: {log.faultComponent}</span>
                <span
                  className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                    log.resolvedStatus
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {log.resolvedStatus ? '✓ Auto-Patched' : '⚠ Active Outage'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-900">
                <p className="text-[11px] font-mono text-rose-400 whitespace-pre-wrap truncate">
                  {log.errorTraceDump}
                </p>
              </div>

              {log.remediationAction && (
                <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-900/30">
                  <p className="text-[11px] font-sans text-emerald-400">
                    <span className="font-bold">🧠 Autonomous Fix Applied:</span> {log.remediationAction}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
