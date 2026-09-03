import { useState, useEffect, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";

/* OPERATIONAL PAGE IMPORTS (46 Pages) */
import Home from "./pages/Home";
import StatusPage from "./pages/StatusPage";
import KBPage from "./pages/KBPage";
import PluginsPage from "./pages/PluginsPage";
import WisdomPage from "./pages/WisdomPage";
import LanguagesPage from "./pages/LanguagesPage";
import FinancePage from "./pages/FinancePage";
import ChatPage from "./pages/ChatPage";
import EducationPage from "./pages/EducationPage";
import SkillsPage from "./pages/SkillsPage";
import WorkspacePage from "./pages/WorkspacePage";
import AccountantPage from "@/pages/AccountantPage";
import TrainingPage from "@/pages/TrainingPage";
import SupportPage from "@/pages/SupportPage";
import AssistantPage from "@/pages/AssistantPage";
import CybersecurityPage from "@/pages/CybersecurityPage";
import EducationalCompanionPage from "@/pages/EducationalCompanionPage";
import LocalLLMPage from "@/pages/LocalLLMPage";
import JobMarketPage from "@/pages/JobMarketPage";
import TenderPage from "@/pages/TenderPage";
import OpportunityPage from "@/pages/OpportunityPage";
import CompanionDashboardPage from "@/pages/CompanionDashboardPage";
import VoiceInterfacePage from "@/pages/VoiceInterfacePage";
import AdminPage from "@/pages/AdminPage";
import AgricultureAdvisorPage from "@/pages/AgricultureAdvisorPage";
import LoadSheddingPage from "@/pages/LoadSheddingPage";
import AfricanLanguagesPage from "@/pages/AfricanLanguagesPage";
import WaterPage from "@/pages/WaterPage";
import FinancialLiteracyPage from "@/pages/FinancialLiteracyPage";
import HealthPage from "@/pages/HealthPage";
import BilingualPage from "@/pages/BilingualPage";
import BusinessRegPage from "@/pages/BusinessRegPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AIBrainPage from "@/pages/AIBrainPage";
import MoreMenuPage from "@/pages/MoreMenuPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import FavoritesPage from "@/pages/FavoritesPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotificationsPage from "@/pages/NotificationsPage";
import OmniLabPage from "@/pages/OmniLabPage";
import OmniLabEvolverPage from "@/pages/OmniLabEvolverPage";
import NotFoundPage from "@/pages/NotFoundPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import ContactPage from "@/pages/ContactPage";

/* COMPONENTS */
import CookieConsent from "@/components/CookieConsent";
import WelcomeModal from "@/components/WelcomeModal";
import ReportBugButton from "@/components/ReportBugButton";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/* ICONS */
import {
  Home as HomeIcon,
  MessageSquare,
  DollarSign,
  GraduationCap,
  Wrench,
  Briefcase,
  Calculator,
  Dumbbell,
  Bot,
  Shield,
  Sparkles,
  Puzzle,
  BookOpen,
  Brain,
  TrendingUp,
  Zap,
  Languages,
  Monitor,
  Search,
  Mic,
  Users,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Settings,
  Sprout,
  FlaskConical,
  MoreHorizontal,
  Bell,
  User,
  Droplets,
  PiggyBank,
  HeartPulse,
  Scale,
  Building2,
} from "lucide-react";

/* TYPES */
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

/* NAVIGATION CONFIGURATION */
const navGroups: NavGroup[] = [
  {
    id: "core",
    label: "Core",
    icon: LayoutGrid,
    items: [
      { id: "ai-brain", label: "AI Brain", icon: Brain, path: "/ai-brain" },
      { id: "home", label: "Home", icon: HomeIcon, path: "/" },
      { id: "chat", label: "Chat", icon: MessageSquare, path: "/chat" },
      { id: "assistant", label: "Assistant", icon: Bot, path: "/assistant" },
      { id: "workspace", label: "Workspace", icon: Briefcase, path: "/workspace" },
      { id: "local-llm", label: "Local AI", icon: Monitor, path: "/local-llm" },
    ],
  },
  {
    id: "finance",
    label: "Finance & Business",
    icon: DollarSign,
    items: [
      { id: "finance", label: "Finance", icon: DollarSign, path: "/finance" },
      { id: "accountant", label: "Accountant", icon: Calculator, path: "/accountant" },
      { id: "financial-literacy", label: "Financial Freedom", icon: PiggyBank, path: "/financial-literacy" },
      { id: "business-reg", label: "Business Registration", icon: Building2, path: "/business-reg" },
      { id: "tender", label: "Tenders", icon: Briefcase, path: "/tender" },
      { id: "opportunity", label: "Opportunities", icon: TrendingUp, path: "/opportunity" },
    ],
  },
  {
    id: "daily",
    label: "Daily Life",
    icon: Zap,
    items: [
      { id: "load-shedding", label: "Load Shedding", icon: Zap, path: "/load-shedding" },
      { id: "water", label: "Water Services", icon: Droplets, path: "/water" },
      { id: "health", label: "Health Shield", icon: HeartPulse, path: "/health" },
      { id: "agriculture-advisor", label: "Agri Advisor", icon: Sprout, path: "/agriculture-advisor" },
    ],
  },
  {
    id: "ai",
    label: "AI Capabilities",
    icon: Brain,
    items: [
      { id: "education", label: "Education", icon: GraduationCap, path: "/education" },
      { id: "languages", label: "Languages", icon: Languages, path: "/languages" },
      { id: "african-languages", label: "African Languages", icon: Languages, path: "/african-languages" },
      { id: "bilingual", label: "Contract Assistant", icon: Scale, path: "/bilingual" },
      { id: "wisdom", label: "Wisdom", icon: Sparkles, path: "/wisdom" },
      { id: "skills", label: "Skills", icon: Wrench, path: "/skills" },
      { id: "kb", label: "Knowledge", icon: BookOpen, path: "/knowledge-base" },
      { id: "cybersecurity", label: "Security", icon: Shield, path: "/cybersecurity" },
      { id: "educational-companion", label: "Ed Companion", icon: BookOpen, path: "/educational-companion" },
      { id: "job-market", label: "Job Market", icon: TrendingUp, path: "/job-market" },
      { id: "omni-lab", label: "OmniLab", icon: FlaskConical, path: "/omni-lab" },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      { id: "companion", label: "Companion Hub", icon: Bot, path: "/companion" },
      { id: "voice", label: "Voice", icon: Mic, path: "/voice" },
      { id: "training", label: "Training", icon: Dumbbell, path: "/training" },
      { id: "admin", label: "Admin", icon: Monitor, path: "/admin" },
      { id: "more", label: "More", icon: MoreHorizontal, path: "/more" },
      { id: "status", label: "Status", icon: Zap, path: "/status" },
      { id: "plugins", label: "Plugins", icon: Puzzle, path: "/plugins" },
      { id: "onboarding", label: "Onboarding", icon: Users, path: "/onboarding" },
    ],
  },
];

/* MAIN APP COMPONENT */
function App() {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const hasSeen = localStorage.getItem("luqi-welcome-shown");
    if (!hasSeen) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    localStorage.setItem("luqi-welcome-shown", "true");
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return navGroups;
    const q = searchQuery.toLowerCase();
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.id.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Brain size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block">Luqi AI</span>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-sm"
            >
              <Search size={16} />
              <span>Search capabilities...</span>
              <kbd className="ml-auto px-2 py-0.5 rounded bg-background text-xs">Ctrl K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="p-2 rounded-lg hover:bg-accent transition-colors relative"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center pt-20">
          <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search size={18} className="text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search capabilities, pages, or features..."
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <button onClick={() => setIsSearchOpen(false)} className="p-1 hover:bg-accent rounded">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredGroups.map((g) => (
                <div key={g.id} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {g.label}
                  </div>
                  {g.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.path);
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <item.icon size={16} className="text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <aside
        className={`fixed left-0 top-14 bottom-0 z-40 bg-card border-r border-border transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <div className="h-full overflow-y-auto py-2">
          {navGroups.map((group) => (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-accent/50 transition-colors"
              >
                <group.icon size={14} />
                <span className="flex-1 text-left">{group.label}</span>
                {collapsedGroups.has(group.id) ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
              {!collapsedGroups.has(group.id) && (
                <div className="space-y-0.5 px-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        location.pathname === item.path
                          ? "bg-cyan-500/10 text-cyan-600 font-medium"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                      {location.pathname === item.path && (
                        <ChevronRight size={14} className="ml-auto text-cyan-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main
        className={`pt-14 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/knowledge-base" element={<KBPage />} />
            <Route path="/plugins" element={<PluginsPage />} />
            <Route path="/wisdom" element={<WisdomPage />} />
            <Route path="/languages" element={<LanguagesPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/education" element={<EducationPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/accountant" element={<AccountantPage />} />
            <Route path="/tender" element={<TenderPage />} />
            <Route path="/opportunity" element={<OpportunityPage />} />
            <Route path="/financial-literacy" element={<FinancialLiteracyPage />} />
            <Route path="/business-reg" element={<BusinessRegPage />} />
            <Route path="/load-shedding" element={<LoadSheddingPage />} />
            <Route path="/water" element={<WaterPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/bilingual" element={<BilingualPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/cybersecurity" element={<CybersecurityPage />} />
            <Route path="/educational-companion" element={<EducationalCompanionPage />} />
            <Route path="/local-llm" element={<LocalLLMPage />} />
            <Route path="/job-market" element={<JobMarketPage />} />
            <Route path="/omni-lab" element={<OmniLabPage />} />
            <Route path="/omni-lab-evolver" element={<OmniLabEvolverPage />} />
            <Route path="/agriculture-advisor" element={<AgricultureAdvisorPage />} />
            <Route path="/african-languages" element={<AfricanLanguagesPage />} />
            <Route path="/ai-brain" element={<AIBrainPage />} />
            <Route path="/companion" element={<CompanionDashboardPage />} />
            <Route path="/voice" element={<VoiceInterfacePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/more" element={<MoreMenuPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}
      <CookieConsent />
      <ReportBugButton />
    </div>
  );
}

export default App;
