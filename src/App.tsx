import WorkspaceLayout from "./components/WorkspaceLayout";
import ServiceStatusPage from "./pages/ServiceStatusPage";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route as RouterRoute, useLocation } from "react-router";

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
import ExecutiveLabSuite from "@/components/ExecutiveLabSuite";

// Components
import AdminSovereignPortal from "@/components/AdminSovereignPortal";
import ConsumerRightsAssistant from "@/components/ConsumerRightsAssistant";

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdmin =
    location.pathname.startsWith("/admin") ||
    (typeof window !== "undefined" &&
      window.location.hostname.toLowerCase().startsWith("admin."));
  if (isAdmin)
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Toaster />
        <AdminSovereignPortal />
      </div>
    );
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <RouterRoute path="/service-status" element={<ServiceStatusPage />} />
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
        <RouterRoute
          path="/experiential-edu"
          element={<ExperientialEducationPage />}
        />
        <RouterRoute
          path="/simulation-core"
          element={<ExperientialEducationPage />}
        />
        <RouterRoute path="/lab-simulator" element={<LabSimulatorPage />} />
        <RouterRoute
          path="/executive-labs"
          element={
            <div className="max-w-7xl mx-auto px-4 py-8">
              <ExecutiveLabSuite />
            </div>
          }
        />
        <RouterRoute
          path="/stem-suite"
          element={
            <div className="max-w-7xl mx-auto px-4 py-8">
              <ExecutiveLabSuite />
            </div>
          }
        />
        <RouterRoute
          path="/biology-lab"
          element={
            <div className="w-full h-[90vh]">
              <iframe
                src="/labs/biology_lab.html"
                title="Biology Lab"
                className="w-full h-full border-0"
              />
            </div>
          }
        />
        <RouterRoute
          path="/chemistry-lab"
          element={
            <div className="w-full h-[90vh]">
              <iframe
                src="/labs/chemistry_lab.html"
                title="Chemistry Lab"
                className="w-full h-full border-0"
              />
            </div>
          }
        />
        <RouterRoute
          path="/algebra-lab"
          element={
            <div className="w-full h-[90vh]">
              <iframe
                src="/labs/algebra_lab.html"
                title="Algebra Lab"
                className="w-full h-full border-0"
              />
            </div>
          }
        />
        <RouterRoute
          path="/geometry-lab"
          element={
            <div className="w-full h-[90vh]">
              <iframe
                src="/labs/geometry_lab.html"
                title="Geometry Lab"
                className="w-full h-full border-0"
              />
            </div>
          }
        />
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
        <RouterRoute
          path="/consumer-rights"
          element={
            <div className="max-w-5xl mx-auto px-4 py-8">
              <ConsumerRightsAssistant />
            </div>
          }
        />
        <RouterRoute
          path="/cpa"
          element={
            <div className="max-w-5xl mx-auto px-4 py-8">
              <ConsumerRightsAssistant />
            </div>
          }
        />
        <RouterRoute
          path="/dispute"
          element={
            <div className="max-w-5xl mx-auto px-4 py-8">
              <ConsumerRightsAssistant />
            </div>
          }
        />
        <RouterRoute path="/public" element={<Home />} />
        <RouterRoute path="/portal" element={<Home />} />
        <RouterRoute path="/admin" element={<AdminSovereignPortal />} />
        <RouterRoute
          path="/admin/knowledge-grading"
          element={<AdminSovereignPortal />}
        />
        <RouterRoute path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
