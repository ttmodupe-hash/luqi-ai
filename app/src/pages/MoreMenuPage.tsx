import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutGrid,
  DollarSign,
  Zap,
  BookOpen,
  Home,
  MessageSquare,
  Globe,
  GraduationCap,
  Wrench,
  Briefcase,
  Calculator,
  Dumbbell,
  Headphones,
  Bot,
  Shield,
  Sparkles,
  Puzzle,
  Receipt,
  Package,
  FolderKanban,
  Kanban,
  Users,
  Landmark,
  Umbrella,
  PiggyBank,
  Building2,
  Banknote,
  SunDim,
  CloudSun,
  Plane,
  Car,
  Radio,
  ShoppingCart,
  Sprout,
  Stethoscope,
  Hospital,
  Apple,
  Bus,
  Droplets,
  Phone,
  Tractor,
  Wifi,
  LucideHome,
  Beef,
  Leaf,
  Wine,
  HardHat,
  Music,
  Baby,
  Trophy,
  HeartPulse,
  Scale,
  Monitor,
  Wand2,
  Route,
  Languages,
  TrendingUp,
  FileText,
  Cpu,
  Newspaper,
  University,
  Search,
  ChevronLeft,
  X,
} from "lucide-react";

// Mirror of navGroups from App.tsx for the menu grid
const menuGroups = [
  {
    id: "core",
    label: "Core",
    items: [
      { id: "home", label: "Home", icon: Home, path: "/" },
      { id: "ai-brain", label: "AI Brain", icon: BrainIcon, path: "/ai-brain" },
      { id: "search", label: "Search", icon: Search, path: "/search" },
      { id: "chat", label: "Chat", icon: MessageSquare, path: "/chat" },
      { id: "assistant", label: "Assistant", icon: Bot, path: "/assistant" },
      { id: "workspace", label: "Workspace", icon: Briefcase, path: "/workspace" },
      { id: "local-llm", label: "Local AI", icon: Cpu, path: "/local-llm" },
    ],
  },
  {
    id: "finance",
    label: "Finance & Business",
    items: [
      { id: "finance", label: "Finance", icon: DollarSign, path: "/finance" },
      { id: "accountant", label: "Accountant", icon: Calculator, path: "/accountant" },
      { id: "invoice", label: "Invoices", icon: Receipt, path: "/invoice" },
      { id: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
      { id: "crm", label: "CRM", icon: FolderKanban, path: "/crm" },
      { id: "project", label: "Projects", icon: Kanban, path: "/project" },
      { id: "payroll", label: "Payroll", icon: Users, path: "/payroll" },
      { id: "loan", label: "Loans", icon: Landmark, path: "/loan" },
      { id: "insurance", label: "Insurance", icon: Umbrella, path: "/insurance" },
      { id: "financial-literacy", label: "Financial Literacy", icon: PiggyBank, path: "/financial-literacy" },
      { id: "business-reg", label: "Business Reg", icon: Building2, path: "/business-reg" },
      { id: "grants", label: "Grants & Funding", icon: Banknote, path: "/grants" },
    ],
  },
  {
    id: "daily",
    label: "Daily Life",
    items: [
      { id: "load-shedding", label: "Load Shedding", icon: Zap, path: "/load-shedding" },
      { id: "solar", label: "Solar", icon: SunDim, path: "/solar" },
      { id: "weather", label: "Weather", icon: CloudSun, path: "/weather" },
      { id: "travel", label: "Travel", icon: Plane, path: "/travel" },
      { id: "vehicle", label: "Vehicle", icon: Car, path: "/vehicle" },
      { id: "government", label: "Government", icon: Building2, path: "/government" },
      { id: "ecommerce", label: "E-Commerce", icon: ShoppingCart, path: "/ecommerce" },
      { id: "communication", label: "Communication", icon: Radio, path: "/communication" },
      { id: "agriculture", label: "Agriculture", icon: Sprout, path: "/agriculture" },
      { id: "health", label: "Health", icon: Stethoscope, path: "/health" },
      { id: "healthcare", label: "Healthcare Dir", icon: Hospital, path: "/healthcare" },
      { id: "nutrition", label: "Nutrition", icon: Apple, path: "/nutrition" },
      { id: "transport", label: "Public Transport", icon: Bus, path: "/transport" },
      { id: "water", label: "Water", icon: Droplets, path: "/water" },
      { id: "emergency", label: "Emergency", icon: Phone, path: "/emergency" },
      { id: "farming", label: "Farming", icon: Tractor, path: "/farming" },
      { id: "mobile-data", label: "Mobile Data", icon: Wifi, path: "/mobile-data" },
      { id: "property", label: "Property", icon: LucideHome, path: "/property" },
      { id: "housing", label: "Housing", icon: LucideHome, path: "/housing" },
      { id: "livestock", label: "Livestock", icon: Beef, path: "/livestock" },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge & Skills",
    items: [
      { id: "languages", label: "Languages", icon: Globe, path: "/languages" },
      { id: "education", label: "Education", icon: GraduationCap, path: "/education" },
      { id: "skills", label: "Skills", icon: Wrench, path: "/skills" },
      { id: "training", label: "Training", icon: Dumbbell, path: "/training" },
      { id: "wisdom", label: "Wisdom", icon: Sparkles, path: "/wisdom" },
      { id: "cybersecurity", label: "Cybersecurity", icon: Shield, path: "/cybersecurity" },
      { id: "mental-health", label: "Mental Health", icon: HeartPulse, path: "/mental-health" },
      { id: "parenting", label: "Parenting", icon: Baby, path: "/parenting" },
      { id: "sports", label: "Sports", icon: Trophy, path: "/sports" },
      { id: "music", label: "Music", icon: Music, path: "/music" },
      { id: "construction", label: "Construction", icon: HardHat, path: "/construction" },
      { id: "legal", label: "Legal", icon: Scale, path: "/legal" },
      { id: "university", label: "Universities", icon: University, path: "/university" },
      { id: "jobs", label: "Job Market", icon: Briefcase, path: "/jobs" },
      { id: "news", label: "News", icon: Newspaper, path: "/news" },
      { id: "climate", label: "Climate", icon: Leaf, path: "/climate" },
      { id: "food-wine", label: "Food & Wine", icon: Wine, path: "/food-wine" },
      { id: "mining", label: "Mining", icon: PickaxeIcon, path: "/mining" },
      { id: "community", label: "Community", icon: Users, path: "/community" },
      { id: "entertainment", label: "Entertainment", icon: FilmIcon, path: "/entertainment" },
      { id: "vocational", label: "Vocational", icon: Route, path: "/vocational" },
      { id: "african-languages", label: "African Languages", icon: Languages, path: "/african-languages" },
      { id: "digital-transform", label: "Digital Transform", icon: Monitor, path: "/digital-transform" },
      { id: "wizard", label: "Wizard", icon: Wand2, path: "/wizard" },
      { id: "self-improve", label: "Self Improve", icon: TrendingUp, path: "/self-improve" },
      { id: "calc-engine", label: "Calc Engine", icon: Calculator, path: "/calc-engine" },
      { id: "bilingual", label: "Bilingual", icon: MessageSquare, path: "/bilingual" },
      { id: "opportunities", label: "Opportunities", icon: Search, path: "/opportunities" },
      { id: "tenders", label: "Tenders", icon: FileText, path: "/tenders" },
      { id: "funding", label: "Funding", icon: Banknote, path: "/funding" },
      { id: "loan-mastery", label: "Loan Mastery", icon: TrendingUp, path: "/loan-mastery" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "support", label: "Support", icon: Headphones, path: "/support" },
      { id: "plugins", label: "Plugins", icon: Puzzle, path: "/plugins" },
      { id: "kb", label: "Knowledge Base", icon: BookOpen, path: "/kb" },
      { id: "status", label: "Status", icon: Shield, path: "/status" },
    ],
  },
];

// Simple icon components for ones not directly in lucide
function BrainIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}
function PickaxeIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.531 12.469 6.619 20.38a1.44 1.44 0 0 1-2.034 0L3.62 19.414a1.44 1.44 0 0 1 0-2.034l7.912-7.912" />
      <path d="M9.31 14.34l1.247-1.247" />
      <path d="m16.8 4.5 2.217 2.217" />
      <path d="m20.26 1.04 1.066 1.066a2.4 2.4 0 0 1 0 3.394l-5.514 5.514a2.4 2.4 0 0 1-3.394 0l-1.066-1.066a2.4 2.4 0 0 1 0-3.394l5.514-5.514a2.4 2.4 0 0 1 3.394 0Z" />
    </svg>
  );
}
function FilmIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </svg>
  );
}

