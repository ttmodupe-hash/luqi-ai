import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route as RouterRoute, useNavigate, useLocation } from "react-router";
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
} from "lucide-react";

import FloatingAiChat from "@/components/FloatingAiChat";

// App Layout Component
function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Toaster />
      <WelcomeModal />
      <ReportBugButton />
      <GlobalSearchTrigger />
      <FloatingAiChat />
      {children}
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
        <RouterRoute path="/video-studio" element={<VideoStudioPage />} />
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
