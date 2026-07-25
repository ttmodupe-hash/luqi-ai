import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ArrowLeft,
  Wrench,
  Shield,
  Zap,
  Hammer,
  Paintbrush,
  Car,
  ChefHat,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Clock,
  CheckCircle2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface Trade {
  id: string;
  name: string;
  category: string;
  description: string;
  tools_needed?: string[];
  safety_tips?: string[];
  steps?: string[];
  estimated_duration?: string;
  difficulty?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  construction: Hammer,
  electrical: Zap,
  plumbing: Wrench,
  automotive: Car,
  culinary: ChefHat,
  craft: Paintbrush,
  safety: Shield,
  general: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
  construction: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  electrical: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  plumbing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  automotive: "bg-red-500/10 text-red-400 border-red-500/20",
  culinary: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  craft: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  safety: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  general: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

export default function SkillsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filtered, setFiltered] = useState<Trade[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/skills/trades`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const t = data.trades || data;
      setTrades(Array.isArray(t) ? t : []);
      setFiltered(Array.isArray(t) ? t : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      // Fallback demo data
      const demo: Trade[] = [
        { id: "plumbing", name: "Plumbing", category: "plumbing", description: "Install and repair pipes, fixtures, and water systems in homes and buildings.", difficulty: "Intermediate" },
        { id: "electrical", name: "Electrical Work", category: "electrical", description: "Install, maintain, and repair electrical wiring, equipment, and fixtures.", difficulty: "Advanced" },
        { id: "carpentry", name: "Carpentry", category: "construction", description: "Build, install, and repair structures made of wood and other materials.", difficulty: "Intermediate" },
        { id: "masonry", name: "Masonry", category: "construction", description: "Work with bricks, concrete blocks, and stone to build walls and structures.", difficulty: "Intermediate" },
        { id: "auto_mechanic", name: "Auto Mechanic", category: "automotive", description: "Diagnose, repair, and maintain cars, trucks, and other vehicles.", difficulty: "Advanced" },
        { id: "welding", name: "Welding", category: "construction", description: "Join metal parts using heat to create strong, permanent bonds.", difficulty: "Advanced" },
        { id: "cooking", name: "Professional Cooking", category: "culinary", description: "Prepare meals in restaurants, hotels, and catering services.", difficulty: "Beginner" },
        { id: "baking", name: "Baking", category: "culinary", description: "Make bread, pastries, cakes, and other baked goods.", difficulty: "Intermediate" },
        { id: "painting", name: "Painting & Decorating", category: "craft", description: "Apply paint, wallpaper, and finishes to interior and exterior surfaces.", difficulty: "Beginner" },
        { id: "tailoring", name: "Tailoring", category: "craft", description: "Design, alter, and repair clothing for custom fit and style.", difficulty: "Intermediate" },
        { id: "hvac", name: "HVAC Technician", category: "general", description: "Install and repair heating, ventilation, and air conditioning systems.", difficulty: "Advanced" },
        { id: "safety", name: "Workplace Safety", category: "safety", description: "Identify hazards, enforce safety protocols, and prevent workplace accidents.", difficulty: "Intermediate" },
      ];
      setTrades(demo);
      setFiltered(demo);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradeDetail = async (tradeId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/skills/trades/${encodeURIComponent(tradeId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSelectedTrade({ ...data, id: tradeId });
    } catch (e: unknown) {
      // Fallback detail
      const details: Record<string, Partial<Trade>> = {
        plumbing: {
          tools_needed: ["Pipe wrench", "Plunger", "Pipe cutter", "Teflon tape", "Adjustable spanner", "Drain snake"],
          safety_tips: ["Turn off water supply before starting", "Wear safety goggles", "Use gloves when handling pipes", "Ensure proper ventilation"],
          steps: ["Assess the problem area", "Gather necessary tools", "Shut off water supply", "Remove damaged components", "Install new parts or repair", "Test for leaks", "Clean up work area"],
          estimated_duration: "1-4 hours per job",
        },
        electrical: {
          tools_needed: ["Multimeter", "Wire strippers", "Screwdrivers", "Pliers", "Voltage tester", "Electrical tape"],
          safety_tips: ["Always turn off power at breaker", "Use insulated tools", "Wear rubber-soled shoes", "Never work on live circuits", "Have a fire extinguisher nearby"],
          steps: ["Turn off power at circuit breaker", "Test wires with voltage tester", "Plan the wiring layout", "Strip and connect wires properly", "Secure connections with wire nuts", "Test circuit before finishing"],
          estimated_duration: "2-6 hours per job",
        },
        carpentry: {
          tools_needed: ["Hammer", "Saw", "Tape measure", "Level", "Chisel set", "Power drill", "Square"],
          safety_tips: ["Wear safety glasses", "Keep blades sharp (dull blades are dangerous)", "Secure workpiece with clamps", "Use hearing protection for power tools"],
          steps: ["Measure and mark materials", "Cut pieces to size", "Sand rough edges", "Assemble using joints or fasteners", "Check for level and square", "Apply finish if needed"],
          estimated_duration: "Varies by project (hours to days)",
        },
      };
      const trade = trades.find((t) => t.id === tradeId);
      if (trade) {
        const detail = details[tradeId] || {
          tools_needed: ["Basic hand tools", "Safety equipment", "Measuring tools"],
          safety_tips: ["Always wear appropriate PPE", "Follow manufacturer instructions", "Keep workspace clean and organized", "Know when to call a professional"],
          steps: ["Learn the fundamentals through training", "Practice under supervision", "Start with small projects", "Gradually take on complex work", "Continue learning and improving"],
          estimated_duration: "Varies by skill level",
        };
        setSelectedTrade({ ...trade, ...detail });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(trades.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)));
  }, [search, trades]);

  if (selectedTrade) {
    const Icon = CATEGORY_ICONS[selectedTrade.category] || Wrench;
    const badgeClass = CATEGORY_COLORS[selectedTrade.category] || CATEGORY_COLORS.general;
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTrade(null)} className="text-neutral-400 hover:text-white">
              <ArrowLeft size={16} />
            </Button>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${badgeClass.split(" ")[0]}`}>
                <Icon size={16} className={badgeClass.split(" ")[1]} />
              </div>
              <h1 className="text-xl font-bold text-white">{selectedTrade.name}</h1>
            </div>
          </div>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4">
              <p className="text-sm text-neutral-300 mb-3">{selectedTrade.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={badgeClass}>
                  {selectedTrade.category}
                </Badge>
                {selectedTrade.difficulty && (
                  <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700">
                    {selectedTrade.difficulty}
                  </Badge>
                )}
                {selectedTrade.estimated_duration && (
                  <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 flex items-center gap-1">
                    <Clock size={10} /> {selectedTrade.estimated_duration}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedTrade.tools_needed && selectedTrade.tools_needed.length > 0 && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                  <Wrench size={16} /> Tools Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedTrade.tools_needed.map((tool, i) => (
                    <div key={i} className="flex items-center gap-2 bg-neutral-800 rounded-lg p-2 border border-neutral-700">
                      <CheckCircle2 size={12} className="text-cyan-400 flex-shrink-0" />
                      <span className="text-xs text-neutral-300">{tool}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTrade.steps && selectedTrade.steps.length > 0 && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <BookOpen size={16} /> Step-by-Step Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedTrade.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs text-emerald-400 font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-neutral-300">{step}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {selectedTrade.safety_tips && selectedTrade.safety_tips.length > 0 && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <Shield size={16} /> Safety Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedTrade.safety_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-500/5 rounded-lg p-2 border border-red-500/10">
                    <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-neutral-300">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-neutral-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Wrench size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Vocational Skills</h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              {trades.length} trades
            </Badge>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trades by name, category, or skill..."
              className="pl-8 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          {loading && trades.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <Sparkles size={32} className="animate-spin mx-auto mb-3" />
              <p>Loading trades...</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
              API error: {error}. Showing demo data.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((trade) => {
              const Icon = CATEGORY_ICONS[trade.category] || Wrench;
              const badgeClass = CATEGORY_COLORS[trade.category] || CATEGORY_COLORS.general;
              return (
                <Card
                  key={trade.id}
                  className="bg-neutral-900 border-neutral-800 hover:border-amber-500/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-amber-500/5"
                  onClick={() => fetchTradeDetail(trade.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${badgeClass.split(" ")[0]}`}>
                        <Icon size={18} className={badgeClass.split(" ")[1]} />
                      </div>
                      <Badge variant="outline" className={`${badgeClass} text-xs`}>
                        {trade.category}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{trade.name}</h3>
                    <p className="text-xs text-neutral-400 mb-3 line-clamp-2">{trade.description}</p>
                    {trade.difficulty && (
                      <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 text-xs">
                        {trade.difficulty}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500">
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p>No trades found matching "{search}"</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
