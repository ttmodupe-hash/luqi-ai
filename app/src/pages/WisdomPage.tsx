import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Sun,
  Compass,
  Quote,
  Globe,
  MapPin,
  BookOpen,
  RefreshCw,
  ChevronDown,
  List,
  Loader2,
} from "lucide-react";

interface WisdomResponse {
  success: boolean;
  proverb?: string;
  text?: string;
  translation?: string;
  meaning?: string;
  tradition?: string;
  origin?: string;
  country?: string;
  source?: string;
  advice?: string;
  framework?: string;
  situation?: string;
  context?: string;
  theme?: string;
  type?: string;
}

interface TraditionItem {
  name: string;
  count: number;
  region?: string;
}

const TRADITIONS: string[] = [
  "Akan",
  "Yoruba",
  "Zulu",
  "Swahili",
  "Igbo",
  "Amharic",
  "Arabic",
  "Chinese",
  "Japanese",
  "Indian",
  "Greek",
  "Roman",
  "Norse",
  "Celtic",
  "Persian",
  "Hebrew",
  "Native American",
  "Mayan",
  "Inca",
];

export default function WisdomPage() {
  const { get, loading, error } = useApi();

  const [dailyWisdom, setDailyWisdom] = useState<WisdomResponse | null>(null);
  const [selectedTradition, setSelectedTradition] = useState<string>("");
  const [traditionWisdom, setTraditionWisdom] = useState<WisdomResponse | null>(null);
  const [traditionsList, setTraditionsList] = useState<TraditionItem[]>([]);
  const [showTraditions, setShowTraditions] = useState(false);
  const stats = { total: 180, themes: 90, traditions: 19 };

  // Fetch daily wisdom on mount (no tradition filter)
  const fetchDailyWisdom = async () => {
    try {
      const data = await get("/api/v25/wisdom");
      if (data?.success) {
        setDailyWisdom(data);
      }
    } catch {
      // Graceful fallback — leave previous state
    }
  };

  // Fetch wisdom for a selected tradition
  const fetchTraditionWisdom = async (tradition: string) => {
    if (!tradition) return;
    try {
      const data = await get(
        "/api/v25/wisdom?tradition=" + encodeURIComponent(tradition)
      );
      if (data?.success) {
        setTraditionWisdom(data);
      }
    } catch {
      // Graceful fallback
    }
  };

  // Fetch list of traditions from backend
  const fetchTraditions = async () => {
    try {
      const data = await get("/api/v25/wisdom/traditions");
      if (data?.success && Array.isArray(data.traditions)) {
        setTraditionsList(data.traditions);
      }
    } catch {
      // Fallback to hardcoded list
      setTraditionsList(
        TRADITIONS.map((t) => ({ name: t, count: 0 }))
      );
    }
  };

  useEffect(() => {
    fetchDailyWisdom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTraditionChange = (tradition: string) => {
    setSelectedTradition(tradition);
    if (tradition) {
      fetchTraditionWisdom(tradition);
    } else {
      setTraditionWisdom(null);
    }
  };

  const WisdomDisplay = ({ data, title, icon }: { data: WisdomResponse | null; title: string; icon: React.ReactNode }) => {
    if (!data) {
      return (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-8 text-center text-neutral-500">
            {loading ? (
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            ) : (
              <>
                {icon}
                <p className="mt-2 text-sm">{title}</p>
              </>
            )}
          </CardContent>
        </Card>
      );
    }

    const proverb = data.proverb || data.text || data.advice || "No wisdom available";
    const tradition = data.tradition || selectedTradition || "Unknown Tradition";

    return (
      <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-400 border-amber-500/20"
            >
              <Sparkles size={10} className="mr-1" />
              {tradition}
            </Badge>
            {data.theme && (
              <span className="text-xs text-neutral-500 capitalize">{data.theme}</span>
            )}
          </div>

          {/* Proverb */}
          <div className="flex gap-3 mb-4">
            <Quote size={18} className="text-neutral-500 mt-1 flex-shrink-0" />
            <p className="text-white text-sm leading-relaxed italic">
              {proverb}
            </p>
          </div>

          {/* Translation */}
          {data.translation && (
            <div className="mb-3 pl-7">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Translation</p>
              <p className="text-neutral-300 text-sm">{data.translation}</p>
            </div>
          )}

          {/* Meaning */}
          {data.meaning && (
            <div className="mb-3 pl-7">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Meaning</p>
              <p className="text-neutral-400 text-sm leading-relaxed">{data.meaning}</p>
            </div>
          )}

          {/* Context */}
          {data.context && (
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed pl-7">{data.context}</p>
          )}

          {/* Origin */}
          {(data.origin || data.source || data.country) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500 pl-7">
              <MapPin size={12} />
              <span>
                {data.origin || data.source}
                {data.country && data.country !== "Unknown" && ` (${data.country})`}
              </span>
            </div>
          )}

          {/* Decision framework fields */}
          {data.framework && (
            <div className="mt-3 pl-7">
              <p className="text-xs text-neutral-500 font-medium mb-1">{data.framework}</p>
              {data.situation && (
                <p className="text-xs text-neutral-500">{data.situation}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full overflow-auto bg-neutral-950">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-amber-400" size={24} />
            <h1 className="text-2xl font-bold text-white">Wisdom</h1>
          </div>
          <p className="text-neutral-400 text-sm">
            180+ proverbs and wisdom quotes from {stats.traditions} traditions across the world
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            Error: {error}. Showing cached data.
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen size={20} className="text-cyan-500" />
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

        {/* Tradition Selector */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-cyan-500" />
                <span className="text-sm font-medium text-white">Tradition:</span>
              </div>
              <div className="relative">
                <select
                  value={selectedTradition}
                  onChange={(e) => handleTraditionChange(e.target.value)}
                  className="appearance-none bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer min-w-[180px]"
                >
                  <option value="">All Traditions</option>
                  {TRADITIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTradition("");
                  setTraditionWisdom(null);
                  fetchDailyWisdom();
                }}
                disabled={loading}
                className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <RefreshCw size={14} className={loading ? "animate-spin mr-1" : "mr-1"} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTraditions(!showTraditions);
                  if (!showTraditions && traditionsList.length === 0) {
                    fetchTraditions();
                  }
                }}
                className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <List size={14} className="mr-1" />
                {showTraditions ? "Hide" : "List"} Traditions
              </Button>
            </div>

            {/* Traditions list panel */}
            {showTraditions && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">
                  Available Traditions
                </p>
                <div className="flex flex-wrap gap-2">
                  {(traditionsList.length > 0
                    ? traditionsList
                    : TRADITIONS.map((t) => ({ name: t, count: 0 }))
                  ).map((t) => (
                    <button
                      key={t.name}
                      onClick={() => handleTraditionChange(t.name)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        selectedTradition === t.name
                          ? "bg-cyan-600/20 border-cyan-500/40 text-cyan-400"
                          : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                      }`}
                    >
                      {t.name}
                      {(t.count ?? 0) > 0 && (
                        <span className="ml-1 text-neutral-500">({t.count})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wisdom Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Wisdom */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Daily Wisdom</h2>
            </div>
            <WisdomDisplay
              data={dailyWisdom}
              title="Daily wisdom will appear here"
              icon={<Sun size={20} className="text-neutral-600 mx-auto" />}
            />
          </div>

          {/* Tradition-specific Wisdom */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Compass size={18} className="text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">
                {selectedTradition
                  ? `${selectedTradition} Wisdom`
                  : "Select a Tradition"}
              </h2>
            </div>
            <WisdomDisplay
              data={traditionWisdom}
              title={
                selectedTradition
                  ? `Click refresh to load ${selectedTradition} wisdom`
                  : "Choose a tradition from the dropdown above"
              }
              icon={<Compass size={20} className="text-neutral-600 mx-auto" />}
            />
          </div>
        </div>

        {/* Scrollable Wisdom Archive */}
        <ScrollArea className="h-auto max-h-[400px]">
          <div className="space-y-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wider">
              Wisdom Archive
            </p>
            <p className="text-sm text-neutral-500">
              Use the tradition selector above to explore proverbs from different cultures.
              Each tradition carries centuries of collective knowledge and insight.
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
