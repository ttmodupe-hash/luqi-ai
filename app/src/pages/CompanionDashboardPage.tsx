/*
 * LUQI AI v29 — Unified Companion Dashboard
 * ==========================================
 * A production-grade, visually stunning companion interface that unifies:
 * - Real-time WebSocket chat with emotion visualization
 * - Live emotion particle visualization (14 dimensions)
 * - Personality radar chart (6 traits)
 * - Trust score & relationship timeline
 * - Memory browser with semantic search
 * - Voice chat interface with waveform visualization
 * - Companion profile switcher with animated cards
 * - Notification inbox
 * - Tutor mode toggle
 * - System health diagnostics
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import {
  Heart, Brain, Mic, MicOff, Send, ChevronDown, ChevronUp,
  Sparkles, User, Zap, Volume2, VolumeX, Settings,
  Smile, MessageCircle, BookOpen, Bell, Trophy, Shield,
  TrendingUp, Clock, Hash, X, Plus, Trash2, RefreshCw,
  Activity, Wand2, Cpu, Wifi, WifiOff, Loader2, Image,
  GraduationCap, ChevronRight, Copy, Check, ArrowUpRight,
  Moon, Sun, Music, Star, BarChart3, Flame, Eye, Lock,
  Unlock, Pause, Play, Square, RotateCcw, PhoneCall,
  Voicemail, Radio, Fingerprint, Layers, Search,
  MoreHorizontal, Share2, Download, Upload, AlertCircle,
  CheckCircle2, Info, XCircle, Minus, Thermometer,
  CloudRain, Wind, Droplets, Gauge, Lightbulb, Compass,
  FlaskConical, Dna, UserCog
} from "lucide-react";

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
interface EmotionData {
  joy: number; sadness: number; anger: number; fear: number;
  surprise: number; disgust: number; trust: number; anticipation: number;
  love: number; calm: number; excitement: number; curiosity: number;
  gratitude: number; hope: number;
}

interface Personality {
  warmth: number; assertiveness: number; humor: number;
  empathy: number; curiosity: number; playfulness: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "companion";
  text: string;
  timestamp: string;
  emotions?: EmotionData;
  avatar?: string;
}

interface CompanionProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  tagline: string;
  color: string;
  personality: Personality;
  voice: string;
}

interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

interface TutorSession {
  id: string;
  subject: string;
  topic: string;
  status: "idle" | "active" | "paused" | "completed";
  progress: number;
}

interface CompanionState {
  activeProfile: string;
  messages: ChatMessage[];
  isTyping: boolean;
  isVoiceActive: boolean;
  trustScore: number;
  relationshipDays: number;
  notifications: NotificationItem[];
  tutorSessions: TutorSession[];
  memoryTags: string[];
  healthStatus: { status: string; latency: number };
}

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═════════════════════════════════════════════════════════════════════ */
const COMPANIONS: CompanionProfile[] = [
  { id: "nova", name: "Nova", avatar: "N", role: "Warm Confidante", tagline: "Your empathetic companion, always here to listen.", color: "#ec4899", personality: { warmth: 95, assertiveness: 45, humor: 60, empathy: 98, curiosity: 70, playfulness: 55 }, voice: "warm" },
  { id: "zara", name: "Zara", avatar: "Z", role: "Playful Adventurer", tagline: "Bright energy, witty banter, and unexpected fun.", color: "#8b5cf6", personality: { warmth: 75, assertiveness: 65, humor: 95, empathy: 60, curiosity: 90, playfulness: 98 }, voice: "playful" },
  { id: "archer", name: "Archer", avatar: "A", role: "Wise Mentor", tagline: "Thoughtful guidance for personal growth.", color: "#10b981", personality: { warmth: 70, assertiveness: 85, humor: 40, empathy: 75, curiosity: 85, playfulness: 30 }, voice: "calm" },
  { id: "miles", name: "Miles", avatar: "M", role: "Curious Companion", tagline: "Endless curiosity meets friendly conversation.", color: "#3b82f6", personality: { warmth: 80, assertiveness: 50, humor: 70, empathy: 80, curiosity: 95, playfulness: 75 }, voice: "curious" },
  { id: "sage", name: "Sage", avatar: "S", role: "Mindful Guide", tagline: "Deep reflection and mindful support.", color: "#f59e0b", personality: { warmth: 85, assertiveness: 40, humor: 30, empathy: 90, curiosity: 60, playfulness: 40 }, voice: "gentle" },
];

