import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Brain, Search, Wallet, FileText, TrendingUp, Clock, Star,
  Sparkles, Zap, Sun, CloudRain, GraduationCap, HeartPulse,
  LogIn, UserPlus, LogOut, User, Building2, Tractor, HardHat,
  Monitor, Car, BookOpen, Globe, Phone
} from "lucide-react";

const QUICK_ACTIONS = [
  { id: "ai", label: "AI Chat", icon: Brain, path: "/ai-brain", color: "from-violet-500 to-purple-600" },
  { id: "search", label: "Search", icon: Search, path: "/search", color: "from-blue-500 to-cyan-500" },
  { id: "finance", label: "Finance", icon: Wallet, path: "/finance", color: "from-emerald-500 to-green-600" },
  { id: "tender", label: "Tenders", icon: FileText, path: "/tenders", color: "from-orange-500 to-amber-600" },
];

const POPULAR = [
  { name: "Load Shedding", icon: Zap, path: "/load-shedding" },
  { name: "Solar Calculator", icon: Sun, path: "/solar" },
  { name: "Weather", icon: CloudRain, path: "/weather" },
  { name: "University Guide", icon: GraduationCap, path: "/university" },
  { name: "Health", icon: HeartPulse, path: "/health" },
  { name: "Job Market", icon: Building2, path: "/jobs" },
  { name: "Farming", icon: Tractor, path: "/farming" },
  { name: "Construction", icon: HardHat, path: "/construction" },
  { name: "Cybersecurity", icon: Monitor, path: "/cybersecurity" },
  { name: "Vehicle", icon: Car, path: "/vehicle" },
  { name: "Education", icon: BookOpen, path: "/education" },
  { name: "Travel", icon: Globe, path: "/travel" },
];

const INDUSTRY_MAP: Record<string, { label: string; items: { name: string; icon: any; path: string }[] }> = {
  "IT & Technology": {
    label: "Tech Tools",
    items: [
      { name: "AI Brain", icon: Brain, path: "/ai-brain" },
      { name: "Cybersecurity", icon: Monitor, path: "/cybersecurity" },
      { name: "Digital Transform", icon: Monitor, path: "/digital-transform" },
      { name: "Local LLM", icon: Brain, path: "/local-llm" },
    ]
  },
  "Agriculture": {
    label: "Farming Tools",
    items: [
      { name: "Farming Guide", icon: Tractor, path: "/farming" },
      { name: "Agriculture", icon: Tractor, path: "/agriculture" },
      { name: "Weather", icon: CloudRain, path: "/weather" },
      { name: "Load Shedding", icon: Zap, path: "/load-shedding" },
    ]
  },
  "Construction": {
    label: "Construction",
    items: [
      { name: "Construction Calc", icon: HardHat, path: "/construction" },
      { name: "Tenders", icon: FileText, path: "/tenders" },
      { name: "Load Shedding", icon: Zap, path: "/load-shedding" },
      { name: "Water", icon: CloudRain, path: "/water" },
    ]
  },
  "Finance": {
    label: "Finance",
    items: [
      { name: "Loan Mastery", icon: TrendingUp, path: "/loan-mastery" },
      { name: "Payroll", icon: Wallet, path: "/payroll" },
      { name: "Invoice", icon: FileText, path: "/invoice" },
      { name: "Funding", icon: Wallet, path: "/funding" },
    ]
  },
  "Healthcare": {
    label: "Healthcare",
    items: [
      { name: "Health", icon: HeartPulse, path: "/health" },
      { name: "Healthcare Dir", icon: Phone, path: "/healthcare" },
      { name: "Mental Health", icon: HeartPulse, path: "/mental-health" },
      { name: "Nutrition", icon: HeartPulse, path: "/nutrition" },
    ]
  },
  "Education": {
    label: "Education",
    items: [
      { name: "University", icon: GraduationCap, path: "/university" },
      { name: "Skills", icon: BookOpen, path: "/skills" },
      { name: "Languages", icon: Globe, path: "/languages" },
      { name: "Training", icon: BookOpen, path: "/training" },
    ]
  },
  "Mining": {
    label: "Mining",
    items: [
      { name: "Mining", icon: HardHat, path: "/mining" },
      { name: "Investment", icon: TrendingUp, path: "/investment-mining" },
      { name: "Safety", icon: HeartPulse, path: "/mining" },
      { name: "Tenders", icon: FileText, path: "/tenders" },
    ]
  },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getRecentPages() {
  try {
    const r = localStorage.getItem("recentPages");
    return r ? JSON.parse(r).slice(0, 5) : [];
  } catch { return []; }
}

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
      setRecent(getRecentPages());
    } catch { /* ignore */ }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const industry = user?.industry || "";
  const recommended = INDUSTRY_MAP[industry] || {
    label: "Popular",
    items: POPULAR.slice(0, 4)
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {user ? `${getGreeting()}, ${user.full_name?.split(" ")[0] || "Friend"}!` : `${getGreeting()}!`}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {user ? "Your personalized African AI dashboard" : "Welcome to LUQI AI — Built for Africa"}
            </p>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                {(user.full_name || "U")[0]}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login"><Button variant="outline" size="sm" className="border-neutral-700 text-gray-300 hover:text-white">
                <LogIn className="w-4 h-4 mr-1" /> Log In
              </Button></Link>
              <Link to="/signup"><Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                <UserPlus className="w-4 h-4 mr-1" /> Sign Up
              </Button></Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.id} to={a.path} className="group">
              <div className={`bg-gradient-to-br ${a.color} rounded-xl p-4 hover:scale-[1.02] transition-transform cursor-pointer`}>
                <a.icon className="w-6 h-6 text-white/90 mb-2" />
                <p className="text-sm font-semibold text-white">{a.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recommended / Personalized */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            {user ? `Recommended for ${user.industry || "You"}` : "Popular Right Now"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recommended.items.map((item: any, i: number) => (
              <Link key={i} to={item.path} className="group">
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 hover:border-cyan-500/50 hover:bg-neutral-750 transition-all cursor-pointer">
                  <item.icon className="w-5 h-5 text-cyan-400 mb-2" />
                  <p className="text-sm font-medium text-white">{item.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recently Used */}
        {recent.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" /> Recently Used
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {recent.map((r: any, i: number) => (
                <Link key={i} to={r.path} className="flex-shrink-0">
                  <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 hover:border-cyan-500/50 transition-all">
                    <p className="text-sm text-gray-300">{r.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Capabilities Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">All Capabilities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {POPULAR.map((p, i) => (
              <Link key={i} to={p.path} className="group">
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-center hover:border-cyan-500/50 hover:bg-neutral-750 transition-all cursor-pointer">
                  <p.icon className="w-5 h-5 text-gray-400 mx-auto mb-1.5 group-hover:text-cyan-400 transition-colors" />
                  <p className="text-xs text-gray-300">{p.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>348 endpoints</span>
            <span>130 modules</span>
            <span>83 pages</span>
          </div>
          <p className="text-xs text-gray-600">LUQI AI v29.0 — Built for Africa</p>
        </div>
      </div>
    </div>
  );
}
