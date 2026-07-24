import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Puzzle, Activity, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PluginStatus {
  name: string;
  description: string;
  category: string;
  confidence_threshold: number;
  handler: string;
  registered_at: string;
}

interface PluginMetric {
  invocations: number;
  errors: number;
  avg_response_time_ms: number;
  last_invoked: string | null;
  last_error: string | null;
}

interface PluginHealth {
  status: string;
  registered: boolean;
  invocations: number;
  error_rate: number;
  avg_response_time_ms: number;
  message: string;
}

interface PluginsData {
  version: string;
  total_plugins: number;
  frozen: boolean;
  plugins: PluginStatus[];
  metrics: Record<string, PluginMetric>;
  health: Record<string, PluginHealth>;
  discovery_paths: string[];
  middleware_count: number;
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  degraded: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  unhealthy: "bg-red-500/10 text-red-400 border-red-500/20",
};

const HEALTH_ICONS: Record<string, any> = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  unhealthy: AlertTriangle,
};

const CATEGORY_COLORS: Record<string, string> = {
  research: "bg-cyan-500/10 text-cyan-400",
  financial: "bg-green-500/10 text-green-400",
  creative: "bg-purple-500/10 text-purple-400",
  utility: "bg-neutral-500/10 text-neutral-400",
  learning: "bg-blue-500/10 text-blue-400",
  social: "bg-pink-500/10 text-pink-400",
  default: "bg-orange-500/10 text-orange-400",
};

export default function PluginsPage() {
  const [data, setData] = useState<PluginsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlugins = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/plugins");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
    const interval = setInterval(fetchPlugins, 15000);
    return () => clearInterval(interval);
  }, []);

  const healthy = data ? Object.values(data.health).filter((h) => h.status === "healthy").length : 0;
  const degraded = data ? Object.values(data.health).filter((h) => h.status === "degraded").length : 0;
  const unhealthy = data ? Object.values(data.health).filter((h) => h.status === "unhealthy").length : 0;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Puzzle size={24} className="text-cyan-400" />
              Plugin Registry
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              {data ? `${data.total_plugins} plugins registered` : "Loading..."}
            </p>
          </div>
          <button
            onClick={fetchPlugins}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Health Summary */}
        {data && (
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span className="text-2xl font-bold">{healthy}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Healthy</p>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle size={16} />
                  <span className="text-2xl font-bold">{degraded}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Degraded</p>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <Activity size={16} />
                  <span className="text-2xl font-bold">{unhealthy}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Unhealthy</p>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Zap size={16} />
                  <span className="text-2xl font-bold">
                    {Object.values(data.metrics).reduce((s, m) => s + m.invocations, 0)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Total Invocations</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plugin List */}
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-3">
            {loading && !data && (
              <div className="text-center py-12 text-neutral-500">
                <RefreshCw size={32} className="animate-spin mx-auto mb-3" />
                <p>Loading plugin registry...</p>
              </div>
            )}

            {data?.plugins.map((plugin) => {
              const health = data.health[plugin.name];
              const metrics = data.metrics[plugin.name];
              const HealthIcon = health ? HEALTH_ICONS[health.status] || Activity : Activity;

              return (
                <Card key={plugin.name} className="bg-neutral-900 border-neutral-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">{plugin.name}</h3>
                          <Badge
                            variant="outline"
                            className={CATEGORY_COLORS[plugin.category] || CATEGORY_COLORS.default}
                          >
                            {plugin.category}
                          </Badge>
                          {health && (
                            <Badge
                              variant="outline"
                              className={HEALTH_COLORS[health.status] || HEALTH_COLORS.healthy}
                            >
                              <HealthIcon size={10} className="mr-1" />
                              {health.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mb-2">{plugin.description}</p>

                        {/* Metrics */}
                        {metrics && (
                          <div className="flex items-center gap-4 text-xs text-neutral-500">
                            <span className="flex items-center gap-1">
                              <Zap size={10} />
                              {metrics.invocations} calls
                            </span>
                            {metrics.errors > 0 && (
                              <span className="text-red-400">{metrics.errors} errors</span>
                            )}
                            <span>
                              avg {metrics.avg_response_time_ms.toFixed(0)}ms
                            </span>
                            {metrics.last_invoked && (
                              <span>
                                last: {new Date(metrics.last_invoked).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Confidence bar */}
                      <div className="ml-4 w-24">
                        <div className="text-xs text-neutral-500 mb-1">
                          threshold: {(plugin.confidence_threshold * 100).toFixed(0)}%
                        </div>
                        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${plugin.confidence_threshold * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {data && data.plugins.length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                <Puzzle size={32} className="mx-auto mb-3 opacity-50" />
                <p>No plugins registered.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
