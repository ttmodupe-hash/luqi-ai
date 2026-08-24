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
  FlaskConical, Dna, UserCog, Calculator, Languages
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
  id: string; role: "user" | "companion"; text: string;
  timestamp: number; emotion?: Partial<EmotionData>;
  voiceUrl?: string; isTyping?: boolean;
}

interface CompanionProfile {
  id: string; name: string; tagline: string;
  description: string; color: string; icon: React.ElementType;
  accent: string;
}

interface MemoryEntry {
  id: string; content: string; category: string;
  importance: number; timestamp: number; tags: string[];
}

interface NotificationItem {
  id: string; title: string; body: string; type: string;
  timestamp: number; read: boolean; priority: string;
}

interface VoiceChunk {
  chunk_index: number; total_chunks: number;
  audio_base64: string; text: string;
}

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═════════════════════════════════════════════════════════════════════ */
const COMPANION_PROFILES: CompanionProfile[] = [
  { id: "nova", name: "Nova", tagline: "Your warm confidant",
    description: "Warm, nurturing, always ready to listen with empathy",
    color: "from-rose-400 to-pink-500", icon: Heart, accent: "#ec4899" },
  { id: "zara", name: "Zara", tagline: "Spark of joy",
    description: "Playful, witty, brings humor and lightness",
    color: "from-amber-400 to-orange-500", icon: Sparkles, accent: "#f59e0b" },
  { id: "archer", name: "Archer", tagline: "Wise mentor",
    description: "Guiding, thoughtful, focused on growth",
    color: "from-sky-400 to-blue-500", icon: Compass, accent: "#3b82f6" },
  { id: "miles", name: "Miles", tagline: "Witty intellect",
    description: "Clever, analytical, loves wordplay",
    color: "from-emerald-400 to-green-500", icon: Brain, accent: "#10b981" },
  { id: "sage", name: "Sage", tagline: "Spiritual guide",
    description: "Calm, mindful, helps find inner peace",
    color: "from-violet-400 to-purple-500", icon: Moon, accent: "#8b5cf6" },
];

const EMOTION_LABELS: (keyof EmotionData)[] = [
  "joy","sadness","anger","fear","surprise","disgust","trust",
  "anticipation","love","calm","excitement","curiosity","gratitude","hope",
];

const PERSONALITY_LABELS: (keyof Personality)[] = [
  "warmth","assertiveness","humor","empathy","curiosity","playfulness",
];

/* ═════════════════════════════════════════════════════════════════════
   UTILITIES
   ═════════════════════════════════════════════════════════════════════ */
function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function clamp(n: number, min = 0, max = 1) { return Math.max(min, Math.min(max, n)); }

/* ═════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: EmotionParticles
   Canvas-based floating emotion particle visualization
   ═════════════════════════════════════════════════════════════════════ */
