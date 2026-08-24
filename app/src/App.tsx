import { useState, useEffect, useMemo } from "react";
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
import CompanionDashboardPage from "@/pages/CompanionDashboardPage";
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
    id: "ai",
    label: "AI Capabilities",
    icon: Brain,
    items: [
      { id: "education", label: "Education", icon: GraduationCap, path: "/education" },
      { id: "languages", label: "Languages", icon: Languages, path: "/languages" },
      { id: "wisdom", label: "Wisdom", icon: Sparkles, path: "/wisdom" },
      { id: "skills", label: "Skills", icon: Wrench, path: "/skills" },
      { id: "kb", label: "Knowledge", icon: BookOpen, path: "/knowledge-base" },
      { id: "mental-health", label: "Mental Health", icon: HeartPulse, path: "/mental-health" },
      { id: "parenting", label: "Parenting", icon: Baby, path: "/parenting" },
      { id: "sports", label: "Sports", icon: Trophy, path: "/sports" },
      { id: "music", label: "Music", icon: Music, path: "/music" },
      { id: "legal", label: "Legal", icon: Scale, path: "/legal" },
      { id: "real-estate", label: "Real Estate", icon: Building2, path: "/real-estate" },
      { id: "cybersecurity", label: "Security", icon: Shield, path: "/cybersecurity" },
      { id: "educational-companion", label: "Ed Companion", icon: BookOpen, path: "/educational-companion" },
      { id: "university", label: "University", icon: University, path: "/university" },
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
      { id: "companion-trainer", label: "Companion Trainer", icon: UserCog, path: "/companion-trainer" },
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

function App() {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const currentPage = useMemo(() => {
    for (const g of navGroups) {
      for (const i of g.items) {
        if (i.path === location.pathname) return i.label;
      }
    }
    return "Luqi AI";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
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

      {/* Search Modal */}
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

      {/* Sidebar */}
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

      {/* Main Content */}
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
            <Route path="/educational-companion" element={<EducationalCompanionPage />} />
            <Route path="/local-llm" element={<LocalLLMPage />} />
            <Route path="/healthcare" element={<HealthcareDirectoryPage />} />
            <Route path="/nutrition" element={<NutritionPage />} />
            <Route path="/transport" element={<PublicTransportPage />} />
            <Route path="/university" element={<UniversityPage />} />
            <Route path="/job-market" element={<JobMarketPage />} />
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
            <Route path="/tender" element={<TenderPage />} />
            <Route path="/funding" element={<FundingPage />} />
            <Route path="/loan-mastery" element={<LoanMasteryPage />} />
            <Route path="/vocational" element={<VocationalPage />} />
            <Route path="/african-languages" element={<AfricanLanguagesPage />} />
            <Route path="/digital-transform" element={<DigitalTransformPage />} />
            <Route path="/wizard" element={<WizardPage />} />
            <Route path="/self-improve" element={<SelfImprovePage />} />
            <Route path="/calc-engine" element={<CalcEnginePage />} />
            <Route path="/bilingual" element={<BilingualPage />} />
            <Route path="/opportunity" element={<OpportunityPage />} />
            <Route path="/companion-trainer" element={<CompanionTrainerPage />} />
            <Route path="/companion" element={<CompanionDashboardPage />} />
            <Route path="/professional" element={<ProfessionalAssistPage />} />
            <Route path="/investment-mining" element={<InvestmentMiningPage />} />
            <Route path="/voice" element={<VoiceInterfacePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/agriculture-advisor" element={<AgricultureAdvisorPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/ai-brain" element={<AIBrainPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/more" element={<MoreMenuPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/omni-lab" element={<OmniLabPage />} />
            <Route path="/omni-lab-evolver" element={<OmniLabEvolverPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Welcome Modal */}
      <WelcomeModal isOpen={showWelcome} onClose={handleWelcomeClose} />

      {/* Cookie Consent */}
      <CookieConsent />

      {/* Report Bug Button */}
      <ReportBugButton />
    </div>
  );
}

export default App;
