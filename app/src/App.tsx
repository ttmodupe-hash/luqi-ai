import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import Home from "./pages/Home";
import StatusPage from "./pages/StatusPage";
import KBPage from "./pages/KBPage";
import PluginsPage from "./pages/PluginsPage";
import WisdomPage from "./pages/WisdomPage";
import LanguagesPage from "./pages/LanguagesPage";
import FinancePage from "./pages/FinancePage";
import ChatPage from "./pages/ChatPage";
import EducationPage from "./pages/EducationPage";
import SkillsPage from "./pages/SkillsPage";
import WorkspacePage from "./pages/WorkspacePage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  MessageSquare,
  Activity,
  BookOpen,
  Puzzle,
  Sparkles,
  Globe,
  DollarSign,
  GraduationCap,
  Wrench,
  Monitor,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const navItems = [
    { id: "chat", label: "Chat", icon: MessageSquare, path: "/" },
    { id: "chatv2", label: "Chat v2", icon: MessageSquare, path: "/chat" },
    { id: "languages", label: "Languages", icon: Globe, path: "/languages" },
    { id: "finance", label: "Finance", icon: DollarSign, path: "/finance" },
    { id: "education", label: "Education", icon: GraduationCap, path: "/education" },
    { id: "skills", label: "Skills", icon: Wrench, path: "/skills" },
    { id: "workspace", label: "Workspace", icon: Monitor, path: "/workspace" },
    { id: "status", label: "System Status", icon: Activity, path: "/status" },
    { id: "kb", label: "Knowledge Base", icon: BookOpen, path: "/kb" },
    { id: "plugins", label: "Plugins", icon: Puzzle, path: "/plugins" },
    { id: "wisdom", label: "Wisdom", icon: Sparkles, path: "/wisdom" },
  ];

  const currentPage =
    navItems.find((item) => item.path === location.pathname)?.id || "chat";

  const handleNav = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-card border-r border-border flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm">
                Ω
              </div>
              <span className="font-semibold text-sm text-foreground">
                Luqi-AI
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p>API: {import.meta.env.VITE_API_URL || "localhost:8080"}</p>
              <p>v{import.meta.env.VITE_APP_VERSION || "3.6.0"}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/languages" element={<LanguagesPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/kb" element={<KBPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/wisdom" element={<WisdomPage />} />
      </Routes>
    </AppLayout>
  );
}
