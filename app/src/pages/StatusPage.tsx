import { useState, useEffect } from "react";
import { useApi, type SystemStatus } from "@/hooks/useApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Database,
  HardDrive,
  BookOpen,
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

const MODULE_ICONS: Record<string, any> = {
  db_engine: Database,
  cache: HardDrive,
  knowledge_base: BookOpen,
  state_machine: Cpu,
};

const MODULE_LABELS: Record<string, string> = {
  db_engine: "Database Engine",
  cache: "Cache Manager",
  knowledge_base: "Knowledge Base",
  state_machine: "Conversation State",
};

export default function StatusPage() {
  const { getStatus } = useApi();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    setRefreshing(true);
    const s = await getStatus();
    if (s) setStatus(s);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">System Status</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Luqi-AI v{status?.version || "3.5.0"} — Real-time module health
            </p>
          </div>
          <button
            onClick={fetchStatus}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {status ? (
          <>
            {/* Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(status.modules || {}).map(([key, ready]) => {
                const Icon = MODULE_ICONS[key] || Cpu;
                const label = MODULE_LABELS[key] || key;
                return (
                  <Card
                    key={key}
                    className={`bg-neutral-900 border-neutral-800 ${
                      ready ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-red-500"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              ready ? "bg-emerald-500/10" : "bg-red-500/10"
                            }`}
                          >
                            <Icon
                              size={20}
                              className={ready ? "text-emerald-400" : "text-red-400"}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{label}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {ready ? (
                                <>
                                  <CheckCircle2 size={12} className="text-emerald-400" />
                                  <span className="text-xs text-emerald-400">Ready</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} className="text-red-400" />
                                  <span className="text-xs text-red-400">Offline</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* DB Tables */}
            {status.db_tables && Object.keys(status.db_tables).length > 0 && (
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Database size={16} />
                    Database Tables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(status.db_tables).map(([table, count]) => (
                      <div
                        key={table}
                        className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
                      >
                        <p className="text-xs text-neutral-400 capitalize">
                          {table.replace(/_/g, " ")}
                        </p>
                        <p className="text-lg font-semibold text-white mt-1">
                          {typeof count === "number" ? count.toLocaleString() : count}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cache Stats */}
            {status.cache_stats && Object.keys(status.cache_stats).length > 0 && (
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <HardDrive size={16} />
                    Cache Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(status.cache_stats).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
                      >
                        <p className="text-xs text-neutral-400 capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-lg font-semibold text-white mt-1">
                          {typeof value === "number"
                            ? value >= 1024 * 1024
                              ? `${(value / 1024 / 1024).toFixed(1)} MB`
                              : value.toLocaleString()
                            : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KB Stats */}
            {status.kb_stats && Object.keys(status.kb_stats).length > 0 && (
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <BookOpen size={16} />
                    Knowledge Base Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(status.kb_stats).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
                      >
                        <p className="text-xs text-neutral-400 capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-lg font-semibold text-white mt-1">
                          {Array.isArray(value)
                            ? value.length
                            : typeof value === "number"
                            ? value.toLocaleString()
                            : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Uptime */}
            {status.uptime_seconds !== undefined && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Clock size={14} />
                Uptime: {Math.floor(status.uptime_seconds / 3600)}h{" "}
                {Math.floor((status.uptime_seconds % 3600) / 60)}m{" "}
                {status.uptime_seconds % 60}s
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <RefreshCw size={32} className="animate-spin mb-4" />
            <p>Connecting to API server...</p>
            <p className="text-sm mt-2">Make sure the server is running on port 8080</p>
          </div>
        )}
      </div>
    </div>
  );
}
