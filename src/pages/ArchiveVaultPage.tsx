// =====================================================================
// ARCHIVE VAULT & BLACK BOX FLIGHT RECORDER PAGE
// =====================================================================
// Complete visual dashboard for:
//   1. Orchestration Archiving: LangGraph Checkpoints & Flight Recorder
//   2. Cognitive Archiving: CrewAI Unified Memory (Short/Long/Entity)
//   3. Custom Data Storage Layer: Date-Structured File Vault & JSON Metadata
// =====================================================================

import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import {
  Archive,
  Database,
  Brain,
  FileSpreadsheet,
  FileText,
  Clock,
  Layers,
  Search,
  CheckCircle,
  ExternalLink,
  Shield,
  Activity,
  Folder,
  FileJson,
  Hash,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";

export default function ArchiveVaultPage() {
  const [activeTab, setActiveTab] = useState<"flight_recorder" | "cognitive_memory" | "artifact_vault">("flight_recorder");
  const [selectedThread, setSelectedThread] = useState<string>("luqi_session_genesis");
  const [memoryFilter, setMemoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Queries
  const stats = trpc.archive.getArchiveStatus.useQuery(undefined, { refetchInterval: 10000 });
  const threads = trpc.archive.listThreads.useQuery(undefined, { refetchInterval: 5000 });
  const timeline = trpc.archive.getThreadTimeline.useQuery(
    { threadId: selectedThread },
    { enabled: Boolean(selectedThread), refetchInterval: 5000 }
  );
  const cognitive = trpc.archive.getCognitiveMemory.useQuery({
    category: memoryFilter ? (memoryFilter as any) : undefined,
    searchQuery: searchQuery || undefined,
  });
  const artifacts = trpc.archive.listArtifacts.useQuery(undefined, { refetchInterval: 5000 });

  // Mutations
  const utils = trpc.useUtils();
  const testFactMutation = trpc.archive.storeCognitiveFact.useMutation({
    onSuccess: () => {
      utils.archive.getCognitiveMemory.invalidate();
      utils.archive.getArchiveStatus.invalidate();
    },
  });

  const testArtifactMutation = trpc.archive.archiveArtifact.useMutation({
    onSuccess: () => {
      utils.archive.listArtifacts.invalidate();
      utils.archive.getArchiveStatus.invalidate();
    },
  });

  const handleSimulateExcelReconciliation = () => {
    testArtifactMutation.mutate({
      fileName: `Reconciled_Asset_Serials_${Date.now()}.xlsx`,
      fileType: "excel",
      contentText: "Standardized Multi-Tab Excel Workbook with Clean Primary Keys",
      taskOutput: {
        agentRole: "Data Architect",
        taskName: "Multi-tab Excel Serial Number Standardization",
        crewId: "crew_data_reconciliation",
        threadId: selectedThread,
        modelUsed: "Gemini 3.1 Pro / GPT-4o",
        promptSummary: "Harmonize primary keys across worksheets, resolve serial conflicts, output archive",
        executionDurationMs: 1250,
        primaryKeysReconciled: 532,
        status: "verified",
      },
    });

    testFactMutation.mutate({
      category: "entity",
      subject: "Asset Serial Master Reconciliation",
      predicate: "standardized_record_count",
      object: "532 entries verified",
      context: "Automated Excel workflow archiving",
      confidence: 1.0,
      sourceTask: "Excel Reconciliation Pipeline",
      agentRole: "Data Architect",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">Luqi Total Archiving Vault</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Unalterable Black Box
                </span>
              </div>
              <p className="text-xs text-slate-400">
                LangGraph Checkpointers + CrewAI Unified Memory + Date-Partitioned File Vault
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateExcelReconciliation}
              disabled={testArtifactMutation.isPending}
              className="text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
            >
              {testArtifactMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Archive Excel Reconciliation
            </button>
            <Link
              to="/video-studio"
              className="text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-300"
            >
              Video Studio
            </Link>
            <Link
              to="/"
              className="text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-400"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top 3-Layer Summary Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Layer 1: Flight Recorder
              </span>
              <span className="text-[10px] text-slate-500 font-mono">LangGraph</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {stats.data?.flightRecorder.totalSteps ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">checkpoints</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.data?.flightRecorder.totalThreads ?? 0} active session threads tracked with unalterable state diffs.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> Layer 2: Cognitive Memory
              </span>
              <span className="text-[10px] text-slate-500 font-mono">CrewAI</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {stats.data?.cognitiveMemory.totalFacts ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">facts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Short-term, long-term, and entity memory indexed in persistent storage.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-4 h-4" /> Layer 3: Artifact Vault
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Date-Structured</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {stats.data?.artifactVault.totalArtifacts ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">artifacts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Workbooks & reports with paired JSON metadata & SHA-256 validation.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("flight_recorder")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "flight_recorder"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> 1. LangGraph Flight Recorder (Mechanical Steps)
          </button>

          <button
            onClick={() => setActiveTab("cognitive_memory")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "cognitive_memory"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> 2. CrewAI Unified Memory (Cognitive Facts)
          </button>

          <button
            onClick={() => setActiveTab("artifact_vault")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "artifact_vault"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Folder className="w-3.5 h-3.5" /> 3. Data Storage Vault (Files & JSON Metadata)
          </button>
        </div>

        {/* TAB 1: FLIGHT RECORDER (LangGraph Checkpoint Timelines) */}
        {activeTab === "flight_recorder" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Session Threads ({threads.data?.length ?? 0})
              </h3>
              <div className="space-y-2">
                {threads.data?.map((t) => (
                  <div
                    key={t.threadId}
                    onClick={() => setSelectedThread(t.threadId)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedThread === t.threadId
                        ? "bg-sky-500/10 border-sky-500/40 text-slate-100"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate">{t.threadId}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-mono">
                        {t.totalSteps} steps
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span>Node: {t.lastNode}</span>
                      <span>{t.toolCallsCount} tool calls</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  Flight Timeline: <span className="text-slate-200 font-mono">{selectedThread}</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  {timeline.data?.length ?? 0} sequential transitions
                </span>
              </div>

              <div className="space-y-3">
                {timeline.data?.map((chk, i) => (
                  <div
                    key={chk.checkpointId}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">
                          {chk.step}
                        </span>
                        <span className="text-sm font-bold text-slate-200 font-mono">
                          node: {chk.nodeName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{chk.hash}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Channel Values Snapshot:</div>
                      {JSON.stringify(chk.channelValues, null, 2)}
                    </div>

                    {chk.toolCalls && chk.toolCalls.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold text-amber-400/80">
                          Executed Mechanical Tool Calls:
                        </div>
                        {chk.toolCalls.map((tc, tcIndex) => (
                          <div
                            key={tcIndex}
                            className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] flex items-center justify-between"
                          >
                            <span className="text-amber-300 font-mono">{tc.toolName}</span>
                            <span className="text-slate-500">{tc.durationMs}ms</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COGNITIVE MEMORY (CrewAI Unified Memory Facts) */}
        {activeTab === "cognitive_memory" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search facts (VAT, serial numbers, margin protector)..."
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 w-72 focus:outline-none focus:border-purple-500/50"
                />
                <select
                  value={memoryFilter}
                  onChange={(e) => setMemoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                >
                  <option value="">All Tiers (Short, Long, Entity)</option>
                  <option value="short_term">Short-Term Memory</option>
                  <option value="long_term">Long-Term Memory</option>
                  <option value="entity">Entity Knowledge Graph</option>
                </select>
              </div>

              <div className="text-xs text-slate-400">
                Storage: <span className="font-mono text-purple-400">{cognitive.data?.storageDir}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cognitive.data?.facts.map((fact) => (
                <div
                  key={fact.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {fact.category}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(fact.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-100">{fact.subject}</div>
                  <div className="text-xs text-slate-400">
                    <span className="text-purple-400 font-mono">{fact.predicate}</span> &rarr;{" "}
                    <span className="text-slate-200 font-semibold">{fact.object}</span>
                  </div>

                  {fact.context && <p className="text-[11px] text-slate-500">{fact.context}</p>}

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Task: {fact.sourceTask}</span>
                    <span>Agent: {fact.agentRole}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM DATA STORAGE LAYER (Artifact Vault) */}
        {activeTab === "artifact_vault" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Date-Structured Artifacts Vault</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Path: <span className="font-mono text-emerald-400">{artifacts.data?.vaultRoot}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Available Date Folders:</span>
                {artifacts.data?.dates.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artifacts.data?.artifacts.map((art) => (
                <div
                  key={art.artifactId}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        {art.fileType === "excel" ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span>{art.fileType.toUpperCase()}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{art.dateFolder}</span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-100 truncate">{art.fileName}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {art.taskOutput.taskName} &middot; {art.taskOutput.agentRole}
                    </p>

                    <div className="mt-2.5 bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1 text-[11px] font-mono">
                      <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
                        <span>Paired Metadata JSON:</span>
                        <span className="text-emerald-400">{art.taskOutput.status}</span>
                      </div>
                      <div className="text-slate-400 truncate">SHA256: {art.sha256.slice(0, 20)}...</div>
                      {art.taskOutput.primaryKeysReconciled && (
                        <div className="text-amber-400">
                          Reconciled: {art.taskOutput.primaryKeysReconciled} records
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Size: {art.fileSizeBytes} B</span>
                    <span>Model: {art.taskOutput.modelUsed}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
