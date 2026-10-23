import WorkspaceLayout from "./components/WorkspaceLayout";
import ServiceStatusPage from "./pages/ServiceStatusPage";
import { Routes, Route as RouterRoute } from "react-router";

// Pages
import Home from "./pages/Home";
import StartPage from "./pages/StartPage";
import AiPilotPage from "./pages/AiPilotPage";
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
import OmegaTasksPage from "./pages/OmegaTasksPage";
import TelemetryDashboardPage from "./pages/TelemetryDashboardPage";
import ExperientialEducationPage from "./pages/ExperientialEducationPage";
import PendulumLabPage from "./pages/PendulumLabPage";

// Components

function AppLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <RouterRoute path="/service-status" element={<ServiceStatusPage />} />
        <RouterRoute path="/" element={<Home />} />
        <RouterRoute path="/start" element={<StartPage />} />
        <RouterRoute path="/ai-trial" element={<AiPilotPage />} />
        <RouterRoute path="/join" element={<CompanionPage key="join" initialMode="signup" />} />
        <RouterRoute path="/public" element={<Home />} />
        <RouterRoute path="/portal" element={<Home />} />
        <RouterRoute path="/omega-tasks" element={<OmegaTasksPage />} />
        <RouterRoute path="/companion" element={<CompanionPage />} />
        <RouterRoute path="/mentor" element={<CompanionPage />} />
        <RouterRoute path="/ai-companion" element={<CompanionPage />} />
        <RouterRoute path="/telemetry" element={<TelemetryDashboardPage />} />
        <RouterRoute path="/super-core" element={<TelemetryDashboardPage />} />
        <RouterRoute
          path="/experiential-edu"
          element={<ExperientialEducationPage />}
        />
        <RouterRoute
          path="/simulation-core"
          element={<ExperientialEducationPage />}
        />
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
        <RouterRoute
          path="/african-radar"
          element={<AfricanOpportunityRadarPage />}
        />
        <RouterRoute path="/radar" element={<AfricanOpportunityRadarPage />} />
        <RouterRoute
          path="/sensing"
          element={<AfricanOpportunityRadarPage />}
        />
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
