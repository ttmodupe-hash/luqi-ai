import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Activity,
  Zap,
  HeartPulse,
  Search,
  RefreshCw,
  Shield,
  UserCheck,
  UserX,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Settings,
  Bell,
  Lock,
  Globe,
  Cpu,
  Database,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Filter,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

interface AdminStats {
  users: number;
  api_calls_today: number;
  active_sessions: number;
  status: string;
}

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "user" | "viewer";
  status: "active" | "inactive" | "suspended";
  created_at: string;
  last_active: string;
}

interface ActivityItem {
  id: string;
  type: "api_call" | "user_registered" | "ticket_created" | "login" | "error";
  message: string;
  timestamp: string;
  user?: string;
}

interface ModuleUsage {
  module: string;
  calls: number;
  color: string;
}

interface SystemSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  category: "feature" | "security" | "notification";
}

/* ═══════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════ */

const MOCK_STATS: AdminStats = {
  users: 1284,
  api_calls_today: 45231,
  active_sessions: 87,
  status: "healthy",
};

const MOCK_USERS: AdminUser[] = [
  { id: "u1", email: "admin@luqi.ai", role: "admin", status: "active", created_at: "2024-01-15", last_active: "2025-01-20T10:30:00Z" },
  { id: "u2", email: "sarah.chen@example.com", role: "user", status: "active", created_at: "2024-03-22", last_active: "2025-01-20T09:15:00Z" },
  { id: "u3", email: "james.wilson@example.com", role: "user", status: "active", created_at: "2024-04-10", last_active: "2025-01-19T18:45:00Z" },
  { id: "u4", email: "maria.garcia@example.com", role: "viewer", status: "inactive", created_at: "2024-05-05", last_active: "2025-01-10T14:20:00Z" },
  { id: "u5", email: "alex.kim@example.com", role: "user", status: "active", created_at: "2024-06-18", last_active: "2025-01-20T11:00:00Z" },
  { id: "u6", email: "david.brown@example.com", role: "user", status: "suspended", created_at: "2024-07-01", last_active: "2024-12-15T09:30:00Z" },
  { id: "u7", email: "lisa.wang@example.com", role: "viewer", status: "active", created_at: "2024-08-12", last_active: "2025-01-18T16:10:00Z" },
  { id: "u8", email: "ryan.jones@example.com", role: "user", status: "active", created_at: "2024-09-20", last_active: "2025-01-20T08:50:00Z" },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", type: "api_call", message: "Vector search executed", timestamp: "2025-01-20T12:00:00Z", user: "sarah.chen" },
  { id: "a2", type: "user_registered", message: "New user registered: emma.davis@example.com", timestamp: "2025-01-20T11:45:00Z" },
  { id: "a3", type: "ticket_created", message: "Support ticket #4521: API key rotation request", timestamp: "2025-01-20T11:30:00Z", user: "james.wilson" },
  { id: "a4", type: "login", message: "User login: admin@luqi.ai", timestamp: "2025-01-20T11:15:00Z", user: "admin" },
  { id: "a5", type: "api_call", message: "Pedagogical diagnostic assessment completed", timestamp: "2025-01-20T11:00:00Z", user: "alex.kim" },
  { id: "a6", type: "error", message: "Rate limit exceeded: /api/v25/prices", timestamp: "2025-01-20T10:55:00Z" },
  { id: "a7", type: "api_call", message: "Crypto encrypt operation: 2.4KB data", timestamp: "2025-01-20T10:45:00Z", user: "ryan.jones" },
  { id: "a8", type: "ticket_created", message: "Support ticket #4520: Memory cleanup approval", timestamp: "2025-01-20T10:30:00Z", user: "lisa.wang" },
  { id: "a9", type: "login", message: "User login: sarah.chen@example.com", timestamp: "2025-01-20T10:15:00Z", user: "sarah.chen" },
  { id: "a10", type: "api_call", message: "Blockchain audit log exported", timestamp: "2025-01-20T10:00:00Z", user: "admin" },
];

