import { useState } from "react";
import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import StatusPage from "./pages/StatusPage";
import KBPage from "./pages/KBPage";
import PluginsPage from "./pages/PluginsPage";
import WisdomPage from "./pages/WisdomPage";
import { MessageSquare, Activity, BookOpen, Puzzle, Sparkles, Menu, X } from "lucide-react";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState("chat");

  const navItems = [
    { id: "chat", label: "Chat", icon: MessageSquare, path: "/" },
    { id: "status", label: "System Status", icon: Activity, path: "/status" },
    { id: "kb", label: "Knowledge Base", icon: BookOpen, path: "/kb" },
    { id: "plugins", label: "Plugins", icon: Puzzle, path: "/plugins" },
    { id: "wisdom", label: "Wisdom", icon: Sparkles, path: "/wisdom" },
  ];

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-sm">
                Ω
              </div>
              <span className="font-semibold text-sm text-neutral-100">Luqi-AI</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <a
                key={item.id}
                href={item.path}
                onClick={() => setCurrentPage(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-neutral-800">
            <div className="text-xs text-neutral-500">
              <p>API: localhost:8080</p>
              <p>v3.6.0</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/kb" element={<KBPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/wisdom" element={<WisdomPage />} />
      </Routes>
    </AppLayout>
  );
}