export default function MoreMenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Get current page ID
  const allItems = useMemo(() => menuGroups.flatMap((g) => g.items), []);
  const currentPageId =
    allItems.find((item) => item.path === location.pathname)?.id || "";

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return menuGroups;
    const query = searchQuery.toLowerCase();
    return menuGroups
      .map((group) => {
        const groupMatches = group.label.toLowerCase().includes(query);
        const matchingItems = group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            group.label.toLowerCase().includes(query)
        );
        if (groupMatches) return { ...group, items: group.items };
        if (matchingItems.length > 0) return { ...group, items: matchingItems };
        return null;
      })
      .filter(Boolean) as typeof menuGroups;
  }, [searchQuery]);

  return (
    <div className="h-full overflow-y-auto bg-background select-none">
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors active:scale-[0.96]"
            aria-label="Go back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex-1">
            All Features
          </h1>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative max-w-md mx-auto">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              size={18}
            />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border text-foreground rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors min-h-[44px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="p-4 space-y-6 pb-24">
        {filteredGroups.map((group) => (
          <section key={group.id}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              {group.label}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all min-h-[80px] active:scale-[0.95] ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                        : "bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon
                      size={24}
                      className={isActive ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"}
                    />
                    <span className="text-[11px] font-medium leading-tight text-center line-clamp-2">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search size={48} className="mb-4 opacity-30" />
            <p className="text-sm">No features found</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs text-cyan-600 dark:text-cyan-400 underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
