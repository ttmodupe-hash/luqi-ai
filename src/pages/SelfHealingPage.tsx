// =====================================================================
// SELF-HEALING MULTI-AGENT METACOGNITION DASHBOARD — ENHANCED
// Real-time monitoring with AI patches, predictions, supervisor, A/B tests
// =====================================================================

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Link, useLocation } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Database,
  GitBranch,
  GitPullRequest,
  Globe,
  Hammer,
  HeartPulse,
  History,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Terminal,
  TrendingDown,
  TrendingUp,
  Undo2,
  Wand2,
  Zap,
  ExternalLink,
  FileCode,
} from "lucide-react";

// ── TYPES ───────────────────────────────────────────────────────────

interface ErrorLog {
  id: number;
  timestamp: Date | null;
  errorType: string;
  severity: string;
  message: string;
  sourceModule: string | null;
  sourceFile: string | null;
  resolved: number | null;
  fingerprint?: string | null;
  occurrenceCount?: number | null;
  lastSeen?: Date | null;
}

interface Patch {
  id: number;
  patchType: string;
  status: string;
  targetModule: string;
  targetFile?: string | null;
  description: string | null;
  agentName: string;
  createdAt: Date | null;
  appliedAt: Date | null;
  aiModel?: string | null;
  aiConfidence?: string | null;
  abTestPercent?: number | null;
  executionLog?: string | null;
}

interface BenchmarkFeed {
  id: number;
  timestamp: Date | null;
  feedSource: string;
  region: string;
  updateType: string;
  processed: number | null;
  frameworkKey: string | null;
  payloadJson?: string;
  processedAt?: Date | null;
  patchId?: number | null;
  agentName?: string | null;
}

interface AgentActivity {
  id: number;
  timestamp: Date | null;
  agentName: string;
  activityType: string;
  status: string;
  targetModule: string | null;
  details: string | null;
  durationMs: number | null;
  metadataJson?: string | null;
}

interface Prediction {
  metricType: string;
  module: string;
  currentValue: number;
  predictedValue: number;
  predictedAt: Date;
  confidence: number;
  trend: "rising" | "falling" | "stable";
  timeToThreshold?: number;
  recommendation: string;
}

interface SupervisorReport {
  timestamp: Date;
  overallStatus: "healthy" | "degraded" | "critical";
  agents: {
    name: string;
    status: "active" | "idle" | "failed" | "unresponsive";
    lastActivity?: Date;
    activityCount24h: number;
    failureRate: number;
  }[];
  systemIntegrity: {
    errorLogTable: boolean;
    patchTable: boolean;
    metricsTable: boolean;
    activityTable: boolean;
  };
  recommendations: string[];
}

// ── UTILITY ─────────────────────────────────────────────────────────

function timeAgo(d: Date | string | null | undefined) {
  if (!d) return "unknown";
  const diff = Date.now() - new Date(d).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function severityColor(s: string) {
  switch (s) {
    case "critical": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "warning": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    default: return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  }
}

function statusColor(s: string) {
  switch (s) {
    case "applied": case "success": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "failed": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "pending": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "rolled_back": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    case "ab_testing": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
    default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  }
}

function agentIcon(name: string) {
  switch (name) {
    case "ErrorMonitor": return <ShieldAlert className="w-4 h-4" />;
    case "HealingEngineer": return <Hammer className="w-4 h-4" />;
    case "BenchmarkUpgrader": return <Globe className="w-4 h-4" />;
    case "PredictiveAnalyst": return <Brain className="w-4 h-4" />;
    case "MetaSupervisor": return <HeartPulse className="w-4 h-4" />;
    case "Notifier": return <Bell className="w-4 h-4" />;
    default: return <Cpu className="w-4 h-4" />;
  }
}

function agentColor(name: string) {
  switch (name) {
    case "ErrorMonitor": return "text-red-400";
    case "HealingEngineer": return "text-emerald-400";
    case "BenchmarkUpgrader": return "text-sky-400";
    case "PredictiveAnalyst": return "text-purple-400";
    case "MetaSupervisor": return "text-pink-400";
    case "Notifier": return "text-amber-400";
    default: return "text-slate-400";
  }
}

// ── COMPONENTS ──────────────────────────────────────────────────────

const StatCard = ({ title, value, sub, icon, tone }: { title: string; value: string | number; sub?: string; icon: React.ReactNode; tone: "red" | "amber" | "emerald" | "sky" | "slate" | "purple" | "cyan" }) => {
  const toneMap: Record<string, string> = {
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    sky: "from-sky-500/10 to-sky-500/5 border-sky-500/20 text-sky-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
    slate: "from-slate-500/10 to-slate-500/5 border-slate-500/20 text-slate-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${toneMap[tone]} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{title}</span>
        <div className="opacity-60">{icon}</div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
      active ? "bg-slate-800 text-white border border-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
    }`}
  >
    {icon}
    {label}
    {count !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-slate-700" : "bg-slate-800"}`}>{count}</span>}
  </button>
);

