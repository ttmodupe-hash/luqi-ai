import { lazy } from "react";
import { lazyQueryPage } from "./providers/lazy-query-page";
import RouteLoadBoundary from "./components/RouteLoadBoundary";
import WorkspaceLayout from "./components/WorkspaceLayout";
import { CustomerSessionProvider } from "./providers/customer-session";
import { ChatWorkspaceProvider } from "./providers/chat-workspace";
import { SovereignRegionProvider } from "./providers/sovereign-region";
import ServiceStatusPage from "./pages/ServiceStatusPage";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route as RouterRoute, useLocation, Navigate } from "react-router";

// Pages
import Home from "./pages/Home";
const StartPage = lazy(() => import("./pages/StartPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
import NotFoundPage from "./pages/NotFoundPage";
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
import CompanionPage from "./pages/CompanionPage";
import CustomerEntryPage from "./pages/CustomerEntryPage";
import OmegaTasksPage from './pages/OmegaTasksPage';

// Load optional tools only when their route is rendered. Keep account, notes,
// the release-observed core pages available in the initial bundle. Informational
// help, privacy, and pricing routes load only when visited.
const SovereignP2PMessenger = lazy(() => import("./components/SovereignP2PMessenger"));
const InstallAppPage = lazy(() => import("./pages/InstallAppPage"));
const LabSimulatorPage = lazyQueryPage(() => import("./pages/LabSimulatorPage"));
const SelfHealingPage = lazyQueryPage(() => import("./pages/SelfHealingPage"));
const VideoStudioPage = lazy(() => import("./pages/VideoStudioPage"));
const AskLuqiPage = lazy(() => import("./pages/AskLuqiPage"));
const GuestTryPage = lazy(() => import("./pages/GuestTryPage"));
const VisualTutorPage = lazy(() => import("./pages/VisualTutorPage"));
const KhoroSpatialVisionLab = lazy(() => import("./components/KhoroSpatialVisionLab"));
const LuqiChatWorkspacePage = lazy(() => import("./pages/LuqiChatWorkspacePage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const BusinessDeskPage = lazy(() => import("./pages/BusinessDeskPage"));
const StudyDeskPage = lazy(() => import("./pages/StudyDeskPage"));
const RightsGuidePage = lazy(() => import("./pages/RightsGuidePage"));
const DriverRightsPage = lazy(() => import("./pages/DriverRightsPage"));
const OpportunityCompassPage = lazy(() => import("./pages/OpportunityCompassPage"));
const TenderDeskPage = lazy(() => import("./pages/TenderDeskPage"));
const ComparativeEvidencePage = lazy(() => import("./pages/ComparativeEvidencePage"));
const ArchiveVaultPage = lazy(() => import("./pages/ArchiveVaultPage"));
const AfricanOpportunityRadarPage = lazy(() => import("./pages/AfricanOpportunityRadarPage"));
const CertMasterPage = lazy(() => import("./pages/CertMasterPage"));
const TelemetryDashboardPage = lazy(() => import("./pages/TelemetryDashboardPage"));
const ExperientialEducationPage = lazyQueryPage(() => import("./pages/ExperientialEducationPage"));
const PendulumLabPage = lazy(() => import("./pages/PendulumLabPage"));
const MultimodalHubPage = lazy(() => import("./pages/MultimodalHubPage").then(module => ({ default: module.MultimodalHubPage })));
const ExecutiveLabSuite = lazy(() => import("@/components/ExecutiveLabSuite"));
const AdminSovereignPortal = lazy(() => import("@/components/AdminSovereignPortal"));
const ConsumerRightsAssistant = lazy(() => import("@/components/ConsumerRightsAssistant"));

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
        <RouteLoadBoundary><AdminSovereignPortal /></RouteLoadBoundary>
      </div>
    );
  return <CustomerSessionProvider><ChatWorkspaceProvider><SovereignRegionProvider><WorkspaceLayout><RouteLoadBoundary>{children}</RouteLoadBoundary></WorkspaceLayout></SovereignRegionProvider></ChatWorkspaceProvider></CustomerSessionProvider>;
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <RouterRoute path="/service-status" element={<ServiceStatusPage />} />
        <RouterRoute path="/" element={<Home />} />
        <RouterRoute path="/start" element={<StartPage />} />
        <RouterRoute path="/install" element={<InstallAppPage />} />
        <RouterRoute path="/download" element={<Navigate to="/install" replace />} />
        <RouterRoute path="/chat" element={<LuqiChatWorkspacePage />} />
        <RouterRoute path="/visual-tutor" element={<VisualTutorPage />} />
        <RouterRoute path="/spatial-vision" element={<KhoroSpatialVisionLab />} />
        <RouterRoute path="/p2p" element={<SovereignP2PMessenger />} />
        <RouterRoute path="/circles" element={<Navigate to="/p2p" replace />} />
        <RouterRoute path="/payments" element={<PaymentsPage />} />
        <RouterRoute path="/ask" element={<AskLuqiPage />} />
        <RouterRoute path="/try" element={<GuestTryPage />} />
        <RouterRoute path="/ai-trial" element={<Navigate to="/chat" replace />} />
        <RouterRoute path="/content-studio" element={<VideoStudioPage />} />
        <RouterRoute path="/business-desk" element={<BusinessDeskPage />} />
        <RouterRoute path="/study-desk" element={<StudyDeskPage />} />
        <RouterRoute path="/rights-guide" element={<RightsGuidePage />} />
        <RouterRoute path="/driver-rights" element={<DriverRightsPage />} />
        <RouterRoute path="/opportunities" element={<OpportunityCompassPage />} />
        <RouterRoute path="/tenders" element={<TenderDeskPage />} />
        <RouterRoute path="/comparative-evidence" element={<ComparativeEvidencePage />} />
        {/* Fixed local aliases only: no return URL, credential or query forwarding. */}
        {["/signin", "/sign-in"].map(path => <RouterRoute key={path} path={path} element={<Navigate to="/login" replace />} />)}
        <RouterRoute path="/login" element={<CustomerEntryPage initialMode="signin" />} />
        {["/register", "/signup", "/sign-up"].map(path => <RouterRoute key={path} path={path} element={<Navigate to="/join" replace />} />)}
        <RouterRoute path="/join" element={<CustomerEntryPage initialMode="signup" />} />
        <RouterRoute path="/omega-tasks" element={<OmegaTasksPage />} />
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
        <RouterRoute path="/executive-labs" element={<div className="max-w-7xl mx-auto px-4 py-8"><ExecutiveLabSuite /></div>} />
        <RouterRoute path="/stem-suite" element={<div className="max-w-7xl mx-auto px-4 py-8"><ExecutiveLabSuite /></div>} />
        <RouterRoute path="/biology-lab" element={<div className="w-full h-[90vh]"><iframe src="/labs/biology_lab.html" title="Biology Lab" className="w-full h-full border-0" /></div>} />
        <RouterRoute path="/chemistry-lab" element={<div className="w-full h-[90vh]"><iframe src="/labs/chemistry_lab.html" title="Chemistry Lab" className="w-full h-full border-0" /></div>} />
        <RouterRoute path="/algebra-lab" element={<div className="w-full h-[90vh]"><iframe src="/labs/algebra_lab.html" title="Algebra Lab" className="w-full h-full border-0" /></div>} />
        <RouterRoute path="/geometry-lab" element={<div className="w-full h-[90vh]"><iframe src="/labs/geometry_lab.html" title="Geometry Lab" className="w-full h-full border-0" /></div>} />
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
        <RouterRoute path="/public" element={<Home />} />
        <RouterRoute path="/portal" element={<Home />} />
        <RouterRoute path="/admin" element={<AdminSovereignPortal />} />
        <RouterRoute path="/admin/knowledge-grading" element={<AdminSovereignPortal />} />
        <RouterRoute path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
