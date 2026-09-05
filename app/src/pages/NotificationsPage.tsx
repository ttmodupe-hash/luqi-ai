import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  Filter,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Search,
  Settings,
  Zap,
  Shield,
  DollarSign,
  Calendar,
  FileText,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";

/* ───────── Types ───────── */

type NotificationType =
  | "system"
  | "alert"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "task"
  | "message"
  | "update";

type NotificationPriority = "low" | "medium" | "high" | "critical";

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  icon: React.ElementType;
  metadata?: Record<string, unknown>;
}

interface NotificationGroup {
  date: string;
  label: string;
  notifications: Notification[];
}

/* ───────── Icon Mapping ───────── */

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  system: Settings,
  alert: AlertTriangle,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  task: Calendar,
  message: MessageSquare,
  update: Zap,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  system: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  alert: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  info: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  success: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  task: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  message: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  update: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  low: "bg-neutral-700 text-neutral-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

/* ───────── Mock Data ───────── */

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "alert",
    priority: "critical",
    title: "System Maintenance Scheduled",
    message: "LUQI AI will undergo scheduled maintenance on Sunday 2:00 AM SAST. Expected downtime: 15 minutes.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    icon: Settings,
  },
  {
    id: "2",
    type: "task",
    priority: "high",
    title: "New Task Assigned",
    message: "You have been assigned to review the Q4 financial report by Friday.",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
    actionUrl: "/workspace",
    actionLabel: "View Task",
    icon: Calendar,
  },
  {
    id: "3",
    type: "message",
    priority: "medium",
    title: "New Message from Support",
    message: "Your support ticket #4521 has been updated with a response from our team.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
    actionUrl: "/support",
    actionLabel: "View Ticket",
    icon: MessageSquare,
  },
  {
    id: "4",
    type: "success",
    priority: "low",
    title: "Backup Completed",
    message: "Your data backup completed successfully. 2.4 GB synced to cloud storage.",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    read: true,
    icon: CheckCircle2,
  },
  {
    id: "5",
    type: "warning",
    priority: "medium",
    title: "Storage Almost Full",
    message: "You are using 85% of your storage quota. Consider upgrading your plan.",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    read: true,
    actionUrl: "/settings",
    actionLabel: "Manage Storage",
    icon: AlertTriangle,
  },
  {
    id: "6",
    type: "update",
    priority: "low",
    title: "New Feature Available",
    message: "The new AI Brain module is now available in your dashboard. Check it out!",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    read: true,
    actionUrl: "/ai-brain",
    actionLabel: "Try AI Brain",
    icon: Zap,
  },
  {
    id: "7",
    type: "info",
    priority: "low",
    title: "Weekly Report Ready",
    message: "Your weekly productivity report for Dec 8-14 is ready to view.",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
    actionUrl: "/reports",
    actionLabel: "View Report",
    icon: FileText,
  },
  {
    id: "8",
    type: "error",
    priority: "high",
    title: "Payment Failed",
    message: "Your subscription payment was declined. Please update your payment method.",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: false,
    actionUrl: "/billing",
    actionLabel: "Update Payment",
    icon: DollarSign,
  },
  {
    id: "9",
    type: "system",
    priority: "medium",
    title: "Security Alert",
    message: "A new device signed in to your account from Johannesburg, South Africa.",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    read: true,
    actionUrl: "/settings",
    actionLabel: "Review Devices",
    icon: Shield,
  },
  {
    id: "10",
    type: "task",
    priority: "medium",
    title: "Meeting Reminder",
    message: "Team standup meeting in 30 minutes. Join via the link in your calendar.",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: true,
    actionUrl: "/calendar",
    actionLabel: "Join Meeting",
    icon: Users,
  },
];

/* ───────── Helper Functions ───────── */

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
};

const groupByDate = (notifications: Notification[]): NotificationGroup[] => {
  const groups: Record<string, Notification[]> = {};

  notifications.forEach((n) => {
    const dateKey = n.timestamp.toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(n);
  });

  return Object.entries(groups)
    .map(([date, notifs]) => ({
      date,
      label: getDateLabel(new Date(date)),
      notifications: notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const getDateLabel = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" });
};

/* ───────── Component ───────── */

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchApi, loading } = useApi();

  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter === "unread") filtered = filtered.filter((n) => !n.read);
    if (filter === "read") filtered = filtered.filter((n) => n.read);
    if (typeFilter !== "all") filtered = filtered.filter((n) => n.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [notifications, filter, typeFilter, searchQuery]);

  const groupedNotifications = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleAction = useCallback(
    (notification: Notification) => {
      markAsRead(notification.id);
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
      }
    },
    [markAsRead, navigate]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Bell className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Notifications</h1>
              <p className="text-neutral-400 text-sm">
                {unreadCount} unread of {notifications.length} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-neutral-700" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
            <Button variant="outline" size="sm" className="border-neutral-700 text-red-400 hover:text-red-300" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="pl-10 bg-neutral-900 border-neutral-700"
            />
          </div>
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationType | "all")}>
          <SelectTrigger className="w-full md:w-[180px] bg-neutral-900 border-neutral-700">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-700">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="alert">Alerts</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="message">Messages</SelectItem>
            <SelectItem value="update">Updates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-neutral-800">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-neutral-800">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read" className="data-[state=active]:bg-neutral-800">
            Read ({notifications.length - unreadCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-4">
          {groupedNotifications.length === 0 ? (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-12 text-center">
                <BellOff className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
                <p className="text-neutral-400">
                  {searchQuery || typeFilter !== "all"
                    ? "No notifications match your filters."
                    : "You're all caught up!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedNotifications.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-400">{group.label}</span>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                <div className="space-y-2">
                  {group.notifications.map((notification) => {
                    const Icon = notification.icon;
                    const typeColor = TYPE_COLORS[notification.type];
                    const priorityColor = PRIORITY_COLORS[notification.priority];

                    return (
                      <Card
                        key={notification.id}
                        className={`bg-neutral-900 border-neutral-800 transition-all ${
                          !notification.read ? "border-l-4 border-l-blue-500" : "opacity-75"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${typeColor}`}>
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-medium ${!notification.read ? "text-white" : "text-neutral-400"}`}>
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                                <Badge variant="outline" className={`text-xs ${priorityColor}`}>
                                  {notification.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-400 mb-2">{notification.message}</p>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-neutral-500">
                                  {formatTimeAgo(notification.timestamp)}
                                </span>
                                {notification.actionUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-400 hover:text-blue-300 text-xs"
                                    onClick={() => handleAction(notification)}
                                  >
                                    {notification.actionLabel || "View"}
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-neutral-400 hover:text-white"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-neutral-400 hover:text-red-400"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
