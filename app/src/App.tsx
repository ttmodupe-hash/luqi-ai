import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
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
import LoadSheddingPage from "@/pages/LoadSheddingPage";
import SolarPage from "@/pages/SolarPage";
import LoanPage from "@/pages/LoanPage";
import InsurancePage from "@/pages/InsurancePage";
import PayrollPage from "@/pages/PayrollPage";
import InvoicePage from "@/pages/InvoicePage";
import InventoryPage from "@/pages/InventoryPage";
import CRMPage from "@/pages/CRMPage";
import ProjectPage from "@/pages/ProjectPage";
import CommunicationPage from "@/pages/CommunicationPage";
import WeatherPage from "@/pages/WeatherPage";
import TravelPage from "@/pages/TravelPage";
import MentalHealthPage from "@/pages/MentalHealthPage";
import ParentingPage from "@/pages/ParentingPage";
import SportsPage from "@/pages/SportsPage";
import ConstructionPage from "@/pages/ConstructionPage";
import VehiclePage from "@/pages/VehiclePage";
import MusicPage from "@/pages/MusicPage";
import GovernmentPage from "@/pages/GovernmentPage";
import EcommercePage from "@/pages/EcommercePage";
import AgriculturePage from "@/pages/AgriculturePage";
import HealthPage from "@/pages/HealthPage";
import LegalPage from "@/pages/LegalPage";
import RealEstatePage from "@/pages/RealEstatePage";
import FinancialLiteracyPage from "@/pages/FinancialLiteracyPage";
import EducationalCompanionPage from "@/pages/EducationalCompanionPage";
import LocalLLMPage from "@/pages/LocalLLMPage";
import HealthcareDirectoryPage from "@/pages/HealthcareDirectoryPage";
import NutritionPage from "@/pages/NutritionPage";
import PublicTransportPage from "@/pages/PublicTransportPage";
import UniversityPage from "@/pages/UniversityPage";
import JobMarketPage from "@/pages/JobMarketPage";
import WaterPage from "@/pages/WaterPage";
import EmergencyPage from "@/pages/EmergencyPage";
import FarmingPage from "@/pages/FarmingPage";
import MobileDataPage from "@/pages/MobileDataPage";
import PropertyPage from "@/pages/PropertyPage";
import NewsPage from "@/pages/NewsPage";
import LivestockPage from "@/pages/LivestockPage";
import GrantsPage from "@/pages/GrantsPage";
import BusinessRegPage from "@/pages/BusinessRegPage";
import ClimatePage from "@/pages/ClimatePage";
import HousingPage from "@/pages/HousingPage";
import FoodWinePage from "@/pages/FoodWinePage";
import MiningPage from "@/pages/MiningPage";
import CommunityPage from "@/pages/CommunityPage";
import EntertainmentPage from "@/pages/EntertainmentPage";
import TenderPage from "@/pages/TenderPage";
import FundingPage from "@/pages/FundingPage";
import LoanMasteryPage from "@/pages/LoanMasteryPage";
import VocationalPage from "@/pages/VocationalPage";
import AfricanLanguagesPage from "@/pages/AfricanLanguagesPage";
import DigitalTransformPage from "@/pages/DigitalTransformPage";
import WizardPage from "@/pages/WizardPage";
import SelfImprovePage from "@/pages/SelfImprovePage";
import CalcEnginePage from "@/pages/CalcEnginePage";
import BilingualPage from "@/pages/BilingualPage";
import OpportunityPage from "@/pages/OpportunityPage";
import CompanionTrainerPage from "@/pages/CompanionTrainerPage";
import ProfessionalAssistPage from "@/pages/ProfessionalAssistPage";
import InvestmentMiningPage from "@/pages/InvestmentMiningPage";
import VoiceInterfacePage from "@/pages/VoiceInterfacePage";
import AdminPage from "@/pages/AdminPage";
import AgricultureAdvisorPage from "@/pages/AgricultureAdvisorPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AIBrainPage from "@/pages/AIBrainPage";
import SearchPage from "@/pages/SearchPage";
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
import CookieConsent from "@/components/CookieConsent";
import WelcomeModal from "@/components/WelcomeModal";
import ReportBugButton from "@/components/ReportBugButton";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  Home as HomeIcon,
  MessageSquare,
  Globe,
  DollarSign,
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
  BookOpen,
  FileText,
  FlaskConical,
  Dna,
  Banknote,
  Brain,
  TrendingUp,
  Zap,
  Route,
  Languages,
  Monitor,
  Wand2,
  Search,
  UserCog,
  Pickaxe,
  Mic,
  SunDim,
  Landmark,
  Umbrella,
  Users,
  Receipt,
  Package,
  FolderKanban,
  Kanban,
  Radio,
  CloudSun,
  Plane,
  HeartPulse,
  Baby,
  Trophy,
  HardHat,
  Car,
  Music,
  Building2,
  ShoppingCart,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Settings,
  Sprout,
  Stethoscope,
  Scale,
  PiggyBank,
  Cpu,
  Hospital,
  Apple,
  Bus,
  University,
  Droplets,
  Phone,
  Tractor,
  Wifi,
  Newspaper,
  Beef,
  Leaf,
  Wine,
  Film,
  Home as LucideHome,
  Star,
  MoreHorizontal,
  Bell,
  LogOut,
  LogIn,
  User,
} from "lucide-react";

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