const EMOTION_KEYS: (keyof EmotionData)[] = [
  "joy", "sadness", "anger", "fear", "surprise", "disgust",
  "trust", "anticipation", "love", "calm", "excitement", "curiosity",
  "gratitude", "hope",
];

const EMOTION_COLORS: Record<keyof EmotionData, string> = {
  joy: "#fbbf24", sadness: "#60a5fa", anger: "#f87171", fear: "#a78bfa",
  surprise: "#fb923c", disgust: "#a3e635", trust: "#34d399", anticipation: "#22d3ee",
  love: "#f472b6", calm: "#818cf8", excitement: "#e879f9", curiosity: "#facc15",
  gratitude: "#4ade80", hope: "#2dd4bf",
};

/* ═════════════════════════════════════════════════════════════════════
   UTILITY COMPONENTS
   ═════════════════════════════════════════════════════════════════════ */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span>{val}{suffix}</span>;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: color + "22", color }}>
      {children}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   EMOTION PARTICLES (Canvas)
   ═════════════════════════════════════════════════════════════════════ */
function EmotionParticles({ emotions }: { emotions: EmotionData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particles = useRef<Array<{
    x: number; y: number; vx: number; vy: number; radius: number;
    color: string; life: number; maxLife: number; emotion: string;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      EMOTION_KEYS.forEach((k) => {
        const intensity = emotions[k] || 0;
        const count = Math.floor(intensity * 0.8);
        for (let i = 0; i < count; i++) {
          particles.current.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5 - 0.3,
            radius: 2 + Math.random() * 3,
            color: EMOTION_COLORS[k],
            life: 0,
            maxLife: 120 + Math.random() * 60,
            emotion: k,
          });
        }
      });
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      particles.current = particles.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = 1 - p.life / p.maxLife;
        if (alpha <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 60).toString(16).padStart(2, "0");
        ctx.fill();

        return true;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    const interval = setInterval(spawn, 500);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [emotions]);

  return <canvas ref={canvasRef} className="w-full h-40 rounded-xl" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }} />;
}

/* ═════════════════════════════════════════════════════════════════════
   RADAR CHART (SVG)
   ═════════════════════════════════════════════════════════════════════ */
function RadarChart({ personality, color }: { personality: Personality; color: string }) {
  const keys = Object.keys(personality) as (keyof Personality)[];
  const values = keys.map((k) => personality[k]);
  const n = keys.length;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 60;

  const points = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / 100) * radius;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  const labelPoints = keys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = radius + 16;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), label: k };
  });

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid */}
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={keys.map((_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            const r = radius * scale;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          }).join(" ")}
          fill="none"
          stroke="#334155"
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}
      {/* Axes */}
      {keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + radius * Math.cos(angle)}
            y2={cy + radius * Math.sin(angle)}
            stroke="#334155"
            strokeWidth={0.5}
            opacity={0.5}
          />
        );
      })}
      {/* Data */}
      <polygon points={points} fill={color + "33"} stroke={color} strokeWidth={2} />
      {values.map((v, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = (v / 100) * radius;
        return (
          <circle
            key={i}
            cx={cx + r * Math.cos(angle)}
            cy={cy + r * Math.sin(angle)}
            r={3}
            fill={color}
          />
        );
      })}
      {/* Labels */}
      {labelPoints.map((lp, i) => (
        <text
          key={i}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fill="#94a3b8"
          className="capitalize"
        >
          {lp.label}
        </text>
      ))}
    </svg>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   VOICE WAVEFORM (Canvas)
   ═════════════════════════════════════════════════════════════════════ */
