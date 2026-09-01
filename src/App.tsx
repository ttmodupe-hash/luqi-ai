import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";

// Pages
import Home from "./pages/Home";
import LabSimulatorPage from "./pages/LabSimulatorPage";
import SelfHealingPage from "./pages/SelfHealingPage";
import VideoStudioPage from "./pages/VideoStudioPage";
import PricingPage from "./pages/PricingPage";
import NotFoundPage from "./pages/NotFoundPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";

// Components
import WelcomeModal from "@/components/WelcomeModal";
import ReportBugButton from "@/components/ReportBugButton";
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
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lab-simulator" element={<LabSimulatorPage />} />
        <Route path="/self-healing" element={<SelfHealingPage />} />
        <Route path="/video-studio" element={<VideoStudioPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