const navGroups: NavGroup[] = [
  {
    id: "core",
    label: "Core",
    icon: LayoutGrid,
    items: [
      { id: "ai-brain", label: "AI Brain", icon: Brain, path: "/ai-brain" },
      { id: "search", label: "Search", icon: Search, path: "/search" },
      { id: "home", label: "Home", icon: HomeIcon, path: "/" },
      { id: "chat", label: "Chat", icon: MessageSquare, path: "/chat" },
      { id: "assistant", label: "Assistant", icon: Bot, path: "/assistant" },
      { id: "workspace", label: "Workspace", icon: Briefcase, path: "/workspace" },
      { id: "local-llm", label: "Local AI", icon: Cpu, path: "/local-llm" },
    ],
  },
  {
    id: "finance",
    label: "Finance & Business",
    icon: DollarSign,
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
    icon: Zap,
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
      { id: "property", label: "Property", icon: HomeIcon, path: "/property" },
      { id: "housing", label: "Housing", icon: LucideHome, path: "/housing" },
      { id: "livestock", label: "Livestock", icon: Beef, path: "/livestock" },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge & Health",
    icon: BookOpen,
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
      { id: "real-estate", label: "Real Estate", icon: HomeIcon, path: "/real-estate" },
      { id: "edu-companion", label: "Edu Companion", icon: GraduationCap, path: "/edu-companion" },
      { id: "university", label: "Universities", icon: University, path: "/university" },
      { id: "jobs", label: "Job Market", icon: Briefcase, path: "/jobs" },
      { id: "news", label: "News", icon: Newspaper, path: "/news" },
      { id: "climate", label: "Climate", icon: Leaf, path: "/climate" },
      { id: "food-wine", label: "Food & Wine", icon: Wine, path: "/food-wine" },
      { id: "mining", label: "Mining", icon: Pickaxe, path: "/mining" },
      { id: "community", label: "Community", icon: Users, path: "/community" },
      { id: "entertainment", label: "Entertainment", icon: Film, path: "/entertainment" },
      { id: "vocational", label: "Vocational", icon: Route, path: "/vocational" },
      { id: "african-languages", label: "African Languages", icon: Languages, path: "/african-languages" },
      { id: "digital-transform", label: "Digital Transform", icon: Monitor, path: "/digital-transform" },
      { id: "wizard", label: "Wizard", icon: Wand2, path: "/wizard" },
      { id: "self-improve", label: "Self Improve", icon: TrendingUp, path: "/self-improve" },
      { id: "calc-engine", label: "Calc Engine", icon: Calculator, path: "/calc-engine" },
      { id: "bilingual", label: "Bilingual", icon: MessageSquare, path: "/bilingual" },
      { id: "opportunities", label: "Opportunities", icon: Search, path: "/opportunities" },
      { id: "companion-trainer", label: "Companion Trainer", icon: Bot, path: "/companion-trainer" },
      { id: "professional-assist", label: "Professional Assist", icon: UserCog, path: "/professional-assist" },
      { id: "investment-mining", label: "Investment Mining", icon: Pickaxe, path: "/investment-mining" },
      { id: "voice", label: "Voice", icon: Mic, path: "/voice" },
      { id: "tenders", label: "Tenders", icon: FileText, path: "/tenders" },
      { id: "funding", label: "Funding", icon: Banknote, path: "/funding" },
      { id: "loan-mastery", label: "Loan Mastery", icon: TrendingUp, path: "/loan-mastery" },
      { id: "omnilab-evolver", label: "OmniLab Evolver", icon: Dna, path: "/omnilab-evolver" },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      { id: "support", label: "Support", icon: Headphones, path: "/support" },
      { id: "plugins", label: "Plugins", icon: Puzzle, path: "/plugins" },
      { id: "kb", label: "Knowledge Base", icon: BookOpen, path: "/kb" },
      { id: "status", label: "Status", icon: Shield, path: "/status" },
    ],
  },
];

