/**
 * LUQI AI — Notifications Page
 * ==============================
 * Full notification center with filter tabs, real-time WebSocket updates,
 * mark-as-read, settings panel, and empty state.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  Settings,
  CheckCheck,
  Filter,
  Clock,
  AlertTriangle,
  X,
  ChevronRight,
  FileText,
  Zap,
  Droplets,
  Banknote,
  CloudRain,
  GraduationCap,
  Calculator,
  Wallet,
  Circle,
} from "lucide-react";
import useWebSocket from "../hooks/useWebSocket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  icon: string;
  color: string;
  read: boolean;
  created_at: number;
  created_at_iso: string;
  time_ago: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unread_count: number;
}

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText,
  Zap,
  Droplets,
  Banknote,
  CloudRain,
  GraduationCap,
  Calculator,
  Wallet,
  Bell,
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
  orange: { bg: "bg-orange-100", text: "text-orange-600", dot: "bg-orange-500" },
  red: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500" },
  blue: { bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-500" },
  green: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-600", dot: "bg-yellow-500" },
  purple: { bg: "bg-purple-100", text: "text-purple-600", dot: "bg-purple-500" },
  gray: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-500" },
};

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

type FilterTab = "all" | "unread" | "tenders" | "finance" | "weather" | "urgent";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "tenders", label: "Tenders" },
  { key: "finance", label: "Finance" },
  { key: "weather", label: "Weather" },
  { key: "urgent", label: "Urgent" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lastMessage, sendMessage, connected } = useWebSocket();

  // --- State -------------------------------------------------------------

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Fetch notifications -----------------------------------------------

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("user_id", "current-user");
      if (activeFilter === "unread") {
        params.append("unread_only", "true");
      }

      const res = await fetch(`/api/v25/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });

      if (!res.ok) {
        console.warn("Failed to fetch notifications:", res.status);
        return;
      }

      const data: { success: boolean } & NotificationsResponse = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  // --- Fetch unread count (lightweight) ----------------------------------

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/v25/notifications/unread-count?user_id=current-user`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, []);

  // --- Mark read ---------------------------------------------------------

  const markRead = useCallback(
    async (id: string) => {
      setMarkingRead(id);
      try {
        const res = await fetch("/api/v25/notifications/mark-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ notification_id: id }),
        });

        if (res.ok) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      } catch (err) {
        console.error("Error marking read:", err);
      } finally {
        setMarkingRead(null);
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/v25/notifications/mark-all-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ user_id: "current-user" }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  }, []);

  // --- Handle notification click -----------------------------------------

  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      if (!n.read) markRead(n.id);
      if (n.action_url) navigate(n.action_url);
    },
    [markRead, navigate]
  );

  // --- WebSocket real-time updates ---------------------------------------

  useEffect(() => {
    if (!lastMessage) return;

    try {
      const msg = JSON.parse(lastMessage.data);
      if (msg.event === "notification" && msg.data) {
        const incoming: NotificationItem = msg.data;
        setNotifications((prev) => [incoming, ...prev]);
        setUnreadCount((c) => c + 1);
      } else if (msg.event === "unread_count" && msg.data) {
        setUnreadCount(msg.data.unread_count ?? 0);
      }
    } catch {
      // ignore non-JSON messages
    }
  }, [lastMessage]);

  // --- Initial load + polling --------------------------------------------

  useEffect(() => {
    fetchNotifications();

    // Poll every 60s as fallback
    pollRef.current = setInterval(fetchUnreadCount, 60000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // --- Filtered list -----------------------------------------------------

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case "unread":
        return notifications.filter((n) => !n.read);
      case "tenders":
        return notifications.filter((n) => n.type === "tender_deadline");
      case "finance":
        return notifications.filter((n) =>
          ["grant_deadline", "tax_deadline", "sassa_payment"].includes(n.type)
        );
      case "weather":
        return notifications.filter((n) =>
          ["weather_alert", "load_shedding", "water_restriction"].includes(n.type)
        );
      case "urgent":
        return notifications.filter((n) =>
          ["urgent", "high"].includes(n.priority)
        );
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  // --- Render helpers ----------------------------------------------------

  const renderIcon = (n: NotificationItem) => {
    const IconComp = ICON_MAP[n.icon] || Bell;
    const colors = COLOR_CLASSES[n.color] || COLOR_CLASSES.gray;
    return (
      <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <IconComp size={18} className={colors.text} />
      </div>
    );
  };

  // --- JSX ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <BellRing size={22} className="text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            {connected && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Notification settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[65px] z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            <Filter size={14} className="text-gray-400 mr-1 flex-shrink-0" />
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === tab.key
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                {tab.key === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 bg-white/20 text-white text-[10px] px-1.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification List */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No notifications</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {activeFilter === "all"
                ? "You're all caught up! New notifications will appear here."
                : "No notifications match the current filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`group relative flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  n.read
                    ? "bg-white border-gray-100 hover:border-gray-200"
                    : "bg-blue-50/40 border-blue-100 hover:border-blue-200"
                }`}
              >
                {/* Icon */}
                {renderIcon(n)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={`text-sm leading-tight ${
                        n.read ? "font-medium text-gray-700" : "font-semibold text-gray-900"
                      }`}
                    >
                      {n.title}
                    </h4>
                    {!n.read && (
                      <Circle
                        size={8}
                        className="flex-shrink-0 mt-1.5 fill-blue-500 text-blue-500"
                      />
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {n.description}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock size={11} />
                      {n.time_ago}
                    </span>

                    {n.priority === "urgent" && (
                      <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                        <AlertTriangle size={11} />
                        Urgent
                      </span>
                    )}

                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        n.read
                          ? "bg-gray-100 text-gray-500"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {n.type.replace("_", " ")}
                    </span>

                    {markingRead === n.id && (
                      <span className="text-[10px] text-gray-400">Marking...</span>
                    )}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight
                  size={16}
                  className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 mt-3 transition-colors"
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Settings Modal Sub-Component
// ---------------------------------------------------------------------------

const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState({
    push: true,
    email: false,
    sms: false,
    tenders: true,
    finance: true,
    weather: true,
    urgent: true,
  });

  const toggle = (key: string) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings size={18} className="text-gray-500" />
            Notification Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Channels */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Channels
            </h3>
            <div className="space-y-3">
              {[
                { key: "push", label: "Push notifications", desc: "In-app and browser alerts" },
                { key: "email", label: "Email notifications", desc: "Daily digest to your inbox" },
                { key: "sms", label: "SMS alerts", desc: "Critical alerts via text message" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => toggle(item.key)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      settings[item.key as keyof typeof settings] ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settings[item.key as keyof typeof settings]
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Categories
            </h3>
            <div className="space-y-3">
              {[
                { key: "tenders", label: "Tenders & procurement", icon: FileText, color: "text-orange-500" },
                { key: "finance", label: "Finance & grants", icon: Banknote, color: "text-green-500" },
                { key: "weather", label: "Weather & utilities", icon: CloudRain, color: "text-blue-500" },
                { key: "urgent", label: "Urgent alerts only", icon: AlertTriangle, color: "text-red-500" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <item.icon size={16} className={item.color} />
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  </div>
                  <button
                    onClick={() => toggle(item.key)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      settings[item.key as keyof typeof settings] ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settings[item.key as keyof typeof settings]
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
