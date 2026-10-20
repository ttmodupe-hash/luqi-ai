import { useState, useEffect } from "react";
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
import { MultimodalHubPage } from "./pages/MultimodalHubPage";

// Components
import WelcomeModal from "@/components/WelcomeModal";
import ReportBugButton from "@/components/ReportBugButton";
import { GlobalSearchTrigger } from "@/components/GlobalCommandPalette";
import LanguageSelectorDropdown from "@/components/LanguageSelectorDropdown";
import FloatingAiChat from "@/components/FloatingAiChat";
import { LiveVoiceFloatingCopilot } from "@/components/LiveVoiceFloatingCopilot";
import AdminSovereignPortal from "@/components/AdminSovereignPortal";
import ConsumerRightsAssistant from "@/components/ConsumerRightsAssistant";
import PublicPlatformView from "@/components/PublicPlatformView";
import AdminKnowledgeAndGradingConsole from "@/components/AdminKnowledgeAndGradingConsole";

// Icons
import {
  Menu,
  X,
  Search,
  Lock,
  MessageSquare,
  GraduationCap,
  Activity,
  CreditCard,
  Sparkles
} from "lucide-react";

// App Layout Component with Global Navigation Header & 22-Language Dropdown
function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // If on admin route or admin subdomain, render AdminSovereignPortal directly
  const isAdmin =
    location.pathname.startsWith("/admin") ||
    (typeof window !== "undefined" && window.location.hostname.toLowerCase().startsWith("admin."));

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Toaster />
        <AdminSovereignPortal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Toaster />
      <WelcomeModal />
      <ReportBugButton />
      <GlobalSearchTrigger />
      <FloatingAiChat />
      <LiveVoiceFloatingCopilot />

      {/* Global Navigation Header with 4 Simplified Public Tabs */}
      <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                L
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  LUQI AI
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline leading-none">
                  Smart Everyday Assistant
                </span>
              </div>
            </Link>

            {/* 4 Clean, Human-Friendly Public Navigation Tabs */}
            <nav className="hidden lg:flex items-center gap-1.5 ml-2 border-l border-slate-800/80 pl-4">
              <Link
                to="/"
                className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname === "/"
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <span>💬 Ask Luqi-AI (Chat)</span>
              </Link>

              <Link
                to="/pendulum-lab"
                className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("pendulum") ||
                  location.pathname.includes("lab") ||
                  location.pathname.includes("multimodal")
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <span>🎓 School & STEM Labs</span>
              </Link>

              <Link
                to="/cert-academy"
                className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("cert") || location.pathname.includes("academy")
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <span>🎬 Tech & Career Academy</span>
              </Link>

              <Link
                to="/pricing"
                className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1.5 ${
                  location.pathname.includes("pricing") || location.pathname.includes("plan")
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <span>💳 Plans & Top-Up</span>
              </Link>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Search Palette Trigger */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("luqi:open-search"))}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-amber-500/40 transition-all flex items-center gap-1.5 font-medium shadow-sm"
              title="Quick Search (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded">
                ⌘K
              </kbd>
            </button>

            {/* Language Selection Dropdown */}
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
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <span>💬 Ask Luqi-AI (Chat)</span>
            </Link>
            <Link
              to="/pendulum-lab"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <span>🎓 School & STEM Labs</span>
            </Link>
            <Link
              to="/cert-academy"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <span>🎬 Tech & Career Academy</span>
            </Link>
            <Link
              to="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-900 font-medium"
            >
              <span>💳 Plans & Top-Up</span>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content View */}
      <div className="flex-1">
        {children}
      </div>

      {/* Clean Public Footer with Discreet Admin Lock */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 Luqi-AI. Built for everyone in South Africa and across the world.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-slate-400 transition">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-400 transition">Privacy</Link>
            <Link to="/contact" className="hover:text-slate-400 transition">Contact</Link>
            <Link
              to="/admin"
              className="p-1 rounded-md text-slate-600 hover:text-slate-400 transition"
              title="Admin Command Center"
            >
              <Lock className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <RouterRoute path="/" element={<Home />} />
        <RouterRoute path="/companion" element={<CompanionPage />} />
        <RouterRoute path="/mentor" element={<CompanionPage />} />
        <RouterRoute path="/ai-companion" element={<CompanionPage />} />
        <RouterRoute path="/multimodal-hub" element={<MultimodalHubPage />} />
        <RouterRoute path="/multimodal" element={<MultimodalHubPage />} />
        <RouterRoute path="/bioscience" element={<MultimodalHubPage />} />
        <RouterRoute path="/robotics-lab" element={<MultimodalHubPage />} />
        <RouterRoute path="/gemini-studio" element={<MultimodalHubPage />} />
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
        <RouterRoute path="/consumer-rights" element={<div className="max-w-5xl mx-auto px-4 py-8"><ConsumerRightsAssistant /></div>} />
        <RouterRoute path="/cpa" element={<div className="max-w-5xl mx-auto px-4 py-8"><ConsumerRightsAssistant /></div>} />
        <RouterRoute path="/dispute" element={<div className="max-w-5xl mx-auto px-4 py-8"><ConsumerRightsAssistant /></div>} />
        <RouterRoute path="/public" element={<div className="max-w-7xl mx-auto py-8"><PublicPlatformView /></div>} />
        <RouterRoute path="/portal" element={<div className="max-w-7xl mx-auto py-8"><PublicPlatformView /></div>} />
        <RouterRoute path="/admin" element={<AdminSovereignPortal />} />
        <RouterRoute path="/admin/knowledge-grading" element={<AdminSovereignPortal />} />
        <RouterRoute path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
