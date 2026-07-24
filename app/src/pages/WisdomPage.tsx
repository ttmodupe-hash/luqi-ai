import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Search,
  Sun,
  Compass,
  Quote,
  Globe,
  MapPin,
  BookOpen,
  RefreshCw,
} from "lucide-react";

interface WisdomItem {
  type: string;
  text: string;
  origin?: string;
  country?: string;
  source?: string;
  tradition?: string;
  theme?: string;
  context?: string;
  framework?: string;
  advice?: string;
  situation?: string;
}

const THEME_COLORS: Record<string, string> = {
  proverb: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  universal: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  decision: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function WisdomPage() {
  const [dailyWisdom, setDailyWisdom] = useState<WisdomItem | null>(null);
  const [searchTheme, setSearchTheme] = useState("");
  const [searchResults, setSearchResults] = useState<WisdomItem[]>([]);
  const [decisionWisdom, setDecisionWisdom] = useState<WisdomItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, themes: 0, traditions: 0 });

  const API_BASE = "http://localhost:8080";

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/wisdom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setDailyWisdom(data.wisdom || data);
      }
    } catch (e) {
      console.error("Failed to fetch daily wisdom:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecision = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/wisdom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setDecisionWisdom(data.wisdom || data);
      }
    } catch (e) {
      console.error("Failed to fetch decision wisdom:", e);
    } finally {
      setLoading(false);
    }
  };

  const searchByTheme = async () => {
    if (!searchTheme.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/wisdom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: searchTheme }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.wisdoms || []);
      }
    } catch (e) {
      console.error("Failed to search wisdom:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (res.ok) {
        await res.json();
        setStats({
          total: 180,
          themes: 90,
          traditions: 17,
        });
      }
    } catch {
      setStats({ total: 180, themes: 90, traditions: 17 });
    }
  };

  useEffect(() => {
    fetchDaily();
    fetchDecision();
    fetchStats();
  }, []);

  const WisdomCard = ({ item, type }: { item: WisdomItem; type: string }) => {
    const badgeClass = THEME_COLORS[type] || THEME_COLORS.universal;
    const isProverb = type === "proverb";
    const isDecision = type === "decision";

    return (
      <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeClass}`}
            >
              {isProverb ? "African Proverb" : isDecision ? "Decision Framework" : "Universal Wisdom"}
            </span>
            {item.theme && (
              <span className="text-xs text-neutral-500 capitalize">{item.theme}</span>
            )}
          </div>

          <div className="flex gap-3">
            <Quote size={18} className="text-neutral-500 mt-1 flex-shrink-0" />
            <p className="text-neutral-100 text-sm leading-relaxed italic">
              {item.text || item.advice}
            </p>
          </div>

          {(item.origin || item.source) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
              <MapPin size={12} />
              <span>
                {item.origin || item.source}
                {item.country && item.country !== "Unknown" && ` (${item.country})`}
                {item.tradition && ` — ${item.tradition}`}
              </span>
            </div>
          )}

          {item.context && (
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">{item.context}</p>
          )}

          {isDecision && item.framework && (
            <div className="mt-3">
              <p className="text-xs text-neutral-400 font-medium mb-1">
                {item.framework}
              </p>
              {item.situation && (
                <p className="text-xs text-neutral-500">{item.situation}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-amber-400" size={24} />
          <h1 className="text-2xl font-bold text-white">Wisdom</h1>
        </div>
        <p className="text-neutral-400 text-sm">
          180+ proverbs and wisdom quotes from 17 traditions across the world
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen size={20} className="text-cyan-400" />
            <div>
              <p className="text-lg font-bold text-white">{stats.total}</p>
              <p className="text-xs text-neutral-500">Wisdoms</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Globe size={20} className="text-emerald-400" />
            <div>
              <p className="text-lg font-bold text-white">{stats.traditions}</p>
              <p className="text-xs text-neutral-500">Traditions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles size={20} className="text-amber-400" />
            <div>
              <p className="text-lg font-bold text-white">{stats.themes}</p>
              <p className="text-xs text-neutral-500">Themes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Wisdom */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sun size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Daily Wisdom</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDaily}
              disabled={loading}
              className="text-neutral-400 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
          {dailyWisdom ? (
            <WisdomCard item={dailyWisdom} type={dailyWisdom.type || "proverb"} />
          ) : (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-8 text-center text-neutral-500">
                {loading ? "Loading..." : "Click refresh to load daily wisdom"}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Decision Framework */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass size={18} className="text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Decision Framework</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDecision}
              disabled={loading}
              className="text-neutral-400 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
          {decisionWisdom ? (
            <WisdomCard item={decisionWisdom} type="decision" />
          ) : (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-8 text-center text-neutral-500">
                {loading ? "Loading..." : "Click refresh to load decision framework"}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Search by Theme */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Search size={18} className="text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Search by Theme</h2>
        </div>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter theme: patience, leadership, courage, humility..."
                value={searchTheme}
                onChange={(e) => setSearchTheme(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchByTheme()}
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
              <Button
                onClick={searchByTheme}
                disabled={loading || !searchTheme.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Search size={16} />
              </Button>
            </div>

            {/* Quick theme buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {["patience", "leadership", "community", "courage", "humility", "wisdom", "love", "perseverance"].map(
                (t) => (
                  <Button
                    key={t}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTheme(t);
                      setTimeout(searchByTheme, 50);
                    }}
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white capitalize text-xs"
                  >
                    {t}
                  </Button>
                )
              )}
            </div>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-auto">
                <p className="text-xs text-neutral-500 mb-2">
                  {searchResults.length} results for "{searchTheme}"
                </p>
                {searchResults.map((item, i) => (
                  <WisdomCard key={i} item={item} type={item.type || "universal"} />
                ))}
              </div>
            )}
            {searchResults.length === 0 && searchTheme && !loading && (
              <p className="text-sm text-neutral-500 text-center py-4">
                No results. Try a different theme.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
