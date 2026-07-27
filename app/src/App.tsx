import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
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
import AccountantPage from "@/pages/AccountantPage";
import TrainingPage from "@/pages/TrainingPage";
import SupportPage from "@/pages/SupportPage";
import AssistantPage from "@/pages/AssistantPage";
import CybersecurityPage from "@/pages/CybersecurityPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  Home as HomeIcon,
  MessageSquare,
  Globe,
  DollarSign,
  GraduationCap,
  Wrench,
  Briefcase,
  Calculator,
  Dumbbell,
  Headphones,
  Bot,
  Shield,
  Sparkles,
  Puzzle,
  BookOpen,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

const navItems = [
  { id: "home", label: "Home", icon: HomeIcon, path: "/" },
  { id: "chat", label: "Chat", icon: MessageSquare, path: "/chat" },
  { id: "languages", label: "Languages", icon: Globe, path: "/languages" },
  { id: "finance", label: "Finance", icon: DollarSign, path: "/finance" },
  { id: "education", label: "Education", icon: GraduationCap, path: "/education" },
  { id: "skills", label: "Skills", icon: Wrench, path: "/skills" },
  { id: "workspace", label: "Workspace", icon: Briefcase, path: "/workspace" },
  { id: "accountant", label: "Accountant", icon: Calculator, path: "/accountant" },
  { id: "training", label: "Training", icon: Dumbbell, path: "/training" },
  { id: "support", label: "Support", icon: Headphones, path: "/support" },
  { id: "assistant", label: "Assistant", icon: Bot, path: "/assistant" },
  { id: "cybersecurity", label: "Cybersecurity", icon: Shield, path: "/cybersecurity" },
  { id: "wisdom", label: "Wisdom", icon: Sparkles, path: "/wisdom" },
  { id: "plugins", label: "Plugins", icon: Puzzle, path: "/plugins" },
  { id: "kb", label: "Knowledge Base", icon: BookOpen, path: "/kb" },
];

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const isMobile = useIsMobile();

  const currentPage =
    navItems.find((item) => item.path === location.pathname)?.id || "home";

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const renderNavButton = (item: typeof navItems[0]) => {
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
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Mobile hamburger top bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm">
              Omega
            </div>
            <span className="font-semibold text-sm text-foreground">Luqi-AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* Mobile overlay backdrop */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? mobileMenuOpen
              ? "fixed left-0 top-14 z-50 w-64 h-[calc(100vh-3.5rem)] translate-x-0"
              : "fixed left-0 top-14 z-50 w-64 h-[calc(100vh-3.5rem)] -translate-x-full"
            : sidebarOpen
            ? "w-64"
            : "w-16"
        } bg-card border-r border-border flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Desktop Sidebar Header */}
        {!isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm">
                  Omega
                </div>
                <span className="font-semibold text-sm text-foreground">
                  Luqi-AI
                </span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm mx-auto">
                Omega
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={toggle}
                className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
              >
                {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Mobile Sidebar Header (title only) */}
        {isMobile && mobileMenuOpen && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold text-sm text-muted-foreground">
              Navigation
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderNavButton(item))}
        </nav>

        {/* Footer */}
        {(!isMobile && sidebarOpen) || (isMobile && mobileMenuOpen) ? (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p>API: {import.meta.env.VITE_API_URL || "localhost:8080"}</p>
              <p>v{import.meta.env.VITE_APP_VERSION || "3.6.0"}</p>
            </div>
          </div>
        ) : !isMobile ? (
          <div className="p-2 border-t border-border">
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
            </div>
          </div>
        ) : null}
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-hidden ${
          isMobile ? "pt-14" : ""
        }`}
      >
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
        <Route path="/accountant" element={<AccountantPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/cybersecurity" element={<CybersecurityPage />} />
      </Routes>
    </AppLayout>
  );
}
