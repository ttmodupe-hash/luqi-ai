import { lazy } from "react";
import { lazyQueryPage } from "./providers/lazy-query-page";
import RouteLoadBoundary from "./components/RouteLoadBoundary";
import WorkspaceLayout from "./components/WorkspaceLayout";
import { CustomerSessionProvider } from "./providers/customer-session";
import { ChatWorkspaceProvider } from "./providers/chat-workspace";
import { SovereignRegionProvider } from "./providers/sovereign-region";
import ServiceStatusPage from "./pages/ServiceStatusPage";
import { Routes, Route as RouterRoute, useLocation, Navigate } from "react-router";

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
import ConsumerRightsAssistant from "./components/ConsumerRightsAssistant";

// Keep core account/notes/help pages ready, and defer optional tool downloads.
const SovereignP2PMessenger = lazy(() => import("./components/SovereignP2PMessenger"));
const AdminSovereignPortal = lazy(() => import("./components/AdminSovereignPortal"));
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
const SocialSupportPage = lazy(() => import("./pages/SocialSupportPage"));
const TenderDeskPage = lazy(() => import("./pages/TenderDeskPage"));
const MunicipalServicesPage = lazy(() => import("./pages/MunicipalServicesPage"));
const TownshipEconomyPage = lazy(() => import("./pages/TownshipEconomyPage"));
const VisaEntryGuidePage = lazy(() => import("./pages/VisaEntryGuidePage"));
const ComparativeEvidencePage = lazy(() => import("./pages/ComparativeEvidencePage"));
const ArchiveVaultPage = lazy(() => import("./pages/ArchiveVaultPage"));
const AfricanOpportunityRadarPage = lazy(() => import("./pages/AfricanOpportunityRadarPage"));
const CertMasterPage = lazy(() => import("./pages/CertMasterPage"));
const TelemetryDashboardPage = lazy(() => import("./pages/TelemetryDashboardPage"));
const ExperientialEducationPage = lazyQueryPage(() => import("./pages/ExperientialEducationPage"));
const PendulumLabPage = lazy(() => import("./pages/PendulumLabPage"));

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (location.pathname.startsWith("/admin") || (typeof window !== "undefined" && window.location.hostname.toLowerCase().startsWith("admin."))) {
    return <div className="min-h-screen bg-slate-950 text-slate-100"><RouteLoadBoundary><AdminSovereignPortal /></RouteLoadBoundary></div>;
  }
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
        <RouterRoute path="/social-support" element={<SocialSupportPage />} />
        <RouterRoute path="/sassa" element={<SocialSupportPage defaultAgency="sassa" />} />
        <RouterRoute path="/uif" element={<SocialSupportPage defaultAgency="uif" />} />
        <RouterRoute path="/tenders" element={<TenderDeskPage />} />
        <RouterRoute path="/municipalities" element={<MunicipalServicesPage />} />
        <RouterRoute path="/municipal-services" element={<Navigate to="/municipalities" replace />} />
        <RouterRoute path="/township-economy" element={<TownshipEconomyPage />} />
        <RouterRoute path="/visa-entry" element={<VisaEntryGuidePage />} />
        <RouterRoute path="/visa" element={<Navigate to="/visa-entry" replace />} />
        <RouterRoute path="/township-business" element={<Navigate to="/township-economy" replace />} />
        <RouterRoute path="/comparative-evidence" element={<ComparativeEvidencePage />} />
        {/* Fixed local aliases only: no return URL, credential or query forwarding. */}
        {["/signin", "/sign-in"].map(path => <RouterRoute key={path} path={path} element={<Navigate to="/login" replace />} />)}
        <RouterRoute path="/login" element={<CustomerEntryPage initialMode="signin" />} />
        {["/register", "/signup", "/sign-up"].map(path => <RouterRoute key={path} path={path} element={<Navigate to="/join" replace />} />)}
        <RouterRoute path="/join" element={<CustomerEntryPage initialMode="signup" />} />
        <RouterRoute path="/public" element={<Home />} />
        <RouterRoute path="/portal" element={<Home />} />
        <RouterRoute path="/omega-tasks" element={<OmegaTasksPage />} />
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
        <RouterRoute path="/consumer-rights" element={<ConsumerRightsAssistant />} />
        <RouterRoute path="/admin" element={<AdminSovereignPortal />} />
        <RouterRoute path="/admin/knowledge-grading" element={<AdminSovereignPortal />} />
        <RouterRoute path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
