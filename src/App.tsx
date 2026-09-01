import { Toaster } from "@/components/ui/toaster";
import VideoStudioPage from "./pages/VideoStudioPage";
import EthnobotanicalPage from "./pages/EthnobotanicalPage";
import AIOrchestratorPage from "./pages/AIOrchestratorPage";
import LabSimulatorPage from "./pages/LabSimulatorPage";
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
import SelfHealingPage from "@/pages/SelfHealingPage";
import NotFoundPage from "@/pages/NotFoundPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import ContactPage from "@/pages/ContactPage";
;
import WelcomeModal from "@/components/WelcomeModal";
import ReportBugButton from "@/components/ReportBugButton";
import analytics from "@/lib/analytics";
const initAnalytics = analytics.init;
const trackPageView = (path: string) => analytics.capture(path);
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
  Route as RouteIcon,
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
  CreditCard,
  ShoppingCart,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Star,
  Menu as MenuIcon,
  User,
  LogOut,
  Settings,
  Bell,
  Bookmark,
  Share2,
  Download,
  Upload,
  Trash2,
  Edit,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  ExternalLink,
  Copy,
  Clipboard,
  ClipboardCheck,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Timer,
  Hourglass,
  Watch,
  AlarmClock,
  History,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Target,
  Award,
  Gift,
  Gem,
  Crown,
  Medal,
  BadgeCheck,
  BadgeX,
  BadgeAlert,
  BadgeHelp,
  BadgeInfo,
  BadgePercent,
  BadgeDollarSign,
  BadgeEuro,
  BadgePound,
  BadgeYen,
  BadgeRupee,
  BadgeRuble,
  BadgeWon,
  BadgeFranc,
  BadgeLira,
  BadgePeso,
  BadgeReal,
  BadgeRand,
  BadgeShekel,
  BadgeTaka,
  BadgeTenge,
  BadgeBaht,
  BadgeDong,
  BadgeKyat,
  BadgeKip,
  BadgeRiel,
  BadgeRupiah,
  BadgeRinggit,
  BadgeSingaporeDollar,
  BadgeBruneiDollar,
  BadgeHongKongDollar,
  BadgeTaiwanDollar,
  BadgeNewZealandDollar,
  BadgeAustralianDollar,
  BadgeCanadianDollar,
  BadgeSwissFranc,
  BadgeNorwegianKrone,
  BadgeSwedishKrona,
  BadgeDanishKrone,
  BadgeIcelandicKrona,
  BadgePolishZloty,
  BadgeCzechKoruna,
  BadgeHungarianForint,
  BadgeRomanianLeu,
  BadgeBulgarianLev,
  BadgeCroatianKuna,
  BadgeSerbianDinar,
  BadgeTurkishLira,
  BadgeRussianRuble,
  BadgeUkrainianHryvnia,
  BadgeKazakhstaniTenge,
  BadgeUzbekistaniSom,
  BadgeKyrgyzstaniSom,
  BadgeTajikistaniSomoni,
  BadgeTurkmenistaniManat,
  BadgeAzerbaijaniManat,
  BadgeGeorgianLari,
  BadgeArmenianDram,
  BadgeMoldovanLeu,
  BadgeBelarusianRuble,
  BadgeAlbanianLek,
  BadgeBosnianConvertibleMark,
  BadgeMacedonianDenar,
  BadgeMontenegrinEuro,
  BadgeKosovarEuro,
  BadgeVaticanEuro,
  BadgeSanMarinoEuro,
  BadgeMonacoEuro,
  BadgeAndorranEuro,
  BadgeLiechtensteinFranc,
  BadgeLuxembourgEuro,
  BadgeBelgianEuro,
  BadgeDutchEuro,
  BadgeGermanEuro,
  BadgeAustrianEuro,
  BadgeSlovenianEuro,
  BadgeSlovakEuro,
  BadgeEstonianEuro,
  BadgeLatvianEuro,
  BadgeLithuanianEuro,
  BadgeFinnishEuro,
  BadgeIrishEuro,
  BadgePortugueseEuro,
  BadgeSpanishEuro,
  BadgeItalianEuro,
  BadgeGreekEuro,
  BadgeCypriotEuro,
  BadgeMalteseEuro,
  BadgeCroatianEuro,
  BadgeFrenchEuro,
  BadgeMonegasqueEuro,
  BadgeSammarineseEuro,
  BadgeVaticanEuro,
  BadgeAndorranEuro,
  BadgeKosovarEuro,
  BadgeMontenegrinEuro,
} from "lucide-react";

// App Layout Component
function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const currentPage = location.pathname.split('/')[1] || 'home';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Toaster />
      <WelcomeModal />
      <ReportBugButton />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ai-brain" element={<AIBrainPage />} />
        <Route path="/ai-orchestrator" element={<AIOrchestratorPage />} />
        <Route path="/lab-simulator" element={<LabSimulatorPage />} />
        <Route path="/self-healing" element={<SelfHealingPage />} />
        <Route path="/video-studio" element={<VideoStudioPage />} />
        <Route path="/ethnobotanical" element={<EthnobotanicalPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/kb" element={<KBPage />} />
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
        <Route path="/healthcare-directory" element={<HealthcareDirectoryPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/public-transport" element={<PublicTransportPage />} />
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
        <Route path="/business-registration" element={<BusinessRegPage />} />
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
        <Route path="/companion-dashboard" element={<CompanionDashboardPage />} />
        <Route path="/professional-assist" element={<ProfessionalAssistPage />} />
        <Route path="/investment-mining" element={<InvestmentMiningPage />} />
        <Route path="/voice-interface" element={<VoiceInterfacePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/agriculture-advisor" element={<AgricultureAdvisorPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/more-menu" element={<MoreMenuPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/omnilab" element={<OmniLabPage />} />
        <Route path="/omnilab-evolver" element={<OmniLabEvolverPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}

// Stub for CookieConsent
function CookieConsent() {
  return null;
}
