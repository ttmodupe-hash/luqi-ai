// =====================================================================
// TELEMETRY & SUPER-INTELLIGENCE DASHBOARD — Luqi AI Self-Directed Core
// =====================================================================

import { useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  Cpu,
  Zap,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  Search,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

const PRESET_TASKS = [
  {
    name: "Compound Wealth & PAPSS FX Matrix",
    description:
      "Write a function named 'calculateWealth' that takes (principal, annualRate, years, monthlyContribution) and returns the total future value compounded monthly.",
    assertions:
      "const res = calculateWealth(10000, 0.08, 10, 500); if (typeof res !== 'number' || res <= 100000) throw new Error('Return bounds failed');",
  },
  {
    name: "Cisco VLSM Subnet Bitmask Partitioner",
    description:
      "Write a function named 'calculateSubnet' that takes prefix length (e.g. 24) and returns the 32-bit unsigned integer bitmask.",
    assertions:
      "const m24 = calculateSubnet(24); if (m24 !== 4294967040) throw new Error('Mask calculation incorrect for /24');",
  },
  {
    name: "AfCFTA Value-Added Local Content Threshold",
    description:
      "Write a function named 'evalLocalContent' taking (exFactoryPrice, nonOriginatingMaterialsCost) returning the local content percentage (0-100).",
    assertions:
      "const p = evalLocalContent(1000, 400); if (p !== 60) throw new Error('Local content percentage expected 60');",
  },
];

export default function TelemetryDashboardPage() {
  const [taskName, setTaskName] = useState(PRESET_TASKS[0].name);
  const [taskDescription, setTaskDescription] = useState(PRESET_TASKS[0].description);
  const [assertions, setAssertions] = useState(PRESET_TASKS[0].assertions);

  const [isRunning, setIsRunning] = useState(false);
  const [activeCodeResult, setActiveCodeResult] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [circuitPath, setCircuitPath] = useState<string[]>([]);

  // tRPC Queries & Mutations
  const telemetryQuery = trpc.superCore.getTelemetry.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const refinementMutation = trpc.superCore.runAutonomousRefinement.useMutation();

  const summary = telemetryQuery.data?.summary || {
    totalExecutions: 0,
    averageLatencyMs: 0,
    averageAttempts: 0,
    failedCycles: 0,
    successRatePercent: 0,
  };

  const records = telemetryQuery.data?.records || [];

  const handleRunRefinement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning) return;

    setIsRunning(true);
    setExecutionLogs(["[Review] Requesting a proposed change for human and CI evaluation..."]);
    setActiveCodeResult(null);

    try {
      const res = await refinementMutation.mutateAsync({
        taskName,
        taskDescription,
        assertions,
        maxCycles: 3,
      });

      setActiveCodeResult(res.activeCode);
      setExecutionLogs(res.logs);
      setCircuitPath(res.circuitPath);

      toast.success(`Reviewable proposal #${res.patchId} saved. No code was executed or deployed.`);

      telemetryQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Proposal request failed.");
      setExecutionLogs((prev) => [...prev, `[Request failed] ${err?.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const selectPreset = (preset: (typeof PRESET_TASKS)[0]) => {
    setTaskName(preset.name);
    setTaskDescription(preset.description);
    setAssertions(preset.assertions);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-teal-500/20"
            >
              ⚡
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">Super-Intelligence Telemetry</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-mono font-bold border border-teal-500/20">
                  CIRCUIT BREAKER ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">AI-assisted repair proposals · persistent records · CI and human approval</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/companion"
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all font-medium"
            >
              AI Companion
            </Link>
            <Link
              to="/"
              className="text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <span className="text-xs text-slate-400 font-medium">Verified code executions</span>
            <p className="text-2xl font-bold text-teal-400 mt-1">{summary.totalExecutions}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">No runtime execution of model-generated code</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <span className="text-xs text-slate-400 font-medium">Recorded execution latency</span>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{summary.averageLatencyMs}ms</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Not inferred from AI proposals</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <span className="text-xs text-slate-400 font-medium">Verified test cycles</span>
            <p className="text-2xl font-bold text-purple-400 mt-1">{summary.averageAttempts}x</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Only externally verified results count</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <span className="text-xs text-slate-400 font-medium">Verified execution rate</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.successRatePercent}%</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Unverified proposals never count as successes</span>
          </div>
        </div>

        {/* Interactive Autonomous Code Harness */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Definition Panel */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-100">Reviewable Change Proposal</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Node.js Sandbox Isolation</span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 text-[11px] shrink-0">Presets:</span>
              {PRESET_TASKS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] whitespace-nowrap transition-colors ${
                    taskName === preset.name
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/40 font-semibold"
                      : "bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  {preset.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <form onSubmit={handleRunRefinement} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Task Name</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Task Specification (Draft Prompt)
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3 text-xs text-slate-100 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Proposed CI Verification Assertions
                </label>
                <textarea
                  value={assertions}
                  onChange={(e) => setAssertions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3 text-xs text-teal-300 focus:outline-none font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRunning}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating review proposal...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Generate Proposal for Review</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Execution Output & Logs */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">Proposal Creation & Review Audit</h3>
                </div>
                {circuitPath.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                    <span>Circuit:</span>
                    {circuitPath.map((node, i) => (
                      <span key={i} className="text-teal-400">
                        {node}
                        {i < circuitPath.length - 1 ? " → " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Execution Console Logs */}
              <div className="mt-3 bg-slate-950 rounded-2xl p-3.5 border border-slate-800/80 font-mono text-xs max-h-40 overflow-y-auto space-y-1 text-slate-300">
                {executionLogs.length === 0 ? (
                  <span className="text-slate-400 italic">No execution in progress. Click Run above to test.</span>
                ) : (
                  executionLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes("✨")
                          ? "text-emerald-400 font-semibold"
                          : log.includes("❌")
                          ? "text-rose-400"
                          : log.includes("📊")
                          ? "text-teal-400 font-bold"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Unverified Suggested Changes */}
            {activeCodeResult && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Review Required: Not Tested
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">No execution or deployment</span>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 text-xs font-mono text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                  {activeCodeResult}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Real-time System Audit Ledger */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-slate-100">Persistent AI Review Proposals</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{records.length} historical records</span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
            {records.map((r) => (
              <div
                key={r.id}
                className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-800/40 rounded-xl transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{r.taskName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{r.activeModel}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {r.rootCauseAnalysis}
                  </p>
                  {r.optimizedPromptDelta && r.optimizedPromptDelta.length > 5 && (
                    <p className="text-[10px] text-teal-400/90 font-mono">
                      ↳ Delta: {r.optimizedPromptDelta}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-400 shrink-0 text-[11px]">
                  <span>⏱️ {r.executionTimeMs}ms</span>
                  <span>🔄 {r.attemptsBeforeSuccess} Loops</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === "SUCCESS"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