const MOCK_MODULE_USAGE: ModuleUsage[] = [
  { module: "Chat", calls: 12450, color: "bg-emerald-500" },
  { module: "Vector DB", calls: 8320, color: "bg-blue-500" },
  { module: "Crypto", calls: 6780, color: "bg-purple-500" },
  { module: "Pedagogy", calls: 5430, color: "bg-amber-500" },
  { module: "Prices", calls: 4210, color: "bg-rose-500" },
  { module: "Wisdom", calls: 3890, color: "bg-cyan-500" },
  { module: "PDF", calls: 2150, color: "bg-orange-500" },
  { module: "Mesh", calls: 1800, color: "bg-indigo-500" },
];

const INITIAL_SETTINGS: SystemSetting[] = [
  { key: "chat", label: "Chat Module", description: "Enable AI chat conversations", enabled: true, category: "feature" },
  { key: "vector_search", label: "Vector Search", description: "Enable semantic vector search", enabled: true, category: "feature" },
  { key: "crypto", label: "Crypto Operations", description: "Enable encryption/decryption", enabled: true, category: "feature" },
  { key: "pedagogy", label: "Pedagogical Engine", description: "Enable learning assessments", enabled: true, category: "feature" },
  { key: "2fa", label: "Two-Factor Auth", description: "Require 2FA for admin accounts", enabled: false, category: "security" },
  { key: "api_key_rotation", label: "Auto Key Rotation", description: "Rotate API keys every 30 days", enabled: true, category: "security" },
  { key: "audit_log", label: "Audit Logging", description: "Log all admin actions to blockchain", enabled: true, category: "security" },
  { key: "email_alerts", label: "Email Alerts", description: "Send alerts for system events", enabled: true, category: "notification" },
  { key: "weekly_digest", label: "Weekly Digest", description: "Send weekly usage reports", enabled: false, category: "notification" },
  { key: "maintenance_notice", label: "Maintenance Notices", description: "Notify users of scheduled maintenance", enabled: true, category: "notification" },
];

/* ═══════════════════════════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════════════════════════ */

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const secs = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT: StatCard
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-neutral-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={22} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT: SimpleBarChart
   ═══════════════════════════════════════════════════════════════════ */

