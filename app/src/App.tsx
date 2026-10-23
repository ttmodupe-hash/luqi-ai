import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route as RouterRoute, useNavigate, useLocation, Link } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";

// Pages
import Home from "./pages/Home";
import LabSimulatorPage from "./pages/LabSimulatorPage";
import SelfHealingPage from "./pages/SelfHealingPage";
import VideoStudioPage from "./pages/VideoStudioPage";
import ArchiveVaultPage from "./pages/ArchiveVaultPage";
import PricingPage from "./pages/PricingPage";
import NotFoundPage from "./pages/NotFoundPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";
import AfricanOpportunityRadarPage from "./pages/AfricanOpportunityRadarPage";
import CertMasterPage from "./pages/CertMasterPage";
import CompanionPage from "./pages/CompanionPage";
import TelemetryDashboardPage from "./pages/TelemetryDashboardPage";
import ExperientialEducationPage from "./pages/ExperientialEducationPage";
import PendulumLabPage from "./pages/PendulumLabPage";

// Components
import WelcomeModal from "@/components/WelcomeModal";
import ReportBugButton from "@/components/ReportBugButton";
import { GlobalSearchTrigger } from "@/components/GlobalCommandPalette";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LanguageSelectorDropdown from "@/components/LanguageSelectorDropdown";
import FloatingAiChat from "@/components/FloatingAiChat";

// Icons
import {
  Home as HomeIcon,
  FlaskConical,
  HeartPulse,
  Film,
  CreditCard,
  Search,
  Menu,
  X,
  Brain,
  Sparkles,
  Activity,
  GraduationCap,
  Archive,
} from "lucide-react";