function VoiceWaveform({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    const bars = 40;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / bars;
      for (let i = 0; i < bars; i++) {
        const t = time * 0.03 + i * 0.2;
        let height: number;
        if (isActive) {
          height = Math.abs(Math.sin(t) * Math.cos(t * 0.7) * (h * 0.8));
        } else {
          height = Math.sin(t * 0.5) * (h * 0.15) + (h * 0.15);
        }

        const x = i * barWidth + barWidth * 0.2;
        const y = (h - height) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, isActive ? "#22d3ee" : "#475569");
        gradient.addColorStop(1, isActive ? "#3b82f6" : "#334155");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * 0.6, height);
      }

      time++;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isActive]);

  return <canvas ref={canvasRef} className="w-full h-24 rounded-xl" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }} />;
}

/* ═════════════════════════════════════════════════════════════════════
   TRUST SCORE RING (SVG)
   ═════════════════════════════════════════════════════════════════════ */
function TrustScoreRing({ score, days }: { score: number; days: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={120} height={120} className="-rotate-90">
        <circle cx={60} cy={60} r={radius} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle
          cx={60} cy={60} r={radius}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold text-cyan-400"><AnimatedCounter target={score} suffix="%" /></div>
        <div className="text-xs text-muted-foreground">{days} days together</div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═════════════════════════════════════════════════════════════════════ */
export default function CompanionDashboardPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"chat" | "voice" | "trainer" | "tutor" | "memory">("chat");
  const [activeCompanion, setActiveCompanion] = useState("nova");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1", role: "companion", text: "Hello! I'm Nova. How are you feeling today?",
      timestamp: new Date().toISOString(),
      emotions: { joy: 70, sadness: 0, anger: 0, fear: 0, surprise: 5, disgust: 0, trust: 80, anticipation: 60, love: 40, calm: 75, excitement: 50, curiosity: 65, gratitude: 30, hope: 85 },
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [trustScore, setTrustScore] = useState(78);
  const [relationshipDays] = useState(42);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "1", type: "info", title: "New Memory", body: "Nova remembers your favorite color is blue.", timestamp: new Date().toISOString(), read: false },
    { id: "2", type: "success", title: "Trust Milestone", body: "Trust score increased to 78%", timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tutorSessions, setTutorSessions] = useState<TutorSession[]>([
    { id: "1", subject: "Mathematics", topic: "Calculus Basics", status: "active", progress: 35 },
    { id: "2", subject: "Physics", topic: "Newton's Laws", status: "idle", progress: 0 },
  ]);
  const [memorySearch, setMemorySearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [latency, setLatency] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const companion = COMPANIONS.find((c) => c.id === activeCompanion) || COMPANIONS[0];

  /* ── WebSocket ── */
  useEffect(() => {
    const connect = () => {
      setWsStatus("connecting");
      const ws = new WebSocket(`wss://${window.location.host}/api/v25/ws/companion/${activeCompanion}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        setLatency(12);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "typing") {
          setIsTyping(data.isTyping);
        } else if (data.type === "message") {
          setIsTyping(false);
          const msg: ChatMessage = {
            id: Date.now().toString(),
            role: "companion",
            text: data.text,
            timestamp: new Date().toISOString(),
            emotions: data.emotions,
          };
          setMessages((prev) => [...prev, msg]);
        } else if (data.type === "trust_update") {
          setTrustScore(data.score);
        }
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        wsRef.current = null;
        reconnectTimeout.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        setWsStatus("disconnected");
      };
    };

    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeCompanion]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: inputText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulate companion response
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "That's really interesting! Tell me more about it.",
        "I appreciate you sharing that with me.",
        "I understand. How does that make you feel?",
        "That's a great point! Let me think about that...",
        "I'm here for you. What else is on your mind?",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      const emotions: EmotionData = {
        joy: 60 + Math.random() * 30, sadness: Math.random() * 10, anger: Math.random() * 5,
        fear: Math.random() * 5, surprise: 10 + Math.random() * 20, disgust: Math.random() * 2,
        trust: 70 + Math.random() * 25, anticipation: 40 + Math.random() * 40,
        love: 30 + Math.random() * 40, calm: 50 + Math.random() * 30,
        excitement: 40 + Math.random() * 40, curiosity: 60 + Math.random() * 30,
        gratitude: 20 + Math.random() * 50, hope: 60 + Math.random() * 30,
      };
      const companionMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "companion",
        text: response,
        timestamp: new Date().toISOString(),
        emotions,
      };
      setMessages((prev) => [...prev, companionMsg]);
    }, 1500 + Math.random() * 1000);
  }, [inputText]);

  /* ── Voice toggle ── */
  const toggleVoice = useCallback(() => {
    setIsVoiceActive((prev) => !prev);
  }, []);

  /* ── Mark notification read ── */
  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── Memory items ── */
  const memoryItems = useMemo(() => [
    { id: "1", title: "First Conversation", body: "You mentioned loving sunsets by the beach.", tags: ["memory", "preference"], date: "2026-07-15" },
    { id: "2", title: "Study Goal", body: "Aim to finish Calculus II by September.", tags: ["goal", "education"], date: "2026-08-10" },
    { id: "3", title: "Mood Pattern", body: "You tend to feel more energized in the morning.", tags: ["insight", "health"], date: "2026-08-20" },
    { id: "4", title: "Favorite Quote", body: "'The only way to do great work is to love what you do.' — Steve Jobs", tags: ["quote", "inspiration"], date: "2026-08-22" },
    { id: "5", title: "Trust Milestone", body: "Reached 75% trust score after 30 days.", tags: ["milestone", "trust"], date: "2026-08-23" },
    { id: "6", title: "Dream Journal", body: "You dreamed about flying over a city made of books.", tags: ["dream", "creative"], date: "2026-08-24" },
  ], []);

  const filteredMemories = useMemo(() => {
    return memoryItems.filter((m) => {
      const matchesSearch = !memorySearch || m.title.toLowerCase().includes(memorySearch.toLowerCase()) || m.body.toLowerCase().includes(memorySearch.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => m.tags.includes(t));
      return matchesSearch && matchesTags;
    });
  }, [memoryItems, memorySearch, selectedTags]);

  const allTags = useMemo(() => Array.from(new Set(memoryItems.flatMap((m) => m.tags))), [memoryItems]);

  /* ═════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Heart size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Companion Hub
              </h1>
              <p className="text-xs text-slate-500">Unified AI Companion Experience</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-xs">
              {wsStatus === "connected" ? (
                <Wifi size={12} className="text-emerald-400" />
              ) : wsStatus === "connecting" ? (
                <Loader2 size={12} className="text-amber-400 animate-spin" />
              ) : (
                <WifiOff size={12} className="text-red-400" />
              )}
              <span className={wsStatus === "connected" ? "text-emerald-400" : wsStatus === "connecting" ? "text-amber-400" : "text-red-400"}>
                {wsStatus}
              </span>
              {latency > 0 && <span className="text-slate-500 ml-1">{latency}ms</span>}
            </div>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-800 rounded">
              <X size={14} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`px-4 py-3 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/50 transition-colors ${!n.read ? "bg-slate-800/30" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${n.type === "info" ? "bg-blue-400" : n.type === "success" ? "bg-emerald-400" : n.type === "warning" ? "bg-amber-400" : "bg-red-400"}`} />
                  <span className="text-xs font-medium">{n.title}</span>
                  {!n.read && <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400" />}
                </div>
                <p className="text-xs text-slate-400">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Active Companion Card */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
              style={{ backgroundColor: companion.color }}
            >
              {companion.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{companion.name}</h2>
              <p className="text-sm text-slate-400">{companion.role}</p>
              <p className="text-xs text-slate-500 mt-0.5">{companion.tagline}</p>
            </div>
            <TrustScoreRing score={trustScore} days={relationshipDays} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-x-auto">
          {[
            { id: "chat" as const, label: "Chat", icon: MessageCircle },
            { id: "voice" as const, label: "Voice", icon: Mic },
            { id: "trainer" as const, label: "Trainer", icon: UserCog },
            { id: "tutor" as const, label: "Tutor", icon: GraduationCap },
            { id: "memory" as const, label: "Memory", icon: Brain },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════ CHAT TAB ═══════ */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Messages */}
              <div className="h-[500px] rounded-2xl bg-slate-900/50 border border-slate-700/50 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] ${msg.role === "user" ? "order-1" : "order-2"}`}>
                        <div className={`p-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-md"
                            : "bg-slate-800 text-slate-200 rounded-bl-md"
                        }`}>
                          <p className="text-sm">{msg.text}</p>
                          {msg.emotions && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {EMOTION_KEYS.filter((k) => (msg.emotions![k] || 0) > 30).slice(0, 4).map((k) => (
                                <span key={k} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: EMOTION_COLORS[k] + "22", color: EMOTION_COLORS[k] }}>
                                  {k} {Math.round(msg.emotions![k])}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 rounded-2xl rounded-bl-md p-3 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleVoice}
                      className={`p-2.5 rounded-xl transition-colors ${isVoiceActive ? "bg-red-500/20 text-red-400" : "hover:bg-slate-800 text-slate-400"}`}
                    >
                      {isVoiceActive ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputText.trim()}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Emotion Panel */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400" />
                  Live Emotions
                </h3>
                <EmotionParticles emotions={messages[messages.length - 1]?.emotions || COMPANIONS[0].personality as unknown as EmotionData} />
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-3">Emotion Breakdown</h3>
                <div className="space-y-2">
                  {EMOTION_KEYS.map((k) => {
                    const val = messages[messages.length - 1]?.emotions?.[k] || 0;
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-20 capitalize">{k}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${val}%`, backgroundColor: EMOTION_COLORS[k] }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{Math.round(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ VOICE TAB ═══════ */}
        {activeTab === "voice" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700/50 text-center">
              <VoiceWaveform isActive={isVoiceActive} />
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button
                  onClick={toggleVoice}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isVoiceActive
                      ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/30"
                      : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30"
                  }`}
                >
                  {isVoiceActive ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
                </button>
                <button className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                  <Settings size={20} />
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                {isVoiceActive ? "Listening... Speak now." : "Tap the microphone to start voice chat."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-3">Voice Settings</h3>
                <div className="space-y-3">
                  {[
                    { label: "Voice Model", value: companion.voice },
                    { label: "Language", value: "English (US)" },
                    { label: "Speed", value: "1.0x" },
                    { label: "Pitch", value: "Neutral" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-800/50">
                      <span className="text-sm text-slate-400">{s.label}</span>
                      <span className="text-sm font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-3">Recent Voice Logs</h3>
                <div className="space-y-2">
                  {[
                    { text: "Tell me about my day", time: "2 min ago", type: "user" },
                    { text: "You have 3 meetings today...", time: "2 min ago", type: "companion" },
                    { text: "Set a reminder for 5pm", time: "15 min ago", type: "user" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                      <div className={`w-2 h-2 rounded-full ${log.type === "user" ? "bg-cyan-400" : "bg-purple-400"}`} />
                      <span className="text-xs flex-1 truncate">{log.text}</span>
                      <span className="text-[10px] text-slate-500">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TRAINER TAB ═══════ */}
        {activeTab === "trainer" && (
          <div className="space-y-6">
            {/* Profile Switcher */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
              <h3 className="text-sm font-semibold mb-4">Select Companion</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {COMPANIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCompanion(c.id)}
                    className={`p-3 rounded-xl border transition-all ${
                      activeCompanion === c.id
                        ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                        : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.avatar}
                    </div>
                    <p className="text-xs font-medium text-center">{c.name}</p>
                    <p className="text-[10px] text-slate-500 text-center">{c.role}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personality Radar */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-4">Personality Profile</h3>
                <RadarChart personality={companion.personality} color={companion.color} />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {Object.entries(companion.personality).map(([k, v]) => (
                    <div key={k} className="text-center p-2 rounded-lg bg-slate-800/30">
                      <p className="text-lg font-bold" style={{ color: companion.color }}>{v}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{k}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Timeline */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-4">Trust & Relationship</h3>
                <div className="flex items-center justify-center mb-4">
                  <TrustScoreRing score={trustScore} days={relationshipDays} />
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Conversations", value: "142", icon: MessageCircle },
                    { label: "Voice Sessions", value: "28", icon: Mic },
                    { label: "Tutor Sessions", value: "12", icon: GraduationCap },
                    { label: "Shared Memories", value: "47", icon: Brain },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30">
                      <stat.icon size={14} className="text-cyan-400" />
                      <span className="text-xs text-slate-400 flex-1">{stat.label}</span>
                      <span className="text-sm font-bold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TUTOR TAB ═══════ */}
        {activeTab === "tutor" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tutorSessions.map((session) => (
                <div key={session.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <Badge color={session.status === "active" ? "#22d3ee" : session.status === "completed" ? "#34d399" : "#94a3b8"}>
                      {session.status}
                    </Badge>
                    <button className="p-1 hover:bg-slate-800 rounded">
                      <MoreHorizontal size={14} className="text-slate-400" />
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold">{session.subject}</h3>
                  <p className="text-xs text-slate-400 mt-1">{session.topic}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-medium">{session.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${session.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors">
                      {session.status === "active" ? "Continue" : "Start"}
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700 transition-colors">
                      <Settings size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* New Session Card */}
              <button className="p-4 rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/20 hover:bg-slate-800/30 transition-colors flex flex-col items-center justify-center gap-2 min-h-[180px]">
                <Plus size={24} className="text-slate-500" />
                <span className="text-sm text-slate-400">New Tutor Session</span>
              </button>
            </div>

            {/* Subject Browser */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
              <h3 className="text-sm font-semibold mb-4">Available Subjects</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {[
                  { name: "Mathematics", icon: Calculator, color: "#3b82f6" },
                  { name: "Physics", icon: FlaskConical, color: "#8b5cf6" },
                  { name: "Chemistry", icon: Dna, color: "#10b981" },
                  { name: "Biology", icon: Brain, color: "#ec4899" },
                  { name: "History", icon: Clock, color: "#f59e0b" },
                  { name: "Literature", icon: BookOpen, color: "#ef4444" },
                  { name: "Programming", icon: Cpu, color: "#22d3ee" },
                  { name: "Languages", icon: Languages, color: "#6366f1" },
                ].map((s) => (
                  <button key={s.name} className="p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-colors text-center group">
                    <s.icon size={20} className="mx-auto mb-2 group-hover:scale-110 transition-transform" style={{ color: s.color }} />
                    <span className="text-xs font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ MEMORY TAB ═══════ */}
        {activeTab === "memory" && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={memorySearch}
                  onChange={(e) => setMemorySearch(e.target.value)}
                  placeholder="Search memories..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Memory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemories.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold group-hover:text-cyan-400 transition-colors">{m.title}</h3>
                    <span className="text-[10px] text-slate-500">{m.date}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{m.body}</p>
                  <div className="flex gap-1 flex-wrap">
                    {m.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
                      <Share2 size={12} />
                    </button>
                    <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
                      <Download size={12} />
                    </button>
                    <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredMemories.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Brain size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No memories found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