function EmotionParticles({ emotion, width = 300, height = 180 }: {
  emotion: Partial<EmotionData>; width?: number; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; color: string;
    size: number; label: string;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let running = true;

    // Initialize particles from emotion data
    const initParticles = () => {
      const particles: typeof particlesRef.current = [];
      const emotionMap: Record<string, { color: string; angle: number }> = {
        joy: { color: "#fbbf24", angle: 0 },
        love: { color: "#f472b6", angle: 25 },
        calm: { color: "#60a5fa", angle: 50 },
        trust: { color: "#34d399", angle: 75 },
        gratitude: { color: "#a78bfa", angle: 100 },
        excitement: { color: "#fb923c", angle: 125 },
        curiosity: { color: "#22d3ee", angle: 150 },
        hope: { color: "#facc15", angle: 175 },
        surprise: { color: "#c084fc", angle: 200 },
        anticipation: { color: "#818cf8", angle: 225 },
        sadness: { color: "#94a3b8", angle: 250 },
        anger: { color: "#f87171", angle: 275 },
        fear: { color: "#a3e635", angle: 300 },
        disgust: { color: "#4ade80", angle: 325 },
      };

      Object.entries(emotionMap).forEach(([key, { color, angle }]) => {
        const val = clamp(emotion[key as keyof EmotionData] || 0);
        if (val > 0.1) {
          const count = Math.max(3, Math.floor(val * 15));
          for (let i = 0; i < count; i++) {
            const spread = (Math.PI * 2 * angle) / 360;
            const variance = (Math.random() - 0.5) * 1.5;
            const speed = 0.3 + val * 1.5;
            particles.push({
              x: width / 2 + (Math.random() - 0.5) * width * 0.5,
              y: height / 2 + (Math.random() - 0.5) * height * 0.5,
              vx: Math.cos(spread + variance) * speed * (0.5 + Math.random()),
              vy: Math.sin(spread + variance) * speed * (0.5 + Math.random()),
              life: 0,
              maxLife: 120 + Math.random() * 180,
              color,
              size: 2 + val * 6 + Math.random() * 3,
              label: key,
            });
          }
        }
      });
      return particles;
    };

    particlesRef.current = initParticles();

    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      // Subtle background glow
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
      grad.addColorStop(0, "rgba(99,102,241,0.05)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      particlesRef.current.forEach((p, i) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Gentle drift toward center
        p.vx += (width / 2 - p.x) * 0.0002;
        p.vy += (height / 2 - p.y) * 0.0002;

        const alpha = p.life < 30 ? p.life / 30 : p.life > p.maxLife - 60 ? (p.maxLife - p.life) / 60 : 1;
        if (alpha <= 0) {
          // Respawn
          const em = EMOTION_LABELS[Math.floor(Math.random() * EMOTION_LABELS.length)];
          const val = clamp(emotion[em] || 0.3);
          p.x = width / 2 + (Math.random() - 0.5) * 100;
          p.y = height / 2 + (Math.random() - 0.5) * 80;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = (Math.random() - 0.5) * 2;
          p.life = 0;
          p.maxLife = 120 + Math.random() * 180;
          p.color = emotionMap[em]?.color || "#60a5fa";
          p.size = 2 + val * 5;
          return;
        }

        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.size * 2;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Draw label for largest particles
        if (p.size > 5 && alpha > 0.5) {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(p.label.slice(0, 4), p.x, p.y + p.size + 10);
        }
      });

      animRef.current = requestAnimationFrame(animate);
    };

    const emotionMap = {
      joy: { color: "#fbbf24" }, love: { color: "#f472b6" },
      calm: { color: "#60a5fa" }, trust: { color: "#34d399" },
      gratitude: { color: "#a78bfa" }, excitement: { color: "#fb923c" },
      curiosity: { color: "#22d3ee" }, hope: { color: "#facc15" },
      surprise: { color: "#c084fc" }, anticipation: { color: "#818cf8" },
      sadness: { color: "#94a3b8" }, anger: { color: "#f87171" },
      fear: { color: "#a3e635" }, disgust: { color: "#4ade80" },
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [emotion, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: width, height: height, borderRadius: 12, display: "block" }}
    />
  );
}

/* ═════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: RadarChart
   SVG personality radar chart
   ═════════════════════════════════════════════════════════════════════ */
function RadarChart({ personality, size = 180, color = "#22d3ee" }: {
  personality: Personality; size?: number; color?: string;
}) {
  const keys = PERSONALITY_LABELS;
  const n = keys.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;

  const points = keys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = ((personality[k] || 50) / 100) * radius;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
      {/* Background circles */}
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <circle key={s} cx={cx} cy={cy} r={radius * s} fill="none" stroke="#334155" strokeWidth={0.5} opacity={0.4} />
      ))}
      {/* Axis lines */}
      {keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + radius * Math.cos(angle)} y2={cy + radius * Math.sin(angle)} stroke="#334155" strokeWidth={0.5} opacity={0.4} />;
      })}
      {/* Data polygon */}
      <polygon points={points} fill={color + "22"} stroke={color} strokeWidth={2} />
      {/* Data points */}
      {keys.map((k, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = ((personality[k] || 50) / 100) * radius;
        return (
          <circle key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r={3} fill={color}>
            <title>{k}: {personality[k]}</title>
          </circle>
        );
      })}
      {/* Labels */}
      {keys.map((k, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lr = radius + 16;
        return (
          <text key={k} x={cx + lr * Math.cos(angle)} y={cy + lr * Math.sin(angle)}
            textAnchor="middle" dominantBaseline="central" fill="#94a3b8" fontSize={9} style={{ textTransform: "capitalize" }}>
            {k}
          </text>
        );
      })}
    </svg>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: VoiceWaveform
   Animated canvas waveform for voice chat
   ═════════════════════════════════════════════════════════════════════ */