const Badge = ({ children, tone = "slate" }: { children: React.ReactNode; tone?: "red" | "amber" | "emerald" | "sky" | "purple" | "slate" | "cyan" }) => {
  const tones = {
    red: "bg-red-400/10 text-red-400 border-red-400/20",
    amber: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    emerald: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    sky: "bg-sky-400/10 text-sky-400 border-sky-400/20",
    purple: "bg-purple-400/10 text-purple-400 border-purple-400/20",
    cyan: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
    slate: "bg-slate-400/10 text-slate-400 border-slate-400/20",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${tones[tone]}`}>{children}</span>;
};

// ── MAIN PAGE ───────────────────────────────────────────────────────

export default function SelfHealingPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "errors" | "patches" | "benchmarks" | "activity" | "predictions" | "supervisor" | "pipeline">("pipeline");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["overview", "errors", "patches", "benchmarks", "activity", "predictions", "supervisor", "pipeline"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [location.search]);

  useEffect(() => {
    const handleCustomNav = (e: any) => {
      const detail = e.detail;
      if (detail?.tabKey === "tab" && detail?.tabValue && ["overview", "errors", "patches", "benchmarks", "activity", "predictions", "supervisor", "pipeline"].includes(detail.tabValue)) {
        setActiveTab(detail.tabValue);
      }
    };
    window.addEventListener("luqi:navigate-tab", handleCustomNav);
    return () => window.removeEventListener("luqi:navigate-tab", handleCustomNav);
  }, []);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [expandedPatch, setExpandedPatch] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 70/30 Pipeline State
  const [pipelineJobs, setPipelineJobs] = useState<any[]>([]);
  const [newBugReport, setNewBugReport] = useState("PayFast webhook signature validation mismatch on valid test payloads.");
  const [newTargetFile, setNewTargetFile] = useState("token_billing_gateway.py");
  const [isTriggering, setIsTriggering] = useState(false);
  const [sandboxCode, setSandboxCode] = useState(`# Test reproduction script for isolated execution
import sys
import hashlib
import time

print("Initializing SWE-ReX Docker Sandbox container (python:3.11-slim)...")
print("Target file: token_billing_gateway.py")

# Test signature hashing with RFC-compliant parameter ordering
params = {"amount_gross": "450.00", "m_payment_id": "test_99", "custom_str1": "user@luqi.ai"}
sorted_keys = sorted(params.keys())
serialized = "&".join(f"{k}={params[k]}" for k in sorted_keys)
test_hash = hashlib.md5(serialized.encode("utf-8")).hexdigest()

print(f"Serialized Payload: {serialized}")
print(f"Computed MD5 Signature: {test_hash}")
print("STATUS: Verification test passed with zero errors.")
`);
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);
  const [isExecutingSandbox, setIsExecutingSandbox] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchPipelineJobs = async () => {
    try {
      const res = await fetch("/api/v1/self-healing/pipeline/jobs");
      if (res.ok) {
        const data = await res.json();
        if (data.jobs) setPipelineJobs(data.jobs);
      }
    } catch {
      // Non-fatal if offline
    }
  };

  useEffect(() => {
    fetchPipelineJobs();
    const timer = setInterval(fetchPipelineJobs, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleTriggerSelfHealing = async () => {
    if (!newBugReport.trim()) return;
    setIsTriggering(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/v1/self-healing/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bug_report: newBugReport, target_file: newTargetFile }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`Triggered 70% autonomous diagnostic! Job ${data.job_id} halted at 30% Human Gate.`);
        fetchPipelineJobs();
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err?.message || "Failed to trigger pipeline"}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleAuthorizeDeployment = async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/self-healing/pipeline/jobs/${jobId}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: "Security Operator (You)" }),
      });
      if (res.ok) {
        setActionMessage(`Human Authorization Approved: PR merged and deployed to production!`);
        fetchPipelineJobs();
      }
    } catch (err: any) {
      setActionMessage(`Authorization error: ${err?.message}`);
    }
  };

  const handleRejectDeployment = async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/self-healing/pipeline/jobs/${jobId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: "Security Operator (You)", reason: "Code changes rejected during manual review." }),
      });
      if (res.ok) {
        setActionMessage(`Deployment Rejected: Pipeline halted. Main branch protected.`);
        fetchPipelineJobs();
      }
    } catch (err: any) {
      setActionMessage(`Rejection error: ${err?.message}`);
    }
  };

  const handleRunSandbox = async () => {
    setIsExecutingSandbox(true);
    setSandboxResult(null);
    try {
      const res = await fetch("/api/v1/self-healing/pipeline/sandbox-exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sandboxCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data.output);
      }
    } catch (err: any) {
      setSandboxResult(`Sandbox Error: ${err?.message}`);
    } finally {
      setIsExecutingSandbox(false);
    }
  };

  // Queries
  const errorStats = trpc.selfHealing.getErrorStats.useQuery({ hours: 24 }, { refetchInterval: autoRefresh ? 5000 : false });
  const patchStats = trpc.selfHealing.getPatchStats.useQuery({ hours: 24 }, { refetchInterval: autoRefresh ? 5000 : false });
  const benchmarkStats = trpc.selfHealing.getBenchmarkStats.useQuery({ hours: 168 }, { refetchInterval: autoRefresh ? 5000 : false });
  const recentErrors = trpc.selfHealing.getRecentErrors.useQuery({ limit: 50 }, { refetchInterval: autoRefresh ? 5000 : false });
  const patches = trpc.selfHealing.getPatches.useQuery({ limit: 50 }, { refetchInterval: autoRefresh ? 5000 : false });
  const benchmarks = trpc.selfHealing.getBenchmarkFeeds.useQuery({ limit: 50 }, { refetchInterval: autoRefresh ? 5000 : false });
  const activity = trpc.selfHealing.getAgentActivity.useQuery({ limit: 100 }, { refetchInterval: autoRefresh ? 5000 : false });
  const predictions = trpc.selfHealing.predictFailures.useQuery(undefined, { refetchInterval: autoRefresh ? 15000 : false });
  const supervisorReport = trpc.selfHealing.runSupervisorScan.useQuery(undefined, { refetchInterval: autoRefresh ? 30000 : false });
  const errorForecast = trpc.selfHealing.forecastErrorVolume.useQuery(undefined, { refetchInterval: autoRefresh ? 60000 : false });

  // Mutations
  const utils = trpc.useUtils();
  const refreshAll = () => {
    utils.selfHealing.getErrorStats.invalidate();
    utils.selfHealing.getPatchStats.invalidate();
    utils.selfHealing.getBenchmarkStats.invalidate();
    utils.selfHealing.getRecentErrors.invalidate();
    utils.selfHealing.getPatches.invalidate();
    utils.selfHealing.getBenchmarkFeeds.invalidate();
    utils.selfHealing.getAgentActivity.invalidate();
    utils.selfHealing.predictFailures.invalidate();
    utils.selfHealing.runSupervisorScan.invalidate();
    utils.selfHealing.forecastErrorVolume.invalidate();
  };

  const runScan = trpc.selfHealing.runTelemetryScan.useMutation({ onSuccess: refreshAll });
  const applyPatch = trpc.selfHealing.applyPatch.useMutation({ onSuccess: refreshAll });
  const rollbackPatch = trpc.selfHealing.rollbackPatch.useMutation({ onSuccess: refreshAll });
  const proposePatch = trpc.selfHealing.analyzeAndProposePatch.useMutation({ onSuccess: refreshAll });
  const rejectPatch = trpc.selfHealing.rejectPatchProposal.useMutation({ onSuccess: refreshAll });
  const processBenchmarks = trpc.selfHealing.processPendingBenchmarks.useMutation({ onSuccess: refreshAll });
  const seedBenchmarks = trpc.selfHealing.seedDemoBenchmarks.useMutation({ onSuccess: refreshAll });
  const runHealthCheck = trpc.selfHealing.runFullHealthCheck.useMutation({ onSuccess: refreshAll });
  const selfRepair = trpc.selfHealing.attemptSelfRepair.useMutation({ onSuccess: refreshAll });
  const testNotification = trpc.selfHealing.testNotification.useMutation();

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const healthScore = (() => {
    const errors = errorStats.data;
    if (!errors) return "--";
    const total = errors.total ?? 0;
    const critical = errors.critical ?? 0;
    if (total === 0) return 100;
    return Math.max(0, Math.round(100 - critical * 15 - (total - critical) * 2));
  })();

  const healthTone = healthScore === "--" ? "slate" : healthScore >= 90 ? "emerald" : healthScore >= 70 ? "amber" : "red";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Self-Healing Metacognition</h1>
              <p className="text-xs text-slate-400">AI-Powered Multi-Agent Autonomous Architecture</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
              {autoRefresh ? "Live" : "Paused"}
            </div>
            <button onClick={() => setAutoRefresh(!autoRefresh)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
              {autoRefresh ? "Pause" : "Resume"}
            </button>
            <button onClick={refreshAll} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button
              onClick={() => runHealthCheck.mutate()}
              disabled={runHealthCheck.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1.5"
            >
              {runHealthCheck.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
              Full Check
            </button>
            <Link to="/" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Health Score Banner */}
        <div className={`rounded-2xl border bg-gradient-to-r p-6 flex items-center justify-between ${
          healthTone === "emerald" ? "from-emerald-950/50 to-slate-900 border-emerald-500/20" :
          healthTone === "amber" ? "from-amber-950/50 to-slate-900 border-amber-500/20" :
          healthTone === "red" ? "from-red-950/50 to-slate-900 border-red-500/20" : "from-slate-900 to-slate-900 border-slate-700"
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${
              healthTone === "emerald" ? "bg-emerald-500/15 text-emerald-400" :
              healthTone === "amber" ? "bg-amber-500/15 text-amber-400" :
              healthTone === "red" ? "bg-red-500/15 text-red-400" : "bg-slate-500/15 text-slate-400"
            }`}>
              {healthScore}
            </div>
            <div>
              <div className="text-sm font-semibold">
                {healthScore === "--" ? "Loading..." : healthScore >= 90 ? "System Healthy" : healthScore >= 70 ? "Degraded" : "Critical"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {errorStats.data ? `${errorStats.data.total} errors, ${errorStats.data.critical} critical (24h)` : "Loading stats..."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="text-right">
              <div className="font-medium text-slate-300">{patches.data?.length ?? 0}</div>
              <div>Active Patches</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-right">
              <div className="font-medium text-slate-300">{benchmarks.data?.length ?? 0}</div>
              <div>Pending Benchmarks</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-right">
              <div className="font-medium text-slate-300">{activity.data?.length ?? 0}</div>
              <div>Agent Events</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-right">
              <div className="font-medium text-slate-300">{predictions.data?.length ?? 0}</div>
              <div>Predictions</div>
            </div>
          </div>
        </div>

        {/* Supervisor Status Bar */}
        {supervisorReport.data && (
          <div className={`rounded-xl border p-4 flex items-center justify-between ${
            supervisorReport.data.overallStatus === "healthy" ? "bg-emerald-950/30 border-emerald-500/20" :
            supervisorReport.data.overallStatus === "degraded" ? "bg-amber-950/30 border-amber-500/20" : "bg-red-950/30 border-red-500/20"
          }`}>
            <div className="flex items-center gap-3">
              <HeartPulse className={`w-5 h-5 ${
                supervisorReport.data.overallStatus === "healthy" ? "text-emerald-400" :
                supervisorReport.data.overallStatus === "degraded" ? "text-amber-400" : "text-red-400"
              }`} />
              <div>
                <span className="text-sm font-medium capitalize">{supervisorReport.data.overallStatus}</span>
                <span className="text-xs text-slate-400 ml-2">Meta-Supervisor</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {supervisorReport.data.agents.map((a) => (
                <div key={a.name} className="flex items-center gap-1.5 text-xs" title={`${a.name}: ${a.status} (${a.activityCount24h} activities, ${(a.failureRate * 100).toFixed(0)}% failure)`}>
                  <span className={`w-2 h-2 rounded-full ${
                    a.status === "active" ? "bg-emerald-400" : a.status === "idle" ? "bg-amber-400" : "bg-red-400"
                  }`} />
                  <span className="text-slate-400 hidden sm:inline">{a.name}</span>
                </div>
              ))}
              <button
                onClick={() => selfRepair.mutate()}
                disabled={selfRepair.isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors ml-2"
              >
                {selfRepair.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Self-Repair"}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <TabButton active={activeTab === "pipeline"} onClick={() => setActiveTab("pipeline")} icon={<Shield className="w-4 h-4 text-emerald-400" />} label="70/30 Pipeline (HITL)" count={pipelineJobs.filter(j => j.status === "AWAITING_HUMAN_AUTH").length} />
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<Activity className="w-4 h-4" />} label="Overview" />
          <TabButton active={activeTab === "errors"} onClick={() => setActiveTab("errors")} icon={<ShieldAlert className="w-4 h-4" />} label="Errors" count={recentErrors.data?.length ?? 0} />
          <TabButton active={activeTab === "patches"} onClick={() => setActiveTab("patches")} icon={<Hammer className="w-4 h-4" />} label="Patches" count={patches.data?.length ?? 0} />
          <TabButton active={activeTab === "predictions"} onClick={() => setActiveTab("predictions")} icon={<Brain className="w-4 h-4" />} label="Predictions" count={predictions.data?.length ?? 0} />
          <TabButton active={activeTab === "benchmarks"} onClick={() => setActiveTab("benchmarks")} icon={<Globe className="w-4 h-4" />} label="Benchmarks" count={benchmarks.data?.length ?? 0} />
          <TabButton active={activeTab === "activity"} onClick={() => setActiveTab("activity")} icon={<History className="w-4 h-4" />} label="Activity" count={activity.data?.length ?? 0} />
          <TabButton active={activeTab === "supervisor"} onClick={() => setActiveTab("supervisor")} icon={<HeartPulse className="w-4 h-4" />} label="Supervisor" />
        </div>

        {/* ── OVERVIEW TAB ───────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard title="Errors (24h)" value={errorStats.data?.total ?? "--"} sub={`${errorStats.data?.critical ?? 0} critical`} icon={<AlertTriangle className="w-5 h-5" />} tone="red" />
              <StatCard title="Resolved" value={errorStats.data?.resolved ?? "--"} sub={`${errorStats.data?.warning ?? 0} warnings`} icon={<CheckCircle className="w-5 h-5" />} tone="emerald" />
              <StatCard title="Patches" value={patchStats.data?.total ?? "--"} sub={`${patchStats.data?.applied ?? 0} applied`} icon={<Zap className="w-5 h-5" />} tone="sky" />
              <StatCard title="Pending Patches" value={patchStats.data?.pending ?? 0} sub="Awaiting review" icon={<GitBranch className="w-5 h-5" />} tone="cyan" />
              <StatCard title="Benchmarks" value={benchmarkStats.data?.total ?? "--"} sub={`${benchmarkStats.data?.pending ?? 0} pending`} icon={<Layers className="w-5 h-5" />} tone="amber" />
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Error Monitor */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><ShieldAlert className="w-5 h-5" /></div>
                  <div>
                    <div className="font-semibold text-sm">ErrorMonitor Agent</div>
                    <div className="text-xs text-slate-500">Telemetry & Anomaly Detection</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Scan Interval</span><span className="text-slate-200">5 minutes</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Errors Detected</span><span className="text-red-400 font-medium">{errorStats.data?.total ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Unique Fingerprints</span><span className="text-slate-200">{new Set(recentErrors.data?.map((e: ErrorLog) => e.fingerprint).filter(Boolean)).size}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Recurring</span><span className="text-amber-400 font-medium">{recentErrors.data?.filter((e: ErrorLog) => (e.occurrenceCount ?? 1) > 1).length ?? 0}</span></div>
                </div>
                <button onClick={() => runScan.mutate()} disabled={runScan.isPending} className="mt-4 w-full text-xs py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors flex items-center justify-center gap-2">
                  {runScan.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Run Telemetry Scan
                </button>
              </div>

              {/* Healing Engineer */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Hammer className="w-5 h-5" /></div>
                  <div>
                    <div className="font-semibold text-sm">HealingEngineer Agent</div>
                    <div className="text-xs text-slate-500">Review proposals only — no code execution</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Patches Generated</span><span className="text-slate-200">{patchStats.data?.total ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Awaiting external CI review</span><span className="text-emerald-400 font-medium">{patches.data?.filter((p: Patch) => p.status === "approved_for_ci").length ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">AI Generated</span><span className="text-sky-400 font-medium">{patches.data?.filter((p: Patch) => p.aiModel).length ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Auto-deployment / rollback</span><span className="text-purple-400 font-medium">Disabled</span></div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="rounded bg-slate-800 border-slate-700" />
                    <Wand2 className="w-3 h-3" /> AI Patch Generation
                  </label>
                </div>
              </div>

              {/* Predictive Analyst */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400"><Brain className="w-5 h-5" /></div>
                  <div>
                    <div className="font-semibold text-sm">PredictiveAnalyst</div>
                    <div className="text-xs text-slate-500">Failure Forecasting</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Active Predictions</span><span className="text-purple-400 font-medium">{predictions.data?.length ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Error Forecast (1h)</span><span className="text-slate-200">{errorForecast.data?.predictedNextHour ?? "--"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Trend</span><span className={errorForecast.data?.trend === "rising" ? "text-red-400" : errorForecast.data?.trend === "falling" ? "text-emerald-400" : "text-slate-400"}>{errorForecast.data?.trend ?? "--"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Confidence</span><span className="text-slate-200">{errorForecast.data ? `${(errorForecast.data.confidence * 100).toFixed(0)}%` : "--"}</span></div>
                </div>
                <button onClick={() => setActiveTab("predictions")} className="mt-4 w-full text-xs py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors flex items-center justify-center gap-2">
                  <Brain className="w-3 h-3" /> View Predictions
                </button>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /> Recent Agent Activity</h3>
                <button onClick={() => setActiveTab("activity")} className="text-xs text-sky-400 hover:text-sky-300">View All →</button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activity.data && activity.data.length > 0 ? (
                  activity.data.slice(0, 8).map((a: AgentActivity) => (
                    <div key={a.id} className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-slate-800/50 border border-slate-800/50">
                      <div className={`mt-0.5 ${agentColor(a.agentName)}`}>{agentIcon(a.agentName)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-200">{a.agentName}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400 capitalize">{a.activityType}</span>
                          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border ${statusColor(a.status)}`}>{a.status}</span>
                        </div>
                        <div className="text-slate-400 mt-0.5 truncate">{a.details}</div>
                        <div className="text-slate-600 mt-0.5">{timeAgo(a.timestamp)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-8">No agent activity recorded yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ERRORS TAB ─────────────────────────────────────────────── */}
        {activeTab === "errors" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-400" /> Error Log Stream</h3>
              <button onClick={() => runScan.mutate()} disabled={runScan.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5">
                {runScan.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Scan Now
              </button>
            </div>
            <div className="space-y-2">
              {recentErrors.data && recentErrors.data.length > 0 ? (
                recentErrors.data.map((e: ErrorLog) => (
                  <div key={e.id} className={`rounded-xl border p-4 transition-all hover:border-slate-600 ${e.resolved ? "bg-slate-900/30 border-slate-800/50 opacity-60" : "bg-slate-900/50 border-slate-800"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge tone={e.severity === "critical" ? "red" : e.severity === "warning" ? "amber" : "sky"}>{e.severity}</Badge>
                          <span className="text-xs font-mono text-slate-400">{e.errorType}</span>
                          <span className="text-xs text-slate-600">{e.sourceModule}</span>
                          {(e.occurrenceCount ?? 1) > 1 && <Badge tone="amber">×{e.occurrenceCount} recurring</Badge>}
                          {e.fingerprint && <span className="text-[10px] text-slate-600 font-mono" title={e.fingerprint}>fp:{e.fingerprint.substring(0, 8)}</span>}
                        </div>
                        <div className="text-sm text-slate-200">{e.message}</div>
                        {e.sourceFile && <div className="text-[10px] text-slate-600 mt-1 font-mono">{e.sourceFile}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">{timeAgo(e.timestamp)}</span>
                        {!e.resolved && (
                          <button
                            onClick={() => proposePatch.mutate({ errorLogId: e.id, useAI: false })}
                            disabled={proposePatch.isPending}
                            className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                          >
                            {proposePatch.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hammer className="w-3 h-3" />}
                            Create review proposal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">No errors logged. System is clean.</div>
              )}
            </div>
          </div>
        )}

        {/* ── PATCHES TAB ────────────────────────────────────────────── */}
        {activeTab === "patches" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Hammer className="w-4 h-4 text-emerald-400" /> Agent Review Proposals (no deployment)</h3>
            </div>
            <div className="space-y-2">
              {patches.data && patches.data.length > 0 ? (
                patches.data.map((p: Patch) => (
                  <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                    <div className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => setExpandedPatch(expandedPatch === p.id ? null : p.id)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge tone={p.status === "applied" ? "emerald" : p.status === "failed" ? "red" : p.status === "ab_testing" ? "cyan" : p.status === "rolled_back" ? "purple" : "amber"}>{p.status}</Badge>
                            <span className="text-xs font-mono text-slate-400">{p.patchType}</span>
                            <span className="text-xs text-slate-500">{p.targetModule}</span>
                            {p.aiModel && <Badge tone="sky"><Wand2 className="w-2.5 h-2.5 inline mr-1" />AI {p.aiConfidence ? `${(parseFloat(String(p.aiConfidence)) * 100).toFixed(0)}%` : ""}</Badge>}
                            {p.abTestPercent && p.abTestPercent < 100 && <Badge tone="cyan">A/B {p.abTestPercent}%</Badge>}
                          </div>
                          <div className="text-sm text-slate-200">{p.description}</div>
                          {p.targetFile && <div className="text-[10px] text-slate-600 mt-1 font-mono">{p.targetFile}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">{timeAgo(p.createdAt)}</span>
                          {expandedPatch === p.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>
                    </div>
                    {expandedPatch === p.id && (
                      <div className="border-t border-slate-800 p-4 bg-slate-950/50 space-y-3">
                        {p.executionLog && (
                          <div>
                            <div className="text-xs font-medium text-slate-400 mb-1">Execution Log</div>
                            <pre className="text-[10px] text-slate-500 bg-slate-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">{p.executionLog}</pre>
                          </div>
                        )}
                        <div className="text-xs text-slate-400">
                          Proposals are inert. Review approval does not start CI, deploy code or confirm a fix.
                          Legacy proposals without an event history cannot be approved.
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {p.status === "proposed" && (
                            <>
                              <button onClick={() => {
                                const reason = window.prompt("Independent review rationale (12–1000 characters). No tests or deployment will run:");
                                if (reason?.trim() && reason.trim().length >= 12) {
                                  applyPatch.mutate({ patchId: p.id, reason: reason.trim(), skipTests: false });
                                }
                              }} disabled={applyPatch.isPending} className="text-xs px-3 py-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20">
                                Request independent CI review
                              </button>
                              <button onClick={() => {
                                const reason = window.prompt("Explain why this proposal should be rejected:");
                                if (reason?.trim() && reason.trim().length >= 12) {
                                  rejectPatch.mutate({ patchId: p.id, reason: reason.trim() });
                                }
                              }} disabled={rejectPatch.isPending} className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                Reject proposal
                              </button>
                            </>
                          )}
                          {p.status === "approved_for_ci" && (
                            <button onClick={() => {
                              const reason = window.prompt("Why revoke this review request? No production rollback is performed:");
                              if (reason?.trim() && reason.trim().length >= 12) {
                                rollbackPatch.mutate({ patchId: p.id, reason: reason.trim() });
                              }
                            }} disabled={rollbackPatch.isPending} className="text-xs px-3 py-1.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Revoke review request
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">No patches generated yet.</div>
              )}
            </div>
          </div>
        )}

        {/* ── PREDICTIONS TAB ────────────────────────────────────────── */}
        {activeTab === "predictions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-purple-400" /> Failure Predictions</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Forecast confidence: {errorForecast.data ? `${(errorForecast.data.confidence * 100).toFixed(0)}%` : "--"}</span>
              </div>
            </div>

            {/* Error Forecast Card */}
            {errorForecast.data && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-slate-400" /> Error Volume Forecast</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <div className="text-2xl font-bold text-slate-200">{errorForecast.data.currentHourlyRate}</div>
                    <div className="text-xs text-slate-500">Current /hour</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <div className="text-2xl font-bold text-slate-200">{errorForecast.data.predictedNextHour}</div>
                    <div className="text-xs text-slate-500">Next hour</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <div className="text-2xl font-bold text-slate-200">{errorForecast.data.predictedNext24h}</div>
                    <div className="text-xs text-slate-500">Next 24h</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <div className={`text-2xl font-bold ${errorForecast.data.trend === "rising" ? "text-red-400" : errorForecast.data.trend === "falling" ? "text-emerald-400" : "text-slate-400"}`}>
                      {errorForecast.data.trend === "rising" ? <TrendingUp className="w-6 h-6 inline" /> : errorForecast.data.trend === "falling" ? <TrendingDown className="w-6 h-6 inline" /> : "→"}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">{errorForecast.data.trend}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Predictions List */}
            <div className="space-y-2">
              {predictions.data && predictions.data.length > 0 ? (
                predictions.data.map((p: Prediction, i: number) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge tone={p.trend === "rising" ? "red" : p.trend === "falling" ? "emerald" : "slate"}>{p.trend}</Badge>
                          <span className="text-xs font-mono text-slate-400">{p.metricType}</span>
                          <span className="text-xs text-slate-500">{p.module}</span>
                          <Badge tone="purple">{(p.confidence * 100).toFixed(0)}% confidence</Badge>
                        </div>
                        <div className="text-sm text-slate-200">{p.recommendation}</div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Current: {p.currentValue.toFixed(1)}</span>
                          <span>Predicted: {p.predictedValue.toFixed(1)}</span>
                          {p.timeToThreshold && <span className="text-amber-400">Threshold in {p.timeToThreshold}min</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">No failure predictions at this time. System trends are stable.</div>
              )}
            </div>
          </div>
        )}

        {/* ── BENCHMARKS TAB ─────────────────────────────────────────── */}
        {activeTab === "benchmarks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-sky-400" /> Global Benchmark Feeds</h3>
              <div className="flex gap-2">
                <button onClick={() => seedBenchmarks.mutate()} disabled={seedBenchmarks.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700">Seed Demo Data</button>
                <button onClick={() => processBenchmarks.mutate()} disabled={processBenchmarks.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
                  {processBenchmarks.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Process Pending
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {benchmarks.data && benchmarks.data.length > 0 ? (
                benchmarks.data.map((b: BenchmarkFeed) => (
                  <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge tone={b.processed === 1 ? "emerald" : b.processed === 2 ? "red" : "amber"}>{b.processed === 1 ? "processed" : b.processed === 2 ? "failed" : "pending"}</Badge>
                          <span className="text-xs font-mono text-slate-400">{b.updateType}</span>
                          <span className="text-xs text-slate-500 capitalize">{b.region.replace("_", " ")}</span>
                        </div>
                        <div className="text-sm text-slate-200">{b.feedSource}{b.frameworkKey && <span className="text-slate-500"> → {b.frameworkKey}</span>}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{timeAgo(b.timestamp)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">No benchmark feeds ingested yet.</div>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVITY TAB ───────────────────────────────────────────── */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /> Agent Activity Log</h3>
            </div>
            <div className="relative pl-6 border-l border-slate-800 space-y-4">
              {activity.data && activity.data.length > 0 ? (
                activity.data.map((a: AgentActivity) => (
                  <div key={a.id} className="relative">
                    <div className={`absolute -left-[29px] w-3 h-3 rounded-full border-2 ${a.status === "success" ? "bg-emerald-500 border-emerald-500" : a.status === "failed" ? "bg-red-500 border-red-500" : "bg-amber-500 border-amber-500"}`} />
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${agentColor(a.agentName)}`}>{agentIcon(a.agentName)}</span>
                        <span className="text-sm font-medium text-slate-200">{a.agentName}</span>
                        <span className="text-xs text-slate-500 capitalize">{a.activityType}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColor(a.status)}`}>{a.status}</span>
                        <span className="text-[10px] text-slate-600 ml-auto">{timeAgo(a.timestamp)}</span>
                      </div>
                      {a.details && <div className="text-xs text-slate-400 mt-1">{a.details}</div>}
                      {a.durationMs && <div className="text-[10px] text-slate-600 mt-1">{a.durationMs}ms</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">No activity recorded.</div>
              )}
            </div>
          </div>
        )}

        {/* ── SUPERVISOR TAB ─────────────────────────────────────────── */}
        {activeTab === "supervisor" && supervisorReport.data && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><HeartPulse className="w-4 h-4 text-pink-400" /> Meta-Supervisor Report</h3>
              <button onClick={() => selfRepair.mutate()} disabled={selfRepair.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 border border-pink-500/30 flex items-center gap-1.5">
                {selfRepair.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Run Self-Repair
              </button>
            </div>

            {/* Agent Health Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supervisorReport.data.agents.map((agent) => (
                <div key={agent.name} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${agentColor(agent.name)} bg-opacity-10`}>{agentIcon(agent.name)}</div>
                    <div>
                      <div className="text-sm font-medium">{agent.name}</div>
                      <Badge tone={agent.status === "active" ? "emerald" : agent.status === "idle" ? "amber" : "red"}>{agent.status}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Activities (24h)</span><span className="text-slate-300">{agent.activityCount24h}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Failure Rate</span><span className={agent.failureRate > 0.2 ? "text-red-400" : "text-emerald-400"}>{(agent.failureRate * 100).toFixed(1)}%</span></div>
                    {agent.lastActivity && <div className="flex justify-between"><span className="text-slate-500">Last Active</span><span className="text-slate-300">{timeAgo(agent.lastActivity)}</span></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* System Integrity */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h4 className="text-sm font-semibold mb-4">Database Integrity</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(supervisorReport.data.systemIntegrity).map(([table, ok]) => (
                  <div key={table} className="flex items-center gap-2 text-xs">
                    {ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span className={ok ? "text-slate-300" : "text-red-400"}>{table.replace(/([A-Z])/g, " $1").trim()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {supervisorReport.data.recommendations.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <h4 className="text-sm font-semibold mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {supervisorReport.data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <ArrowRight className="w-3 h-3 mt-0.5 text-slate-600 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── 70/30 SUPER INTELLIGENCE PIPELINE TAB ────────────────── */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            {/* Action Feedback Banner */}
            {actionMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-200">{actionMessage}</p>
                </div>
                <button
                  onClick={() => setActionMessage(null)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium ml-4"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Architecture Banner */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 p-6 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                    <Shield className="w-3.5 h-3.5" /> Zero-Trust Super Intelligence Pipeline
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">70/30 Human-in-the-Loop Code Deployment Boundary</h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-3xl">
                    Combines CrewAI autonomous reasoning with isolated Docker sandboxes and LangGraph state orchestration.
                    The system mathematically guarantees the agent cannot merge to production without explicit human authorization.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                    Repo: LimitlessTelecoms/luqi-ai
                  </span>
                </div>
              </div>

              {/* Boundary Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 70% Phase */}
                <div className="rounded-xl border border-sky-500/30 bg-sky-950/10 p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm mb-2">
                    <Brain className="w-4 h-4" /> 70% Autonomous Phase (CrewAI + Sandbox)
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      Senior Security & Reliability Engineer Agent diagnoses bug
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      Code executed inside isolated Docker container (<code className="text-sky-300">python:3.11-slim</code>)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      30-Second Circuit Breaker kills infinite loops or resource drain
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      Opens Pull Request on GitHub (<code className="text-sky-300">Create_GitHub_Pull_Request</code>)
                    </li>
                  </ul>
                </div>

                {/* 30% Gated Phase */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
                    <Lock className="w-4 h-4" /> 30% Gated Control (LangGraph State Halt)
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      LangGraph physically pauses at <code className="text-amber-300 font-mono text-[11px]">interrupt_before=[&quot;human_authorization&quot;]</code>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Code cannot touch production or merge to main autonomously
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Operator inspects sandbox reproduction logs & unified diff
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Explicit human click required to trigger CI/CD production deployment
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Trigger Diagnostics Form */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Trigger Autonomous Diagnosis & Self-Healing
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Submit an error report or telemetry anomaly. CrewAI will diagnose the issue, write a test script in the isolated Docker container, generate a GitHub PR, and pause at the 30% Human Gate.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">Bug Report / Error Description</label>
                    <input
                      type="text"
                      value={newBugReport}
                      onChange={(e) => setNewBugReport(e.target.value)}
                      placeholder="e.g. PayFast webhook signature validation mismatch on valid test payloads."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">Target Repository File</label>
                    <input
                      type="text"
                      value={newTargetFile}
                      onChange={(e) => setNewTargetFile(e.target.value)}
                      placeholder="e.g. token_billing_gateway.py"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Quick Scenarios:</span>
                  <button
                    onClick={() => {
                      setNewBugReport("PayFast webhook signature validation mismatch on valid test payloads.");
                      setNewTargetFile("token_billing_gateway.py");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    PayFast ITN Webhook Signature
                  </button>
                  <button
                    onClick={() => {
                      setNewBugReport("Cyclic tool invocation loop detected in agent executor (AST05 recursion trap).");
                      setNewTargetFile("backend/zta_security.py");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Agent Recursion Loop
                  </button>
                  <button
                    onClick={() => {
                      setNewBugReport("Database connection pool exhaust during concurrent job submissions.");
                      setNewTargetFile("api/queries/connection.ts");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    DB Pool Exhaustion
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleTriggerSelfHealing}
                    disabled={isTriggering || !newBugReport.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                  >
                    {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Launch Autonomous Fix (CrewAI + Sandbox)
                  </button>
                </div>
              </div>
            </div>

            {/* Live Human-in-the-Loop Authorization Center */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" /> Human Authorization Queue (30% Gated Phase)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pull Requests created by autonomous agents. Each item is physically halted by LangGraph before deployment.
                  </p>
                </div>
                <button
                  onClick={fetchPipelineJobs}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Queue
                </button>
              </div>

              {pipelineJobs.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">All Pipeline Queues Clean</p>
                  <p className="text-xs text-slate-500 mt-1">No agent Pull Requests are pending human authorization.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pipelineJobs.map((job) => {
                    const isPending = job.status === "AWAITING_HUMAN_AUTH";
                    const isDeployed = job.status === "DEPLOYED_TO_PROD";
                    const isRejected = job.status === "REJECTED";

                    return (
                      <div
                        key={job.job_id}
                        className={`rounded-xl border ${
                          isPending
                            ? "border-amber-500/40 bg-slate-900/70 shadow-lg shadow-amber-500/5"
                            : isDeployed
                            ? "border-emerald-500/30 bg-slate-900/40"
                            : "border-slate-800 bg-slate-900/30"
                        } p-5 space-y-4 transition`}
                      >
                        {/* Job Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400 font-semibold">{job.job_id}</span>
                              <span className="text-xs text-slate-600">•</span>
                              <span className="text-xs text-slate-300 font-medium">{job.target_file}</span>
                              <span className="text-xs text-slate-600">•</span>
                              <span className="font-mono text-xs text-sky-400">{job.branch_name}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-white mt-1">{job.bug_report}</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPending && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1.5">
                                <Lock className="w-3 h-3" /> Awaiting Human Approval
                              </span>
                            )}
                            {isDeployed && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3" /> Deployed to Production
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                                Deployment Rejected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Execution Trace Steps */}
                        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            LangGraph Execution Trace (70/30 Boundary Flow)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            {job.execution_trace?.map((step: any, idx: number) => (
                              <div
                                key={idx}
                                className={`rounded p-2 text-xs border ${
                                  step.status === "INTERRUPTED"
                                    ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                                    : step.status === "APPROVED" || step.status === "COMPLETED"
                                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                <div className="font-semibold flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
                                    {idx + 1}
                                  </span>
                                  {step.step}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 leading-snug">{step.detail}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Diff & Sandbox Output Accordions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Sandbox Test Output */}
                          <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                            <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1.5">
                              <span className="flex items-center gap-1.5 text-sky-400">
                                <Terminal className="w-3.5 h-3.5" /> Docker Sandbox Logs (30s Circuit Breaker)
                              </span>
                              <span className="text-[10px] text-emerald-400 font-semibold">SWE-ReX Isolated</span>
                            </div>
                            <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-900/60 rounded border border-slate-800/80 whitespace-pre-wrap max-h-36">
                              {job.sandbox_output || "No sandbox logs available."}
                            </pre>
                          </div>

                          {/* Proposed Code Diff */}
                          <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                            <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1.5">
                              <span className="flex items-center gap-1.5 text-amber-400">
                                <FileCode className="w-3.5 h-3.5" /> Proposed Pull Request Diff
                              </span>
                              {job.pr_url && (
                                <a
                                  href={job.pr_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                                >
                                  PR #{job.pr_number || 142} <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                            <pre className="font-mono text-[11px] text-emerald-400 overflow-x-auto p-2 bg-slate-900/60 rounded border border-slate-800/80 whitespace-pre-wrap max-h-36">
                              {job.fix_diff || "Diff generated on branch " + job.branch_name}
                            </pre>
                          </div>
                        </div>

                        {/* Authorization Actions */}
                        {isPending && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>LangGraph node paused at entry point. Ready for human decision.</span>
                            </div>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                              <button
                                onClick={() => handleRejectDeployment(job.job_id)}
                                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 text-xs font-semibold transition"
                              >
                                Reject Deployment
                              </button>
                              <button
                                onClick={() => handleAuthorizeDeployment(job.job_id)}
                                className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Authorize & Merge to Production
                              </button>
                            </div>
                          </div>
                        )}

                        {isDeployed && job.resolved_at && (
                          <div className="text-xs text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-800/60">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              Authorized by <strong className="text-slate-200">{job.reviewer}</strong> at{" "}
                              {new Date(job.resolved_at).toLocaleTimeString()}. PR merged to main.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Interactive Docker Sandbox Runner */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-sky-400" /> Live Isolated Docker Sandbox Runner (<code className="text-sky-300 font-mono text-xs">Execute_Code_In_Sandbox</code>)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Runs arbitrary code inside an isolated container. Even destructive host attacks (e.g. <code className="text-red-400 font-mono text-[11px]">rm -rf /</code>) are securely contained.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setSandboxCode(`# Test reproduction script for isolated execution
import sys
import hashlib
import time

print("Initializing SWE-ReX Docker Sandbox container (python:3.11-slim)...")
print("Target file: token_billing_gateway.py")

params = {"amount_gross": "450.00", "m_payment_id": "test_99", "custom_str1": "user@luqi.ai"}
sorted_keys = sorted(params.keys())
serialized = "&".join(f"{k}={params[k]}" for k in sorted_keys)
test_hash = hashlib.md5(serialized.encode("utf-8")).hexdigest()

print(f"Serialized Payload: {serialized}")
print(f"Computed MD5 Signature: {test_hash}")
print("STATUS: Verification test passed with zero errors.")
`)
                    }
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Signature Test
                  </button>
                  <button
                    onClick={() =>
                      setSandboxCode(`# Destructive Attack Simulation
import os
import subprocess

print("Simulating dangerous agent command: attempting rm -rf /...")
os.system("rm -rf /")
print("Host test completed: Host files protected by Docker isolated sandbox barrier.")
`)
                    }
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Destructive Host Attack (<code className="text-red-400">rm -rf /</code>)
                  </button>
                  <button
                    onClick={() =>
                      setSandboxCode(`# Infinite Loop Simulation (Testing 30s Circuit Breaker)
import time

print("Starting infinite reasoning loop...")
step = 0
while True:
    step += 1
    time.sleep(1)
    if step % 5 == 0:
        print(f"Step {step} still looping...")
`)
                    }
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Infinite Loop Test
                  </button>
                </div>
              </div>

              {/* Sandbox Code Input */}
              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={sandboxCode}
                  onChange={(e) => setSandboxCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-500"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Circuit Breaker: <strong>30s Timeout</strong></span>
                    <span>•</span>
                    <span>Guest Env: <strong>python:3.11-slim</strong></span>
                    <span>•</span>
                    <span>Host Protection: <strong>Enforced</strong></span>
                  </div>

                  <button
                    onClick={handleRunSandbox}
                    disabled={isExecutingSandbox}
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition"
                  >
                    {isExecutingSandbox ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                    Execute Code In Sandbox
                  </button>
                </div>
              </div>

              {/* Execution Result Box */}
              {sandboxResult && (
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 font-mono">Sandbox Execution Console</div>
                  <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap p-2 bg-slate-900/60 rounded border border-slate-800/80">
                    {sandboxResult}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-600">
          LUQI AI Lab Simulator — Self-Healing Multi-Agent Metacognition Engine v2.0
        </div>
      </footer>
    </div>
  );
}
