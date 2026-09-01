import { Toaster } from "@/components/ui/toaster";
import { Routes, Route } from "react-router";
import { useTheme } from "@/hooks/useTheme";

// Only import pages that exist in the repo
import LabSimulatorPage from "./pages/LabSimulatorPage";
import SelfHealingPage from "./pages/SelfHealingPage";
import VideoStudioPage from "./pages/VideoStudioPage";

// Simple Home component inline (no external file needed)
function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">LUQI AI</h1>
        <p className="text-slate-400">African-first AI Education Platform</p>
        <div className="flex gap-4 justify-center">
          <a href="/lab-simulator" className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-medium">
            Lab Simulator
          </a>
          <a href="/self-healing" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium">
            Self-Healing
          </a>
          <a href="/video-studio" className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium">
            Video Studio
          </a>
        </div>
      </div>
    </div>
  );
}

// Simple NotFound component inline
function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-slate-400 mb-6">Page not found</p>
        <a href="/" className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-medium">
          Go Home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Toaster />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lab-simulator" element={<LabSimulatorPage />} />
        <Route path="/self-healing" element={<SelfHealingPage />} />
        <Route path="/video-studio" element={<VideoStudioPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