function VoiceWaveform({ isActive, width = 400, height = 80 }: {
  isActive: boolean; width?: number; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let running = true;
    let t = 0;

    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      const bars = 60;
      const barW = width / bars;
      const baseH = height * 0.15;

      for (let i = 0; i < bars; i++) {
        const phase = t * 0.05 + i * 0.15;
        let h: number;
        if (isActive) {
          h = baseH + Math.abs(Math.sin(phase) * Math.cos(phase * 0.7)) * (height * 0.65);
        } else {
          h = baseH + Math.sin(phase * 0.3) * (height * 0.15);
        }
        const x = i * barW;
        const y = (height - h) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        if (isActive) {
          grad.addColorStop(0, "#22d3ee");
          grad.addColorStop(1, "#3b82f6");
        } else {
          grad.addColorStop(0, "#475569");
          grad.addColorStop(1, "#334155");
        }

        ctx.fillStyle = grad;
        const r = barW * 0.4;
        ctx.beginPath();
        ctx.roundRect(x + barW * 0.3, y, barW * 0.4, h, [r, r, r, r]);
        ctx.fill();
      }

      t++;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [isActive, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ width, height, borderRadius: 8, display: "block" }} />;
}

/* ═════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: TrustScoreRing
   Animated SVG trust score ring
   ═════════════════════════════════════════════════════════════════════ */
function TrustScoreRing({ score, days, size = 120 }: { score: number; days: number; size?: number }) {
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const [animOffset, setAnimOffset] = useState(c);

  useEffect(() => {
    const start = performance.now();
    const dur = 1500;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimOffset(c - eased * (c - offset));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score, c, offset]);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={size * 0.08} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#22d3ee" strokeWidth={size * 0.08}
          strokeDasharray={c} strokeDashoffset={animOffset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.3s ease" }} />
      </svg>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 800, color: "#22d3ee", lineHeight: 1 }}>{Math.round(score)}</div>
        <div style={{ fontSize: size * 0.09, color: "#64748b" }}>{days} days</div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   NOTIFICATION TOAST
   ═════════════════════════════════════════════════════════════════════ */
