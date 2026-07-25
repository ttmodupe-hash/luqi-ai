import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  Home,
  Settings,
  MessageSquare,
  Users,
  Globe,
  Cpu,
  BookOpen,
  Briefcase,
  BarChart3,
  Shield,
  Wallet,
  Languages,
  GraduationCap,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const page = e.state?.page || window.location.hash.slice(1) || "home";
      setCurrentPage(page);
    };
    window.addEventListener("popstate", handlePopState);
    const initialPage = window.location.hash.slice(1) || "home";
    if (initialPage !== currentPage) setCurrentPage(initialPage);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (page: string) => {
    window.history.pushState({ page }, "", `#${page}`);
    setCurrentPage(page);
    if (isMobile) setMobileMenuOpen(false);
  };

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "agents", label: "Agents", icon: Cpu },
    { id: "languages", label: "Languages", icon: Languages },
    { id: "finance", label: "Finance", icon: Wallet },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Briefcase },
    { id: "workspace", label: "Workspace", icon: LayoutDashboard },
    { id: "security", label: "Security", icon: Shield },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage navigateTo={navigateTo} />;
      case "chat":
        return <ChatPage />;
      case "agents":
        return <AgentsPage />;
      case "languages":
        return <LanguagesPage />;
      case "finance":
        return <FinancePage />;
      case "education":
        return <EducationPage />;
      case "skills":
        return <SkillsPage />;
      case "workspace":
        return <WorkspacePage />;
      case "security":
        return <SecurityPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Mobile menu overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200",
          isMobile && !mobileMenuOpen && "-translate-x-full"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Luqi AI</span>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                    currentPage === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="text-xs text-muted-foreground">
            API: {API_BASE}
          </div>
          <div className="text-xs text-muted-foreground">
            v{import.meta.env.VITE_APP_VERSION || "25.2.0"}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile header */}
        {isMobile && (
          <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <span className="font-semibold">
              {navItems.find((i) => i.id === currentPage)?.label || "Luqi AI"}
            </span>
          </header>
        )}

        {/* Page content */}
        <ErrorBoundary>
          <div className="flex-1 overflow-auto">{renderPage()}</div>
        </ErrorBoundary>
      </main>
    </div>
  );
}

/* Placeholder page components */
function HomePage({ navigateTo }: { navigateTo: (p: string) => void }) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to Luqi AI</h1>
        <p className="text-muted-foreground">
          Your unified AI platform — Web, Desktop, and Mobile
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: "chat", title: "AI Chat", desc: "Converse with multiple AI models", icon: MessageSquare },
          { id: "languages", title: "African Languages", desc: "59 languages supported", icon: Languages },
          { id: "finance", title: "Financial Literacy", desc: "Budget, invest, and plan", icon: Wallet },
          { id: "education", title: "Education", desc: "Study plans and practice", icon: GraduationCap },
          { id: "skills", title: "Skills", desc: "Vocational training guides", icon: Briefcase },
          { id: "workspace", title: "Workspace", desc: "Productivity tools", icon: LayoutDashboard },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigateTo(card.id)}
            >
              <CardHeader className="pb-2">
                <Icon className="w-6 h-6 text-primary mb-1" />
                <CardTitle className="text-base">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v25/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "No response" }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not reach server" }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <Badge variant="outline">Thinking...</Badge>}
        </div>
      </ScrollArea>
      <div className="border-t p-4 flex gap-2 max-w-3xl mx-auto w-full">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." />
        <Button onClick={sendMessage} disabled={loading}>Send</Button>
      </div>
    </div>
  );
}

function AgentsPage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">AI Agents</h2><p className="text-muted-foreground">Manage and configure AI agents.</p></div>; }
function LanguagesPage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">African Languages</h2><p className="text-muted-foreground">Access 59 African languages and cultural notes.</p></div>; }
function FinancePage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Financial Literacy</h2><p className="text-muted-foreground">Budgeting, investment, and tax guidance.</p></div>; }
function EducationPage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Education</h2><p className="text-muted-foreground">Study plans and practice questions.</p></div>; }
function SkillsPage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Vocational Skills</h2><p className="text-muted-foreground">Trade guides and skill assessments.</p></div>; }
function WorkspacePage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Workspace Tools</h2><p className="text-muted-foreground">Productivity and collaboration tools.</p></div>; }
function SecurityPage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Security</h2><p className="text-muted-foreground">Security awareness and best practices.</p></div>; }
function AnalyticsPage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Analytics</h2><p className="text-muted-foreground">Usage analytics and health monitoring.</p></div>; }
function SettingsPage() { return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Settings</h2><p className="text-muted-foreground">Configure your Luqi AI instance.</p></div>; }

export default App;
