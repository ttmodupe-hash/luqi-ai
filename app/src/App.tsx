import { lazy } from "react";
import { lazyQueryPage } from "./providers/lazy-query-page";
import RouteLoadBoundary from "./components/RouteLoadBoundary";
import WorkspaceLayout from "./components/WorkspaceLayout";
import { CustomerSessionProvider } from "./providers/customer-session";
import ServiceStatusPage from "./pages/ServiceStatusPage";
import { Routes, Route as RouterRoute, Navigate } from "react-router";

import Home from "./pages/Home";
import StartPage from "./pages/StartPage";
import AiPilotPage from "./pages/AiPilotPage";
import PricingPage from "./pages/PricingPage";
import NotFoundPage from "./pages/NotFoundPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";
import CompanionPage from "./pages/CompanionPage";
import CustomerEntryPage from "./pages/CustomerEntryPage";
import OmegaTasksPage from "./pages/OmegaTasksPage";
import ConsumerRightsAssistant from "./components/ConsumerRightsAssistant";

// Keep core account/notes/help pages ready, and defer optional tool downloads.
const LabSimulatorPage = lazyQueryPage(() => import("./pages/LabSimulatorPage"));
const SelfHealingPage = lazyQueryPage(() => import("./pages/SelfHealingPage"));
const VideoStudioPage = lazy(() => import("./pages/VideoStudioPage"));
const AskLuqiPage = lazy(() => import("./pages/AskLuqiPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const BusinessDeskPage = lazy(() => import("./pages/BusinessDeskPage"));
const StudyDeskPage = lazy(() => import("./pages/StudyDeskPage"));
const RightsGuidePage = lazy(() => import("./pages/RightsGuidePage"));
const ArchiveVaultPage = lazy(() => import("./pages/ArchiveVaultPage"));
const AfricanOpportunityRadarPage = lazy(() => import("./pages/AfricanOpportunityRadarPage"));
const CertMasterPage = lazy(() => import("./pages/CertMasterPage"));
const TelemetryDashboardPage = lazy(() => import("./pages/TelemetryDashboardPage"));
const ExperientialEducationPage = lazyQueryPage(() => import("./pages/ExperientialEducationPage"));
const PendulumLabPage = lazy(() => import("./pages/PendulumLabPage"));

function AppLayout({ children }: { children: React.ReactNode }) {
  return <CustomerSessionProvider><WorkspaceLayout><RouteLoadBoundary>{children}</RouteLoadBoundary></WorkspaceLayout></CustomerSessionProvider>;
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <RouterRoute path="/service-status" element={<ServiceStatusPage />} />
        <RouterRoute path="/" element={<Home />} />
        <RouterRoute path="/start" element={<StartPage />} />
        <RouterRoute path="/chat" element={<AskLuqiPage />} />
        <RouterRoute path="/payments" element={<PaymentsPage />} />
        <RouterRoute path="/ask" element={<AskLuqiPage />} />
        <RouterRoute path="/ai-trial" element={<AiPilotPage />} />
        <RouterRoute path="/content-studio" element={<VideoStudioPage />} />
        <RouterRoute path="/business-desk" element={<BusinessDeskPage />} />
        <RouterRoute path="/study-desk" element={<StudyDeskPage />} />
        <RouterRoute path="/rights-guide" element={<RightsGuidePage />} />
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
        <RouterRoute path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