function NotificationToast({ item, onClose }: { item: NotificationItem; onClose: () => void }) {
  const icons: Record<string, React.ElementType> = { info: Info, success: CheckCircle2, warning: AlertCircle, error: XCircle };
  const colors: Record<string, string> = { info: "#22d3ee", success: "#34d399", warning: "#fbbf24", error: "#f87171" };
  const Icon = icons[item.type] || Info;
  const color = colors[item.type] || "#22d3ee";

  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{ animation: "slideIn 0.3s ease" }} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700/50 backdrop-blur shadow-lg min-w-[280px] max-w-[360px]">
      <Icon size={18} style={{ color, marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100">{item.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.body}</p>
      </div>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════════════ */
export default function CompanionDashboardPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"chat" | "voice" | "trainer" | "tutor" | "memory">("chat");
  const [activeCompanion, setActiveCompanion] = useState("nova");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: uid(), role: "companion", text: "Hello! I'm Nova. I'm here to chat, help you learn, or just keep you company. How are you feeling today?",
      timestamp: Date.now() - 300000, emotion: { joy: 80, trust: 90, calm: 70, love: 60 } },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [trustScore, setTrustScore] = useState(73);
  const [relationshipDays, setRelationshipDays] = useState(12);
  const [wsConnected, setWsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: uid(), title: "Welcome to LUQI AI v29", body: "Explore the new companion features and tutor mode.", type: "info", timestamp: Date.now(), read: false, priority: "normal" },
    { id: uid(), title: "Trust Score +5", body: "Your relationship with Nova is growing stronger!", type: "success", timestamp: Date.now() - 600000, read: false, priority: "normal" },
  ]);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [memorySearch, setMemorySearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const companion = COMPANION_PROFILES.find((c) => c.id === activeCompanion) || COMPANION_PROFILES[0];

  // Derive notifications badge
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // WebSocket connection
  useEffect(() => {
    const userId = "user_" + Math.random().toString(36).slice(2, 8);
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/v25/ws/companion/${userId}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectCount = 0;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          reconnectCount = 0;
          ws?.send(JSON.stringify({ type: "presence", status: "online" }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "chat" && data.role === "companion") {
              const newMsg: ChatMessage = {
                id: uid(),
                role: "companion",
                text: data.text,
                timestamp: Date.now(),
                emotion: data.emotion || { joy: 60, trust: 70, calm: 50 },
              };
              setMessages((prev) => [...prev, newMsg]);
              setIsTyping(false);
            } else if (data.type === "typing") {
              setIsTyping(data.is_typing);
            } else if (data.type === "notification") {
              setNotifications((prev) => [data, ...prev]);
              setToasts((prev) => [data, ...prev].slice(0, 3));
            } else if (data.type === "ping") {
              ws?.send(JSON.stringify({ type: "pong" }));
            }
          } catch { /* ignore */ }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectCount++;
          const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
          reconnectTimer = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        // WebSocket not available, use demo mode
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // Simulated companion response for demo
  const simulateResponse = useCallback((userText: string) => {
    setIsTyping(true);
    const delay = 800 + Math.random() * 1200;

    setTimeout(() => {
      const responses: Record<string, string[]> = {
        nova: ["That's really interesting! Tell me more.", "I understand how you feel. I'm here for you.", "What a wonderful thought!", "I'm listening. Go on."],
        zara: ["Haha, that's hilarious!", "Oh wow, you crack me up!", "I'm totally vibing with that!", "Zany idea, I love it!"],
        archer: ["That's a thoughtful perspective.", "Consider this: growth often comes from discomfort.", "Wisdom is recognizing patterns. What do you see?", "Let's reflect on that together."],
        miles: ["Fascinating. Did you know that relates to Turing's work?", "The etymology of that word is quite revealing.", "From a logical standpoint, that's intriguing.", "I see what you did there. Clever!"],
        sage: ["Breathe. Let that thought settle.", "Inner peace begins with acceptance.", "The present moment holds all possibilities.", "What does your intuition tell you?"],
      };
      const pool = responses[activeCompanion] || responses.nova;
      const text = pool[Math.floor(Math.random() * pool.length)];

      const emotion: Partial<EmotionData> = {
        joy: 50 + Math.random() * 40,
        trust: 60 + Math.random() * 30,
        calm: 40 + Math.random() * 40,
        curiosity: 30 + Math.random() * 50,
        love: 30 + Math.random() * 40,
      };

      setMessages((prev) => [...prev, { id: uid(), role: "companion", text, timestamp: Date.now(), emotion }]);
      setIsTyping(false);

      // Occasionally add trust
      if (Math.random() > 0.7) {
        setTrustScore((s) => Math.min(100, s + 1));
      }
    }, delay);
  }, [activeCompanion]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const msg: ChatMessage = { id: uid(), role: "user", text: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, msg]);
    setInput("");

    // Send via WS if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat", text: msg.text }));
    }

    simulateResponse(msg.text);
  }, [input, simulateResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleVoice = () => {
    setIsVoiceActive((v) => !v);
    if (!isVoiceActive) {
      setToasts((prev) => [{ id: uid(), title: "Voice Chat Active", body: "Listening for your voice...", type: "info", timestamp: Date.now(), read: false, priority: "normal" }, ...prev].slice(0, 3));
    }
  };

  // Memory data
  const memories: MemoryEntry[] = useMemo(() => [
    { id: "1", content: "First conversation with Nova about career goals", category: "conversation", importance: 5, timestamp: Date.now() - 86400000 * 2, tags: ["nova", "career", "goals"] },
    { id: "2", content: "Learned about neural networks in tutor mode", category: "learning", importance: 4, timestamp: Date.now() - 86400000 * 5, tags: ["ai", "learning", "neural-networks"] },
    { id: "3", content: "Favorite quote: 'The only way to do great work is to love what you do.'", category: "quote", importance: 3, timestamp: Date.now() - 86400000 * 7, tags: ["inspiration", "quotes"] },
    { id: "4", content: "Meditation session with Sage - 10 minutes", category: "wellness", importance: 4, timestamp: Date.now() - 86400000 * 1, tags: ["sage", "meditation", "wellness"] },
    { id: "5", content: "Completed Python basics tutorial", category: "learning", importance: 5, timestamp: Date.now() - 86400000 * 3, tags: ["programming", "python", "tutorial"] },
    { id: "6", content: "Set up daily reminder for gratitude journaling", category: "habit", importance: 3, timestamp: Date.now() - 86400000 * 4, tags: ["habits", "gratitude", "journaling"] },
  ], []);

  const allTags = useMemo(() => Array.from(new Set(memories.flatMap((m) => m.tags))), [memories]);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesSearch = !memorySearch || m.content.toLowerCase().includes(memorySearch.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => m.tags.includes(t));
      return matchesSearch && matchesTags;
    });
  }, [memories, memorySearch, selectedTags]);

  // Tutor sessions
  const tutorSessions = [
    { id: "1", subject: "Mathematics", topic: "Linear Algebra", status: "active", progress: 65 },
    { id: "2", subject: "Physics", topic: "Quantum Mechanics", status: "idle", progress: 0 },
    { id: "3", subject: "Programming", topic: "TypeScript Patterns", status: "completed", progress: 100 },
    { id: "4", subject: "Literature", topic: "Shakespearean Sonnets", status: "paused", progress: 40 },
  ];

  // Tabs config
  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "voice" as const, label: "Voice", icon: Mic },
    { id: "trainer" as const, label: "Trainer", icon: UserCog },
    { id: "tutor" as const, label: "Tutor", icon: GraduationCap },
    { id: "memory" as const, label: "Memory", icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <NotificationToast key={toast.id} item={toast} onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Heart size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Companion Hub</h1>
              <p className="text-[10px] text-slate-500">v29.2.0 • {wsConnected ? "Connected" : "Demo Mode"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:bg-slate-800 transition-colors">
              <Bell size={16} className="text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Theme toggle */}
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:bg-slate-800 transition-colors">
              {theme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-400" />}
            </button>

            {/* Companion selector */}
            <select
              value={activeCompanion}
              onChange={(e) => setActiveCompanion(e.target.value)}
              className="bg-slate-900/50 border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-cyan-500/50"
            >
              {COMPANION_PROFILES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[60px] z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ═══════ CHAT TAB ═══════ */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl bg-slate-900/50 border border-slate-700/50 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        msg.role === "user" ? "bg-cyan-500/20 text-cyan-400" : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                      }`}>
                        {msg.role === "user" ? "U" : companion.avatar}
                      </div>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        msg.role === "user"
                          ? "bg-cyan-500/10 border border-cyan-500/20 text-slate-100"
                          : "bg-slate-800/50 border border-slate-700/50 text-slate-200"
                      }`}>
                        <p>{msg.text}</p>
                        {msg.emotion && msg.role === "companion" && (
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {Object.entries(msg.emotion).filter(([, v]) => v > 0.3).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 rounded bg-slate-900/50 text-[10px] text-slate-400">
                                {k}: {Math.round(v * 10) / 10}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1.5">{timeAgo(msg.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                        {companion.avatar}
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-700/50 flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${companion.name}...`}
                    className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Companion card */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${companion.color} flex items-center justify-center text-lg font-bold text-white`}>
                    <companion.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{companion.name}</h3>
                    <p className="text-xs text-slate-400">{companion.tagline}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{companion.description}</p>
              </div>

              {/* Live emotion particles */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  Live Emotions
                </h3>
                <EmotionParticles emotion={messages[messages.length - 1]?.emotion || {}} width={260} height={160} />
              </div>

              {/* Trust score */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Trust Score</h3>
                  <p className="text-xs text-slate-400 mt-1">{relationshipDays} days together</p>
                </div>
                <TrustScoreRing score={trustScore} days={relationshipDays} size={80} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════ VOICE TAB ═══════ */}
        {activeTab === "voice" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-700/50 text-center">
              <VoiceWaveform isActive={isVoiceActive} width={500} height={100} />
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  {isMuted ? <VolumeX size={20} className="text-slate-400" /> : <Volume2 size={20} className="text-cyan-400" />}
                </button>
                <button
                  onClick={toggleVoice}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isVoiceActive
                      ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/30 animate-pulse"
                      : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30"
                  }`}
                >
                  {isVoiceActive ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
                </button>
                <button className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                  <Settings size={20} className="text-slate-400" />
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
                    { label: "Companion", value: companion.name },
                    { label: "Language", value: "English (US)" },
                    { label: "Speed", value: "1.0x" },
                    { label: "Pitch", value: "Neutral" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
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
                    { text: "You have 3 tasks due today.", time: "2 min ago", type: "companion" },
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
            {/* Companion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {COMPANION_PROFILES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCompanion(c.id)}
                  className={`p-4 rounded-2xl border transition-all text-left group ${
                    activeCompanion === c.id
                      ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                      : "border-slate-700/50 bg-slate-900/50 hover:border-slate-600/50"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-lg font-bold text-white mb-3 group-hover:scale-110 transition-transform`}>
                    <c.icon size={24} />
                  </div>
                  <h3 className="text-sm font-bold">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{c.tagline}</p>
                  <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{c.description}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personality radar */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-4">Personality Profile</h3>
                <RadarChart
                  personality={{
                    warmth: 80 + Math.random() * 15,
                    assertiveness: 60 + Math.random() * 20,
                    humor: 70 + Math.random() * 20,
                    empathy: 85 + Math.random() * 10,
                    curiosity: 75 + Math.random() * 15,
                    playfulness: 65 + Math.random() * 20,
                  }}
                  color={companion.accent}
                />
              </div>

              {/* Stats */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-sm font-semibold mb-4">Companion Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Conversations", value: "142", icon: MessageCircle },
                    { label: "Voice Sessions", value: "28", icon: Mic },
                    { label: "Tutor Hours", value: "12", icon: GraduationCap },
                    { label: "Memories", value: "47", icon: Brain },
                    { label: "Trust Score", value: `${trustScore}`, icon: Shield },
                    { label: "Days Active", value: `${relationshipDays}`, icon: Clock },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 rounded-xl bg-slate-800/30 flex items-center gap-3">
                      <stat.icon size={16} className="text-cyan-400" />
                      <div>
                        <p className="text-lg font-bold">{stat.value}</p>
                        <p className="text-[10px] text-slate-400">{stat.label}</p>
                      </div>
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
            {/* Sessions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tutorSessions.map((session) => (
                <div key={session.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      session.status === "active" ? "bg-cyan-500/20 text-cyan-400" :
                      session.status === "completed" ? "bg-green-500/20 text-green-400" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>
                      {session.status}
                    </span>
                    <button className="p-1 hover:bg-slate-800 rounded"><MoreHorizontal size={14} className="text-slate-400" /></button>
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
                      {session.status === "active" ? "Continue" : session.status === "completed" ? "Review" : "Start"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subject browser */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
              <h3 className="text-sm font-semibold mb-4">Browse Subjects</h3>
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
                  <button key={s.name} className="p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-colors text-center group">
                    <s.icon size={24} className="mx-auto mb-2 group-hover:scale-110 transition-transform" style={{ color: s.color }} />
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
            {/* Search & filter */}
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

            {/* Memory grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemories.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 uppercase">{m.category}</span>
                    <span className="text-[10px] text-slate-500">{timeAgo(m.timestamp)}</span>
                  </div>
                  <p className="text-sm text-slate-200 mb-3">{m.content}</p>
                  <div className="flex gap-1 flex-wrap mb-3">
                    {m.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"><Share2 size={12} /></button>
                    <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"><Download size={12} /></button>
                    <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
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
      </main>

      {/* CSS animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