const mobileTabs = [
  { id: "home", label: "Home", icon: HomeIcon, path: "/" },
  { id: "ai-brain", label: "AI", icon: Brain, path: "/ai-brain" },
  { id: "search", label: "Search", icon: Search, path: "/search" },
  { id: "favorites", label: "Saved", icon: Star, path: "/favorites" },
  { id: "more", label: "More", icon: Menu, path: "/menu" },
];

function BottomNav({ currentPage, onNavigate }: { currentPage: string; onNavigate: (path: string) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden select-none">
      <div className="flex items-center justify-around h-16">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.id === "more"
              ? false
              : currentPage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors ${
                isActive
                  ? "text-cyan-600 dark:text-cyan-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [authState, setAuthState] = useState<{
    isLoggedIn: boolean;
    user: { name?: string; email?: string } | null;
  }>(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    return {
      isLoggedIn: !!token,
      user: userStr ? JSON.parse(userStr) : null,
    };
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const isMobile = useIsMobile();

  /* ------------------------------------------------------------------ */
  /* Auth helpers                                                       */
  /* ------------------------------------------------------------------ */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthState({ isLoggedIn: false, user: null });
    navigate("/login");
  };

  /* ------------------------------------------------------------------ */
  /* Notification badge polling (every 60s)                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!authState.isLoggedIn) return;
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/v25/notifications/unread-count`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setNotifCount(data.unread_count || 0);
        }
      } catch {
        /* ignore network errors */
      }
    };
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [authState.isLoggedIn]);

  /* ------------------------------------------------------------------ */
  /* Analytics init + page view tracking                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  // Initialize expanded groups: on mobile only "core" is expanded;
  // on desktop all groups are expanded.
  const getInitialExpandedGroups = (): Set<string> => {
    if (isMobile) return new Set(["core"]);
    return new Set(navGroups.map((g) => g.id));
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    getInitialExpandedGroups
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Re-sync expanded groups when isMobile changes
  useEffect(() => {
    setExpandedGroups(getInitialExpandedGroups());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Flatten all nav items for active-page lookup
  const allNavItems = navGroups.flatMap((g) => g.items);

  const currentPage =
    allNavItems.find((item) => item.path === location.pathname)?.id || "home";

  const handleNav = (path: string) => {
    if (path === "/menu") {
      setMobileMenuOpen(true);
      return;
    }
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Filter nav groups based on search query
  const filteredNavGroups = searchQuery.trim()
    ? navGroups
        .map((group) => {
          const query = searchQuery.toLowerCase();
          const groupMatches = group.label.toLowerCase().includes(query);
          const matchingItems = group.items.filter(
            (item) =>
              item.label.toLowerCase().includes(query) ||
              group.label.toLowerCase().includes(query)
          );
          if (groupMatches) {
            return { ...group, items: group.items };
          }
          if (matchingItems.length > 0) {
            return { ...group, items: matchingItems };
          }
          return null;
        })
        .filter(Boolean) as NavGroup[]
    : navGroups;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleNav(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left min-h-[48px] select-none active:scale-[0.98] ${
          isActive
            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Mobile hamburger top bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border flex items-center justify-between px-4 py-3 select-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm">
              LQ
            </div>
            <span className="font-semibold text-sm text-foreground">LUQI AI</span>
          </div>
          <div className="flex items-center gap-1">
            {authState.isLoggedIn && (
              <button
                onClick={() => navigate("/notifications")}
                className="relative p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Notifications"
              >
                <Bell size={18} />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={toggle}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* Mobile overlay backdrop */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? mobileMenuOpen
              ? "fixed left-0 top-14 z-50 w-4/5 max-w-sm h-[calc(100vh-3.5rem)] translate-x-0 touch-pan-y overscroll-contain"
              : "fixed left-0 top-14 z-50 w-4/5 max-w-sm h-[calc(100vh-3.5rem)] -translate-x-full"
            : sidebarOpen
            ? "w-72 md:w-64"
            : "w-16"
        } bg-card border-r border-border flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Desktop Sidebar Header */}
        {!isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm">
                  LQ
                </div>
                <span className="font-semibold text-sm text-foreground">
                  LUQI AI
                </span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm mx-auto">
                LQ
              </div>
            )}
            <div className="flex items-center gap-1">
              {sidebarOpen && authState.isLoggedIn && (
                <button
                  onClick={() => navigate("/notifications")}
                  className="relative p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                  title="Notifications"
                >
                  <Bell size={16} />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {notifCount > 99 ? "99+" : notifCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={toggle}
                className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Mobile Sidebar Header (title only) */}
        {isMobile && mobileMenuOpen && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold text-sm text-muted-foreground">
              Navigation
            </span>
          </div>
        )}

        {/* Nav — grouped and collapsible */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto touch-pan-y overscroll-contain select-none">
          {/* Desktop collapsed: flat list of icons */}
          {!isMobile && !sidebarOpen ? (
            allNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors min-h-[44px] active:scale-[0.95] ${
                  currentPage === item.id
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={item.label}
              >
                <item.icon size={20} />
              </button>
            ))
          ) : (
            /* Desktop expanded / mobile: grouped view */
            <>
              {/* Search Input */}
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search navigation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-input border border-border text-foreground rounded-lg pl-9 pr-8 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors min-h-[40px]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {filteredNavGroups.map((group) => {
                const GroupIcon = group.icon;
                const isExpanded = searchQuery ? true : expandedGroups.has(group.id);
                return (
                  <div key={group.id} className="mb-1">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-h-[40px] select-none active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-2">
                        <GroupIcon size={14} />
                        {group.label}
                      </span>
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    {/* Collapsible Items */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="space-y-0.5 pt-0.5 pb-1 pl-2">
                        {group.items.map((item) => renderNavButton(item))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer — user profile / login */}
        {(!isMobile && sidebarOpen) || (isMobile && mobileMenuOpen) ? (
          <div className="p-4 border-t border-border space-y-3">
            {authState.isLoggedIn && authState.user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <User size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {authState.user.name || authState.user.email || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {authState.user.email || ""}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
              >
                <LogIn size={16} />
                Log In / Sign Up
              </button>
            )}
            <div className="text-xs text-muted-foreground">
              <p>API: {import.meta.env.VITE_API_URL || "localhost:8080"}</p>
              <p>v{import.meta.env.VITE_APP_VERSION || "29.0.0"}</p>
            </div>
          </div>
        ) : !isMobile ? (
          <div className="p-2 border-t border-border">
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
            </div>
          </div>
        ) : null}
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-hidden overscroll-contain ${
          isMobile ? "pt-14 pb-20" : ""
        }`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav currentPage={currentPage} onNavigate={handleNav} />}

      {/* Pre-launch components */}
      <CookieConsent />
      <WelcomeModal />
      <ReportBugButton />
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/ai-brain" element={<AIBrainPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/languages" element={<LanguagesPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/kb" element={<KBPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/wisdom" element={<WisdomPage />} />
        <Route path="/accountant" element={<AccountantPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/cybersecurity" element={<CybersecurityPage />} />
        <Route path="/load-shedding" element={<LoadSheddingPage />} />
        <Route path="/solar" element={<SolarPage />} />
        <Route path="/loan" element={<LoanPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/invoice" element={<InvoicePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/project" element={<ProjectPage />} />
        <Route path="/communication" element={<CommunicationPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/travel" element={<TravelPage />} />
        <Route path="/mental-health" element={<MentalHealthPage />} />
        <Route path="/parenting" element={<ParentingPage />} />
        <Route path="/sports" element={<SportsPage />} />
        <Route path="/construction" element={<ConstructionPage />} />
        <Route path="/vehicle" element={<VehiclePage />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/government" element={<GovernmentPage />} />
        <Route path="/ecommerce" element={<EcommercePage />} />
        <Route path="/agriculture" element={<AgriculturePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/real-estate" element={<RealEstatePage />} />
        <Route path="/financial-literacy" element={<FinancialLiteracyPage />} />
        <Route path="/edu-companion" element={<EducationalCompanionPage />} />
        <Route path="/local-llm" element={<LocalLLMPage />} />
        <Route path="/healthcare" element={<HealthcareDirectoryPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/transport" element={<PublicTransportPage />} />
        <Route path="/university" element={<UniversityPage />} />
        <Route path="/jobs" element={<JobMarketPage />} />
        <Route path="/water" element={<WaterPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/farming" element={<FarmingPage />} />
        <Route path="/mobile-data" element={<MobileDataPage />} />
        <Route path="/property" element={<PropertyPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/livestock" element={<LivestockPage />} />
        <Route path="/grants" element={<GrantsPage />} />
        <Route path="/business-reg" element={<BusinessRegPage />} />
        <Route path="/climate" element={<ClimatePage />} />
        <Route path="/housing" element={<HousingPage />} />
        <Route path="/food-wine" element={<FoodWinePage />} />
        <Route path="/mining" element={<MiningPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/entertainment" element={<EntertainmentPage />} />
        <Route path="/tenders" element={<TenderPage />} />
        <Route path="/funding" element={<FundingPage />} />
        <Route path="/loan-mastery" element={<LoanMasteryPage />} />
        <Route path="/vocational" element={<VocationalPage />} />
        <Route path="/african-languages" element={<AfricanLanguagesPage />} />
        <Route path="/digital-transform" element={<DigitalTransformPage />} />
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="/self-improve" element={<SelfImprovePage />} />
        <Route path="/calc-engine" element={<CalcEnginePage />} />
        <Route path="/bilingual" element={<BilingualPage />} />
        <Route path="/opportunities" element={<OpportunityPage />} />
        <Route path="/companion-trainer" element={<CompanionTrainerPage />} />
        <Route path="/professional-assist" element={<ProfessionalAssistPage />} />
        <Route path="/investment-mining" element={<InvestmentMiningPage />} />
        <Route path="/voice" element={<VoiceInterfacePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/agriculture-advisor" element={<AgricultureAdvisorPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/menu" element={<MoreMenuPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/omnilab" element={<OmniLabPage />} />
        <Route path="/omnilab-evolver" element={<OmniLabEvolverPage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </AppLayout>
  );
}
