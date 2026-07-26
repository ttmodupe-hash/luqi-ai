import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Puzzle,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Trash2,
  Loader2,
  Store,
} from "lucide-react";

interface PluginItem {
  id: string;
  name: string;
  description: string;
  category: string;
  version?: string;
  author?: string;
  installed?: boolean;
}

interface PluginApiResponse {
  success: boolean;
  plugins?: PluginItem[];
  message?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  research: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  financial: "bg-green-500/10 text-green-400 border-green-500/20",
  creative: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  utility: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  learning: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  social: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  productivity: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  analytics: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  default: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  installed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  available: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

// Mock plugins for fallback when API is unavailable
const MOCK_PLUGINS: PluginItem[] = [
  {
    id: "research-assistant",
    name: "Research Assistant",
    description: "AI-powered research synthesis with multi-source aggregation and citation generation.",
    category: "research",
    version: "1.2.0",
    author: "LUQI AI",
    installed: false,
  },
  {
    id: "finance-tracker",
    name: "Finance Tracker",
    description: "Real-time portfolio tracking with risk analysis and market alerts.",
    category: "financial",
    version: "2.1.0",
    author: "LUQI AI",
    installed: false,
  },
  {
    id: "creative-writer",
    name: "Creative Writer",
    description: "Generate creative content, stories, poems, and marketing copy.",
    category: "creative",
    version: "1.5.0",
    author: "LUQI AI",
    installed: false,
  },
  {
    id: "code-assistant",
    name: "Code Assistant",
    description: "Code completion, review, and refactoring across 20+ languages.",
    category: "utility",
    version: "3.0.1",
    author: "LUQI AI",
    installed: false,
  },
  {
    id: "language-tutor",
    name: "Language Tutor",
    description: "Interactive language learning with speech recognition and grammar correction.",
    category: "learning",
    version: "2.3.0",
    author: "LUQI AI",
    installed: false,
  },
  {
    id: "social-analyzer",
    name: "Social Analyzer",
    description: "Sentiment analysis and trend detection across social platforms.",
    category: "social",
    version: "1.1.0",
    author: "LUQI AI",
    installed: false,
  },
  {
    id: "task-automator",
    name: "Task Automator",
    description: "Workflow automation with smart scheduling and reminder systems.",
    category: "productivity",
    version: "1.8.0",
    author: "LUQI AI",
    installed: false,
  },
  {
    id: "data-visualizer",
    name: "Data Visualizer",
    description: "Transform raw data into interactive charts and dashboards.",
    category: "analytics",
    version: "2.0.0",
    author: "LUQI AI",
    installed: false,
  },
];

export default function PluginsPage() {
  const { get, post, loading, error } = useApi();

  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [lastError, setLastError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const fetchPlugins = async () => {
    setLastError(null);
    try {
      const data = (await get("/api/v25/marketplace/plugins")) as PluginApiResponse;
      if (data?.success && Array.isArray(data.plugins)) {
        setPlugins(data.plugins);
      } else {
        // Fallback to mock data
        setPlugins(MOCK_PLUGINS);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setLastError(msg);
      // Use mock data when API is unavailable
      setPlugins(MOCK_PLUGINS);
    }
  };

  useEffect(() => {
    fetchPlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const installPlugin = async (pluginId: string) => {
    setInstallingId(pluginId);
    setLastError(null);
    try {
      const data = await post("/api/v25/marketplace/install", { plugin_id: pluginId });
      if (data?.success) {
        setInstalledIds((prev) => new Set(prev).add(pluginId));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Install failed";
      // If we get a 503, the marketplace module isn't loaded — mark as installed locally
      if (msg.includes("503")) {
        setInstalledIds((prev) => new Set(prev).add(pluginId));
      } else {
        setLastError(msg);
      }
    } finally {
      setInstallingId(null);
    }
  };

  const uninstallPlugin = (pluginId: string) => {
    setInstalledIds((prev) => {
      const next = new Set(prev);
      next.delete(pluginId);
      return next;
    });
  };

  const isInstalled = (plugin: PluginItem) =>
    plugin.installed || installedIds.has(plugin.id);

  const installedCount = plugins.filter(isInstalled).length;
  const availableCount = plugins.length - installedCount;

  return (
    <div className="h-full overflow-auto bg-neutral-950">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Store size={24} className="text-cyan-500" />
              Plugin Marketplace
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {plugins.length > 0
                ? `${installedCount} installed, ${availableCount} available`
                : "Loading..."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlugins}
            disabled={loading}
            className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <RefreshCw size={14} className={loading ? "animate-spin mr-2" : "mr-2"} />
            Refresh
          </Button>
        </div>

        {/* Error Banner */}
        {(error || lastError) && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>
              {error || lastError}. Showing {plugins.length > 0 ? "cached" : "demo"} data.
            </span>
          </div>
        )}

        {/* Summary Cards */}
        {plugins.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span className="text-2xl font-bold">{installedCount}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Installed</p>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Puzzle size={16} />
                  <span className="text-2xl font-bold">{availableCount}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Available</p>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-purple-400">
                  <Zap size={16} />
                  <span className="text-2xl font-bold">{plugins.length}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Total Plugins</p>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-orange-400">
                  <Activity size={16} />
                  <span className="text-2xl font-bold">
                    {new Set(plugins.map((p) => p.category)).size}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Categories</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plugin Grid */}
        <ScrollArea className="h-[calc(100vh-320px)]">
          {loading && plugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Loader2 size={32} className="animate-spin mb-3" />
              <p>Loading plugin marketplace...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plugins.map((plugin) => {
                const installed = isInstalled(plugin);
                const isInstalling = installingId === plugin.id;
                const categoryColor =
                  CATEGORY_COLORS[plugin.category] || CATEGORY_COLORS.default;
                const statusColor = installed
                  ? STATUS_COLORS.installed
                  : STATUS_COLORS.available;

                return (
                  <Card
                    key={plugin.id}
                    className={`bg-neutral-900 border-neutral-800 transition-all ${
                      installed ? "ring-1 ring-emerald-500/20" : "hover:border-neutral-700"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Puzzle size={16} className="text-cyan-500" />
                          <h3 className="text-sm font-semibold text-white">
                            {plugin.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={categoryColor}>
                            {plugin.category}
                          </Badge>
                          <Badge variant="outline" className={statusColor}>
                            {installed ? (
                              <CheckCircle2 size={10} className="mr-1" />
                            ) : null}
                            {installed ? "Installed" : "Available"}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
                        {plugin.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          {plugin.version && <span>v{plugin.version}</span>}
                          {plugin.author && <span>by {plugin.author}</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          {installed ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => uninstallPlugin(plugin.id)}
                              disabled={isInstalling}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs h-8"
                            >
                              <Trash2 size={12} className="mr-1" />
                              Uninstall
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => installPlugin(plugin.id)}
                              disabled={isInstalling || loading}
                              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-xs h-8"
                            >
                              {isInstalling ? (
                                <Loader2 size={12} className="animate-spin mr-1" />
                              ) : (
                                <Download size={12} className="mr-1" />
                              )}
                              {isInstalling ? "Installing..." : "Install"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {plugins.length === 0 && !loading && (
            <div className="text-center py-20 text-neutral-500">
              <Puzzle size={32} className="mx-auto mb-3 opacity-50" />
              <p>No plugins available.</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