function SimpleBarChart({ data }: { data: ModuleUsage[] }) {
  const maxCalls = Math.max(...data.map((d) => d.calls));
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = (item.calls / maxCalls) * 100;
        return (
          <div key={item.module} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-neutral-300 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                {item.module}
              </span>
              <span className="text-sm text-neutral-400 font-mono">
                {formatNumber(item.calls)}
              </span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT: ActivityIcon
   ═══════════════════════════════════════════════════════════════════ */

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "api_call":
      return <Zap size={14} className="text-amber-400" />;
    case "user_registered":
      return <Users size={14} className="text-emerald-400" />;
    case "ticket_created":
      return <Bell size={14} className="text-blue-400" />;
    case "login":
      return <Shield size={14} className="text-cyan-400" />;
    case "error":
      return <AlertTriangle size={14} className="text-red-400" />;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT: StatusBadge
   ═══════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 text-xs">
          <CheckCircle2 size={10} className="mr-1" /> Active
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="bg-neutral-500/15 text-neutral-400 hover:bg-neutral-500/20 border-neutral-500/30 text-xs">
          <Clock size={10} className="mr-1" /> Inactive
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="bg-red-500/15 text-red-400 hover:bg-red-500/20 border-red-500/30 text-xs">
          <XCircle size={10} className="mr-1" /> Suspended
        </Badge>
      );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT: RoleBadge
   ═══════════════════════════════════════════════════════════════════ */

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  switch (role) {
    case "admin":
      return (
        <Badge className="bg-purple-500/15 text-purple-400 hover:bg-purple-500/20 border-purple-500/30 text-xs">
          <Shield size={10} className="mr-1" /> Admin
        </Badge>
      );
    case "user":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 hover:bg-blue-500/20 border-blue-500/30 text-xs">
          <UserCheck size={10} className="mr-1" /> User
        </Badge>
      );
    case "viewer":
      return (
        <Badge className="bg-neutral-500/15 text-neutral-400 hover:bg-neutral-500/20 border-neutral-500/30 text-xs">
          <Globe size={10} className="mr-1" /> Viewer
        </Badge>
      );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN: AdminPage
   ═══════════════════════════════════════════════════════════════════ */

export default function AdminPage() {
  const { get } = useApi();
  const [stats, setStats] = useState<AdminStats>(MOCK_STATS);
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [activity, setActivity] = useState<ActivityItem[]>(MOCK_ACTIVITY);
  const [moduleUsage] = useState<ModuleUsage[]>(MOCK_MODULE_USAGE);
  const [settings, setSettings] = useState<SystemSetting[]>(INITIAL_SETTINGS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof AdminUser>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [rateLimit, setRateLimit] = useState([1000]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  /* ── fetch from API with mock fallback ── */
  const fetchAdminData = useCallback(async () => {
    setRefreshing(true);
    try {
      const statsData = await get("/api/v25/admin/stats");
      if (statsData?.success) {
        setStats({
          users: statsData.users ?? MOCK_STATS.users,
          api_calls_today: statsData.api_calls_today ?? MOCK_STATS.api_calls_today,
          active_sessions: statsData.active_sessions ?? MOCK_STATS.active_sessions,
          status: statsData.status ?? MOCK_STATS.status,
        });
      }
    } catch {
      // keep mock data
    }
    try {
      const usersData = await get("/api/v25/admin/users");
      if (usersData?.success && Array.isArray(usersData.users) && usersData.users.length > 0) {
        setUsers(usersData.users);
      }
    } catch {
      // keep mock data
    }
    setRefreshing(false);
  }, [get]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  /* ── derived state ── */
  const filteredUsers = users
    .filter((u) => {
      const matchSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (field: keyof AdminUser) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "active" ? "inactive" : "active" as AdminUser["status"] }
          : u
      )
    );
  };

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const SortIcon = ({ field }: { field: keyof AdminUser }) => {
    if (sortField !== field) return <Filter size={12} className="text-neutral-600" />;
    return sortAsc ? (
      <ChevronUp size={12} className="text-emerald-400" />
    ) : (
      <ChevronDown size={12} className="text-emerald-400" />
    );
  };

  const healthColor =
    stats.status === "healthy"
      ? "text-emerald-400"
      : stats.status === "degraded"
      ? "text-amber-400"
      : "text-red-400";

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ═══════ HEADER ═══════ */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Shield size={24} className="text-emerald-400" />
                Admin Dashboard
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                Manage users, monitor usage, and configure system settings
              </p>
            </div>
            <button
              onClick={fetchAdminData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-800 text-neutral-300">
                <BarChart3 size={14} className="mr-1.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-neutral-800 text-neutral-300">
                <Users size={14} className="mr-1.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-neutral-800 text-neutral-300">
                <Activity size={14} className="mr-1.5" /> Activity
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-neutral-800 text-neutral-300">
                <Settings size={14} className="mr-1.5" /> Settings
              </TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════
                TAB: OVERVIEW
                ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Users"
                  value={formatNumber(stats.users)}
                  icon={Users}
                  color="bg-blue-500"
                  subtitle={`${users.filter((u) => u.status === "active").length} active`}
                />
                <StatCard
                  title="API Calls Today"
                  value={formatNumber(stats.api_calls_today)}
                  icon={Zap}
                  color="bg-amber-500"
                  subtitle="+12% from yesterday"
                />
                <StatCard
                  title="Active Sessions"
                  value={stats.active_sessions}
                  icon={Activity}
                  color="bg-emerald-500"
                  subtitle="Real-time"
                />
                <StatCard
                  title="System Health"
                  value={
                    <span className={healthColor}>
                      {stats.status === "healthy" ? (
                        <span className="flex items-center gap-1.5">
                          <HeartPulse size={20} /> Healthy
                        </span>
                      ) : stats.status === "degraded" ? (
                        "Degraded"
                      ) : (
                        "Critical"
                      )}
                    </span>
                  }
                  icon={HeartPulse}
                  color={
                    stats.status === "healthy"
                      ? "bg-emerald-500"
                      : stats.status === "degraded"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }
                  subtitle="All systems operational"
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Module Usage Chart */}
                <Card className="lg:col-span-2 bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                      <BarChart3 size={16} />
                      Module Usage Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart data={moduleUsage} />
                  </CardContent>
                </Card>

                {/* Quick stats */}
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                      <TrendingUp size={16} />
                      Quick Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Avg Response Time", value: "142ms", trend: "-8%", good: true },
                      { label: "Error Rate", value: "0.3%", trend: "-0.1%", good: true },
                      { label: "Uptime", value: "99.97%", trend: "+0.02%", good: true },
                      { label: "Storage Used", value: "68%", trend: "+2%", good: false },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">{m.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{m.value}</span>
                          <span
                            className={`text-xs ${m.good ? "text-emerald-400" : "text-amber-400"}`}
                          >
                            {m.trend}
                          </span>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 border-t border-neutral-800">
                      <p className="text-xs text-neutral-500 mb-2">System Load</p>
                      <Progress value={42} className="h-2 bg-neutral-800" />
                      <p className="text-xs text-neutral-400 mt-1">42% — Normal</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity (preview) */}
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Clock size={16} />
                    Recent Activity
                  </CardTitle>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    View all
                  </button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activity.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2 border-b border-neutral-800 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                        <ActivityIcon type={item.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 truncate">{item.message}</p>
                        {item.user && (
                          <p className="text-xs text-neutral-500">by {item.user}</p>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500 shrink-0">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB: USERS
                ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="users" className="space-y-4 mt-6">
              {/* Filters */}
              <Card className="bg-neutral-900 border-neutral-800">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        type="text"
                        placeholder="Search by email or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300 focus:outline-none"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300 focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Users table */}
              <Card className="bg-neutral-900 border-neutral-800">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-transparent">
                          <TableHead className="text-neutral-400">
                            <button
                              onClick={() => toggleSort("email")}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              Email <SortIcon field="email" />
                            </button>
                          </TableHead>
                          <TableHead className="text-neutral-400">
                            <button
                              onClick={() => toggleSort("role")}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              Role <SortIcon field="role" />
                            </button>
                          </TableHead>
                          <TableHead className="text-neutral-400">
                            <button
                              onClick={() => toggleSort("status")}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              Status <SortIcon field="status" />
                            </button>
                          </TableHead>
                          <TableHead className="text-neutral-400">
                            <button
                              onClick={() => toggleSort("created_at")}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              Created <SortIcon field="created_at" />
                            </button>
                          </TableHead>
                          <TableHead className="text-neutral-400">Last Active</TableHead>
                          <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-neutral-500 py-12"
                            >
                              <Users size={32} className="mx-auto mb-2 opacity-50" />
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow
                              key={user.id}
                              className="border-neutral-800 hover:bg-neutral-800/50 transition-colors"
                            >
                              <TableCell className="text-neutral-200">{user.email}</TableCell>
                              <TableCell>
                                <RoleBadge role={user.role} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={user.status} />
                              </TableCell>
                              <TableCell className="text-neutral-400 text-sm">
                                {user.created_at}
                              </TableCell>
                              <TableCell className="text-neutral-400 text-sm">
                                {timeAgo(user.last_active)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => toggleUserStatus(user.id)}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        user.status === "active"
                                          ? "text-amber-400 hover:bg-amber-500/10"
                                          : "text-emerald-400 hover:bg-emerald-500/10"
                                      }`}
                                    >
                                      {user.status === "active" ? (
                                        <UserX size={16} />
                                      ) : (
                                        <UserCheck size={16} />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="text-xs">
                                      {user.status === "active" ? "Deactivate" : "Activate"} user
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary footer */}
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>
                  Showing {filteredUsers.length} of {users.length} users
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {users.filter((u) => u.status === "active").length} active
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-neutral-500" />
                    {users.filter((u) => u.status === "inactive").length} inactive
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {users.filter((u) => u.status === "suspended").length} suspended
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB: ACTIVITY
                ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="activity" className="space-y-4 mt-6">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Activity size={16} />
                    Activity Feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {activity.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-neutral-800/50 transition-colors group"
                      style={{
                        animationDelay: `${idx * 50}ms`,
                      }}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === "error"
                            ? "bg-red-500/10"
                            : item.type === "api_call"
                            ? "bg-amber-500/10"
                            : item.type === "user_registered"
                            ? "bg-emerald-500/10"
                            : item.type === "ticket_created"
                            ? "bg-blue-500/10"
                            : "bg-cyan-500/10"
                        }`}
                      >
                        <ActivityIcon type={item.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200">{item.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.user && (
                            <span className="text-xs text-neutral-400">@{item.user}</span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] border-neutral-700 text-neutral-500 px-1.5 py-0"
                          >
                            {item.type.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500 shrink-0">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                TAB: SETTINGS
                ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="settings" className="space-y-6 mt-6">
              {/* Feature toggles */}
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Sparkles size={16} />
                    Feature Flags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings
                    .filter((s) => s.category === "feature")
                    .map((setting) => (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-neutral-200">{setting.label}</p>
                          <p className="text-xs text-neutral-500">{setting.description}</p>
                        </div>
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={() => toggleSetting(setting.key)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Security settings */}
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Lock size={16} />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings
                    .filter((s) => s.category === "security")
                    .map((setting) => (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-neutral-200">{setting.label}</p>
                          <p className="text-xs text-neutral-500">{setting.description}</p>
                        </div>
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={() => toggleSetting(setting.key)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Rate limiting */}
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Cpu size={16} />
                    Rate Limiting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-neutral-200">Requests per minute</p>
                        <p className="text-xs text-neutral-500">
                          Maximum API calls allowed per user per minute
                        </p>
                      </div>
                      <span className="text-lg font-mono font-bold text-emerald-400">
                        {rateLimit[0]}
                      </span>
                    </div>
                    <Slider
                      value={rateLimit}
                      onValueChange={setRateLimit}
                      max={5000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-neutral-600">100</span>
                      <span className="text-xs text-neutral-600">5000</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-800">
                    {[
                      { label: "Burst Limit", value: "120", desc: "Short burst allowance" },
                      { label: "Window", value: "60s", desc: "Time window" },
                      { label: "Penalty", value: "30s", desc: "Block duration" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
                      >
                        <p className="text-xs text-neutral-500">{item.label}</p>
                        <p className="text-lg font-mono font-bold text-white mt-0.5">
                          {item.value}
                        </p>
                        <p className="text-xs text-neutral-500">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Bell size={16} />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings
                    .filter((s) => s.category === "notification")
                    .map((setting) => (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-neutral-200">{setting.label}</p>
                          <p className="text-xs text-neutral-500">{setting.description}</p>
                        </div>
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={() => toggleSetting(setting.key)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Danger zone */}
              <Card className="bg-neutral-900 border-red-900/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <Database size={16} />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-neutral-200">Clear All Cache</p>
                      <p className="text-xs text-neutral-500">
                        Remove all cached data immediately
                      </p>
                    </div>
                    <button className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors">
                      Clear Cache
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-neutral-200">Export Audit Log</p>
                      <p className="text-xs text-neutral-500">
                        Download full audit trail as JSON
                      </p>
                    </div>
                    <button className="px-3 py-1.5 text-xs bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors">
                      Export
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