// App Layout Component with Global Navigation Header & 22-Language Dropdown
function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const privateConversationRoute = ["/companion", "/mentor", "/ai-companion"].includes(location.pathname.replace(/\/+$/, ""));
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Toaster />
      <WelcomeModal />
      <ReportBugButton />
      {!privateConversationRoute && <GlobalSearchTrigger />}
      {!privateConversationRoute && <FloatingAiChat />}

      {/* Global Navigation Header with 22-Language Selection Dropdown */}
      <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                L
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  LUQI AI
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline leading-none">
                  Sovereign Intelligence
                </span>
              </div>
            </Link>

            {/* Core Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 ml-2 border-l border-slate-800/80 pl-3">
              <Link
                to="/companion"
                className={`text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname === "/companion" || location.pathname === "/mentor"
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Companion</span>
              </Link>

              <Link
                to="/pendulum-lab"
                className={`text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("pendulum")
                    ? "bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>STEM Lab</span>
              </Link>

              <Link
                to="/luqitoons"
                className={`text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("luqitoon") || location.pathname.includes("video")
                    ? "bg-orange-500/15 text-orange-300 font-semibold border border-orange-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Film className="w-3.5 h-3.5 text-orange-400" />
                <span>LuqiToons 3D</span>
                <span className="text-[8px] px-1 py-0.2 rounded bg-orange-500/30 text-orange-200 font-mono font-bold">
                  3D
                </span>
              </Link>

              <Link
                to="/cert-academy"
                className={`text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("cert") || location.pathname.includes("exam")
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>CertMaster</span>
              </Link>

              <Link
                to="/african-radar"
                className={`text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("radar") || location.pathname.includes("african")
                    ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>African Radar</span>
              </Link>

              <Link
                to="/archive"
                className={`text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("archive") || location.pathname.includes("vault")
                    ? "bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Archive</span>
              </Link>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Omni-Query Search Trigger */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("luqi:open-search"))}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-amber-500/40 transition-all flex items-center gap-1.5 font-medium shadow-xs"
              title="Global Omni-Query & Capabilities Palette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Omni-Query</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded">
                ⌘K
              </kbd>
            </button>

            {/* GLOBAL 22-LANGUAGE SELECTION DROPDOWN */}
            <LanguageSelectorDropdown />

            {/* Mobile Navigation Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1 text-xs animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/companion"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <Brain className="w-4 h-4 text-amber-400" />
              <span>AI Companion & Reasoning</span>
            </Link>
            <Link
              to="/pendulum-lab"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <Activity className="w-4 h-4 text-sky-400" />
              <span>STEM Physics Lab</span>
            </Link>
            <Link
              to="/luqitoons"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <Film className="w-4 h-4 text-orange-400" />
              <span>LuqiToons 3D Animation</span>
            </Link>
            <Link
              to="/cert-academy"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>CertMaster Academy</span>
            </Link>
            <Link
              to="/african-radar"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>African Opportunity Radar</span>
            </Link>
            <Link
              to="/archive"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <Archive className="w-4 h-4 text-indigo-400" />
              <span>Archive Vault & Flight Recorder</span>
            </Link>
          </div>
        )}
      </header>

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();

  return (
    <AppLayout>
      <Routes>
        <RouterRoute path="/" element={<Home />} />
        <RouterRoute path="/companion" element={<CompanionPage />} />
        <RouterRoute path="/mentor" element={<CompanionPage />} />
        <RouterRoute path="/ai-companion" element={<CompanionPage />} />
        <RouterRoute path="/telemetry" element={<TelemetryDashboardPage />} />
        <RouterRoute path="/super-core" element={<TelemetryDashboardPage />} />
        <RouterRoute path="/experiential-edu" element={<ExperientialEducationPage />} />
        <RouterRoute path="/simulation-core" element={<ExperientialEducationPage />} />
        <RouterRoute path="/lab-simulator" element={<LabSimulatorPage />} />
        <RouterRoute path="/pendulum-lab" element={<PendulumLabPage />} />
        <RouterRoute path="/pendulum" element={<PendulumLabPage />} />
        <RouterRoute path="/simple-pendulum" element={<PendulumLabPage />} />
        <RouterRoute path="/self-healing" element={<SelfHealingPage />} />
        <RouterRoute path="/luqitoons" element={<VideoStudioPage />} />
        <RouterRoute path="/luqitoon" element={<VideoStudioPage />} />
        <RouterRoute path="/video-studio" element={<VideoStudioPage />} />
        <RouterRoute path="/toonbee" element={<VideoStudioPage />} />
        <RouterRoute path="/toon" element={<VideoStudioPage />} />
        <RouterRoute path="/cartoon" element={<VideoStudioPage />} />
        <RouterRoute path="/animation" element={<VideoStudioPage />} />
        <RouterRoute path="/animation-studio" element={<VideoStudioPage />} />
        <RouterRoute path="/archive" element={<ArchiveVaultPage />} />
        <RouterRoute path="/vault" element={<ArchiveVaultPage />} />
        <RouterRoute path="/pricing" element={<PricingPage />} />
        <RouterRoute path="/african-radar" element={<AfricanOpportunityRadarPage />} />
        <RouterRoute path="/radar" element={<AfricanOpportunityRadarPage />} />
        <RouterRoute path="/sensing" element={<AfricanOpportunityRadarPage />} />
        <RouterRoute path="/cert-academy" element={<CertMasterPage />} />
        <RouterRoute path="/exam-prep" element={<CertMasterPage />} />
        <RouterRoute path="/ccna" element={<CertMasterPage />} />
        <RouterRoute path="/ccnp" element={<CertMasterPage />} />
        <RouterRoute path="/itil-ai" element={<CertMasterPage />} />
        <RouterRoute path="/networking-lab" element={<CertMasterPage />} />
        <RouterRoute path="/terms" element={<TermsPage />} />
        <RouterRoute path="/privacy" element={<PrivacyPage />} />
        <RouterRoute path="/contact" element={<ContactPage />} />
        <RouterRoute path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}

// Build timestamp: 2026-09-01T12:05:00Z - FORCE FRESH BUILD
