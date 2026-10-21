// =====================================================================
// VIDEO STUDIO PAGE — Generative Video & Voiceover Studio with Margin Guard
// =====================================================================
// Verified silent-video checkout and private rendering:
// - Server-quoted video credits, charged transactionally
// - No voiceover, fake MP4s or starter credits included in this mode
// - Genuine Replicate output retained in private object storage
// - Hosted Paystack checkout with provider-verified credit settlement
// =====================================================================

import { useRef, useState } from "react";
import ToonChatCreator from "@/components/ToonChatCreator";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import {
  Film,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Globe,
  Sparkles,
  BarChart3,
  X,
  Wand2,
  Languages,
  Coins,
  ShieldCheck,
  CreditCard,
  Info,
  Play,
  Volume2,
  Zap,
} from "lucide-react";

// ── LANGUAGE MAP ────────────────────────────────────────────────────
const LANGUAGE_MAP: Record<string, { name: string; flag: string }> = {
  en: { name: "English", flag: "🇬🇧" },
  zu: { name: "isiZulu", flag: "🇿🇦" },
  xh: { name: "isiXhosa", flag: "🇿🇦" },
  af: { name: "Afrikaans", flag: "🇿🇦" },
  ns: { name: "Sepedi", flag: "🇿🇦" },
  tn: { name: "Setswana", flag: "🇿🇦" },
  st: { name: "Sesotho", flag: "🇿🇦" },
  ts: { name: "Xitsonga", flag: "🇿🇦" },
  ss: { name: "siSwati", flag: "🇿🇦" },
  ve: { name: "Tshivenda", flag: "🇿🇦" },
  nr: { name: "isiNdebele", flag: "🇿🇦" },
  sw: { name: "Kiswahili", flag: "🇰🇪" },
  fr: { name: "Français", flag: "🇫🇷" },
  pt: { name: "Português", flag: "🇵🇹" },
  ha: { name: "Hausa", flag: "🇳🇬" },
  yo: { name: "Yorùbá", flag: "🇳🇬" },
  ig: { name: "Igbo", flag: "🇳🇬" },
  am: { name: "Amharic", flag: "🇪🇹" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  ru: { name: "Русский", flag: "🇷🇺" },
  ja: { name: "日本語", flag: "🇯🇵" },
  zh: { name: "中文", flag: "🇨🇳" },
};

const VALID_LANGUAGES = Object.keys(LANGUAGE_MAP);

// ── LUQITOONS 1-CLICK INSTANT PRESETS ─────────────────────────────────
const LUQITOONS_PRESETS = [
  {
    icon: "🤖",
    label: "3D Robot STEM Tutor",
    title: "AI Physics Tutor Scene",
    desc: "3D animation demonstrating harmonic oscillation",
    prompt: "3D cartoon style friendly robot sitting at a futuristic science lab desk demonstrating pendulum motion, volumetric lighting, Pixar aesthetic, bright vibrant colors",
    dialogue: "Welcome to Luqi AI. Notice how energy converts from potential to kinetic as the pendulum swings.",
    lang: "en",
    duration: 5,
  },
  {
    icon: "☀️",
    label: "Solar Microgrid Story",
    title: "Township Clean Energy Story",
    desc: "Township solar microgrid explainer with animated power flow",
    prompt: "3D stylized animated village with rooftop solar panels, glowing battery storage, warm African sunset, gentle camera pan, vibrant colors",
    dialogue: "Amandla elanga asiza imiphakathi yethu ukugcina ukukhanya ngesikhathi sokucima kukagesi.",
    lang: "zu",
    duration: 5,
  },
  {
    icon: "🏪",
    label: "Spaza Shop 3D",
    title: "Township Merchant Finance Story",
    desc: "Informal economy financial inclusion animation",
    prompt: "Colorful vibrant 3D cartoon township convenience store, friendly merchant using phone payment with floating golden ledger symbols, Pixar cartoon lighting",
    dialogue: "Re tshela ditlhahlobo tsa mabenkele a rona ka theknoloji e bolokehileng le e bonolo.",
    lang: "st",
    duration: 5,
  },
  {
    icon: "🦁",
    label: "African Folklore",
    title: "Anansi & the Baobab Tree",
    desc: "Cultural bedtime story animated scene",
    prompt: "Stylized storybook 3D cartoon animation of an ancient African baobab tree under a starry night sky with mystical fireflies, rich saturated hues",
    dialogue: "Hapo zamani za kale, chini ya mti mkubwa wa mbuyu, wanyama walikusanyika kusikiliza hekima.",
    lang: "sw",
    duration: 5,
  },
  {
    icon: "📐",
    label: "Maths Geometry",
    title: "Harmonic Geometry Visualizer",
    desc: "Educational geometry animated explainer",
    prompt: "3D geometric shapes folding in harmonic rhythm with neon particles, educational cartoon graphics, smooth 60fps style, high visual contrast",
    dialogue: "Angles, vectors, and velocity come alive when mathematics meets spatial motion in three dimensions.",
    lang: "en",
    duration: 5,
  },
];

// ── STATUS CONFIG ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: <Clock className="w-4 h-4" />,
  },
  PROCESSING: {
    label: "Rendering Scene",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  SUCCESS: {
    label: "Ready",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  FAILED: {
    label: "Failed (Refunded)",
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

interface VideoProject {
  id: number;
  title: string;
  description: string | null;
  prompt: string;
  language: string;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  progress: number | null;
  errorMessage: string | null;
  durationSeconds: number | null;
  modelUsed: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  processedAt: Date | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const ProgressBar = ({ progress, status }: { progress: number; status: string }) => {
  const color = status === "FAILED" ? "bg-red-500" : status === "SUCCESS" ? "bg-emerald-500" : "bg-sky-500";
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${progress}%` }} />
    </div>
  );
};

export default function VideoStudioPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState<VideoProject | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showApiStatusModal, setShowApiStatusModal] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterLanguage, setFilterLanguage] = useState<string>("");

  // Creation Form state
  const [formTitle, setFormTitle] = useState("AI Physics Tutor Scene");
  const [formDescription, setFormDescription] = useState("3D animation demonstrating harmonic oscillation");
  const [formPrompt, setFormPrompt] = useState("3D cartoon style robot sitting at a futuristic lab desk explaining pendulum motion, bright volumetric lighting, vibrant colors");
  const [formDialogue, setFormDialogue] = useState("Welcome to Luqi AI. Notice how energy converts from potential to kinetic as the pendulum swings.");
  const [renderMode, setRenderMode] = useState<"silent_mp4" | "narrated_mp4">("silent_mp4");
  const [formLanguage, setFormLanguage] = useState("en");
  const [formDuration, setFormDuration] = useState(5);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const renderRequestRef = useRef<{ key: string; intent: string } | null>(null);

  const handleAutoStoryboard = async () => {
    setIsGeneratingStoryboard(true);
    try {
      const res = await fetch("/api/v1/animation/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formTitle || "Science and Nature in Africa",
          duration_seconds: formDuration,
          language: LANGUAGE_MAP[formLanguage]?.name || "English",
        }),
      });
      const data = await res.json();
      if (data?.storyboard) {
        if (data.storyboard.title) setFormTitle(data.storyboard.title);
        if (data.storyboard.visual_prompt) setFormPrompt(data.storyboard.visual_prompt);
        if (data.storyboard.dialogue) setFormDialogue(data.storyboard.dialogue);
        if (data.storyboard.target_duration) setFormDuration(Math.min(10, Math.max(2, Math.round(data.storyboard.target_duration))));
      }
    } catch (e) {
      console.error("Failed to generate storyboard:", e);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  // Queries
  const balance = trpc.video.getBalance.useQuery(undefined, { refetchInterval: 5000 });
  const renderQuote = trpc.video.quoteRender.useQuery({
    durationSeconds: Math.min(10, Math.max(2, formDuration)),
    mode: renderMode,
    narration: renderMode === "narrated_mp4" ? formDialogue : undefined,
  }, { enabled: renderMode === "silent_mp4" || (formDialogue.trim().length > 0 && formDialogue.length <= 500) });
  const apiStatus = trpc.video.getApiStatus.useQuery(undefined, { enabled: false });
  const pricingTiers = trpc.video.getSubscriptionTiers.useQuery();

  const projects = trpc.video.list.useQuery(
    { status: filterStatus as any, language: filterLanguage || undefined, limit: 50 },
    { refetchInterval: 5000 }
  );
  const stats = trpc.video.stats.useQuery(undefined, { enabled: false });

  // Mutations
  const utils = trpc.useUtils();
  const generateVideo = trpc.video.generate.useMutation({
    onSuccess: (data) => {
      utils.video.list.invalidate();
      utils.video.stats.invalidate();
      utils.video.getBalance.invalidate();
      renderRequestRef.current = null;
      setShowCreateModal(false);
    },
  });
  const deleteProject = trpc.video.delete.useMutation({
    onSuccess: () => {
      utils.video.list.invalidate();
      utils.video.stats.invalidate();
    },
  });
  const topupMutation = trpc.video.topupCredits.useMutation({
    onSuccess: (data) => {
      // Opening a checkout is not proof of payment or credited funds.
      if (data.authorizationUrl) window.location.assign(data.authorizationUrl);
    },
  });

  const handleGenerate = () => {
    if (!formTitle.trim() || !formPrompt.trim() || !balance.data?.videoRenderingEnabled ||
      (renderMode === "narrated_mp4" && !balance.data?.narratedVideoEnabled)) return;
    const durationSeconds = Math.min(10, Math.max(2, formDuration));
    const confirmedCredits = renderQuote.data?.creditsRequired;
    if (!confirmedCredits || (balance.data?.credits ?? 0) < confirmedCredits) return;
    const label = renderMode === "narrated_mp4" ? "narrated MP4 with generated speech" : "silent MP4";
    if (!window.confirm(`Render a ${durationSeconds}-second ${label} for ${confirmedCredits} verified credits? Credits are reserved before provider execution.`)) return;
    const narration = renderMode === "narrated_mp4" ? formDialogue : undefined;
    const intent = JSON.stringify([formTitle, formPrompt, formLanguage, durationSeconds, renderMode, narration]);
    const requestKey = renderRequestRef.current?.intent === intent
      ? renderRequestRef.current.key : crypto.randomUUID();
    renderRequestRef.current = { key: requestKey, intent };
    generateVideo.mutate({
      requestKey, mode: renderMode, narration, confirmedCredits,
      title: formTitle,
      prompt: formPrompt,
      language: formLanguage as any,
      durationSeconds,
    });
  };

  const handleQuickTopup = (credits: number, packId: string) => {
    topupMutation.mutate({ credits, packId });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header with Virtual Credit Margin Protector Bar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">LuqiToons 3D Animation Studio</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-400" /> LuqiToons Native
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Margin Protected
                </span>
              </div>
              <p className="text-xs text-slate-400">Private MP4 rendering • purchased credits • verified Paystack payments</p>
            </div>
          </div>

          {/* Wallet Balance & Cost Shield Pill */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-200">
                  {balance.data?.credits ?? 0} <span className="text-slate-500 font-normal">Luqi Credits</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Purchased credits only — no demo balance
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPricingModal(true)}
              className="text-xs px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 font-medium"
            >
              <CreditCard className="w-3.5 h-3.5" /> Top Up / Tiers
            </button>

            <button
              onClick={() => setShowApiStatusModal(true)}
              className="text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center gap-1.5"
              title="Inspect 2026 Underlying API Costs and Commercial Status"
            >
              <Info className="w-3.5 h-3.5 text-sky-400" /> API Unit Costs
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-orange-600/20 transition-all flex items-center gap-1.5 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Render New Scene
            </button>

            <Link
              to="/"
              className="text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-slate-400"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!balance.data?.videoRenderingEnabled && (
          <p role="status" className="rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
            Paid rendering and video-credit checkout require a real provider and configured private object storage. No charge can be made until they are available.
          </p>
        )}
        {generateVideo.error && (
          <p role="alert" className="rounded-xl border border-red-700 p-3 text-sm text-red-200">
            Render request: {generateVideo.error.message}
            {" "}Check your project status before starting a different request.
          </p>
        )}
        {topupMutation.error && (
          <p role="alert" className="rounded-xl border border-red-700 p-3 text-sm text-red-200">
            Checkout could not start: {topupMutation.error.message}. Your account was not credited by this failed request.
          </p>
        )}

        <ToonChatCreator />
        {/* Margin Guard Summary Banner */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950 p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                Verified Credit Ledger
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Secure video rendering: 10 credits per second (silent MP4)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Only settled credit packs can fund real Replicate video renders. Charges are recorded transactionally and failed requests are refunded when recovery succeeds. Voiceover is not included in this rendering mode.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 shrink-0">
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-lg font-bold text-amber-400">10 cr/s</div>
              <div className="text-[10px] text-slate-500 uppercase">Video Rate</div>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-lg font-bold text-sky-400">2 cr/500ch</div>
              <div className="text-[10px] text-slate-500 uppercase">Voiceover not in this mode</div>
            </div>
            <div className="text-center px-3">
              <div className="text-lg font-bold text-emerald-400">50%+</div>
              <div className="text-[10px] text-slate-500 uppercase">Guaranteed Margin</div>
            </div>
          </div>
        </div>

        {/* LUQITOONS QUICK ANIMATION LAUNCHER */}
        <div className="rounded-2xl border border-orange-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-400" /> LUQITOONS 1-CLICK STUDIO
                </span>
                <span className="text-xs text-slate-400">Private MP4 scene renderer — soundtrack separate</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Generate 3D Cartoon Characters & Multilingual Animated Scenes
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition"
              >
                Advanced Modal
              </button>
            </div>
          </div>

          {/* Quick Preset Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              1-Click Instant Templates:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {LUQITOONS_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFormTitle(p.title);
                    setFormDescription(p.desc);
                    setFormPrompt(p.prompt);
                    setFormDialogue(p.dialogue);
                    setFormLanguage(p.lang);
                    setFormDuration(Math.min(10, Math.max(2, p.duration)));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-orange-500/10 hover:border-orange-500/40 border border-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap transition flex items-center gap-1.5"
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Inline Quick Fields */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Visual Animation Prompt (WAN 2.1 3D Cartoon):</label>
              <textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none text-slate-200 resize-none"
                placeholder="Describe your 3D cartoon character, action, and lighting..."
              />
            </div>
            <div className="md:col-span-6 space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Narration script draft (not rendered in silent MP4):</label>
              <textarea
                value={formDialogue}
                onChange={(e) => setFormDialogue(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-orange-500 focus:outline-none text-slate-200 resize-none"
                placeholder="What should the character speak in the scene?"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Languages className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-200"
                >
                  {VALID_LANGUAGES.map((code) => (
                    <option key={code} value={code}>
                      {LANGUAGE_MAP[code]?.flag} {LANGUAGE_MAP[code]?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-slate-200 font-semibold">{formDuration}s</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoStoryboard}
                disabled={isGeneratingStoryboard}
                className="text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingStoryboard ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" /> : <Wand2 className="w-3.5 h-3.5 text-orange-400" />}
                <span>Auto-Direct with AI</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={generateVideo.isPending || !balance.data?.videoRenderingEnabled || (renderMode === "narrated_mp4" && !balance.data?.narratedVideoEnabled)}
                className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold shadow-lg shadow-orange-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {generateVideo.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>Render {renderMode === "narrated_mp4" ? "Narrated" : "Silent"} MP4 ({renderQuote.data?.creditsRequired ?? 0} credits)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {stats.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <div className="text-2xl font-bold text-slate-200">{stats.data.total}</div>
              <div className="text-xs text-slate-500">Total Studio Projects</div>
            </div>
            {stats.data.byStatus.map((s: any) => (
              <div key={s.status} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
                <div
                  className={`text-2xl font-bold ${
                    s.status === "SUCCESS"
                      ? "text-emerald-400"
                      : s.status === "FAILED"
                      ? "text-red-400"
                      : s.status === "PROCESSING"
                      ? "text-sky-400"
                      : "text-amber-400"
                  }`}
                >
                  {s.count}
                </div>
                <div className="text-xs text-slate-500">{STATUS_CONFIG[s.status]?.label || s.status}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-400">Filter:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SUCCESS">Ready</option>
              <option value="FAILED">Failed</option>
            </select>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            >
              <option value="">All 22 Languages</option>
              {VALID_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_MAP[code]?.flag} {LANGUAGE_MAP[code]?.name}
                </option>
              ))}
            </select>
            {(filterStatus || filterLanguage) && (
              <button
                onClick={() => {
                  setFilterStatus("");
                  setFilterLanguage("");
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500">
            Showing {projects.data?.length ?? 0} scenes
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.data && projects.data.length > 0 ? (
            projects.data.map((project: VideoProject) => (
              <div
                key={project.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
                onClick={() => setShowProjectDetail(project)}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <StatusBadge status={project.status} />
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {LANGUAGE_MAP[project.language]?.flag} {LANGUAGE_MAP[project.language]?.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject.mutate({ id: project.id });
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 mb-1 line-clamp-1">{project.title}</h3>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{project.prompt}</p>

                  <div className="mb-2">
                    <ProgressBar progress={project.progress ?? 0} status={project.status} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3">
                    <span>{project.durationSeconds ? `${project.durationSeconds}s scene` : "5s scene"}</span>
                    <span>{project.modelUsed ? project.modelUsed.slice(0, 24) : "Multi-API Pipeline"}</span>
                  </div>
                </div>

                <div>
                  {project.status === "SUCCESS" && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Scene Rendered
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Play className="w-3 h-3 text-sky-400" /> Click to Inspect
                      </span>
                    </div>
                  )}

                  {project.status === "FAILED" && (
                    <div className="mt-2 text-[11px] text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                      {project.errorMessage || "Rendering failed. Credits refunded."}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-slate-500 bg-slate-900/20 rounded-2xl border border-slate-800/60">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
              <p className="text-sm font-semibold text-slate-400">No Animation Scenes Yet</p>
              <p className="text-xs text-slate-600 mt-1 mb-4">
                Create your first real, silent MP4 scene after the renderer and private storage are configured.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors inline-flex items-center gap-1.5 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Create Test Scene
              </button>
            </div>
          )}
        </div>
      </main>

      {/* RENDER NEW SCENE MODAL (With Live Margin & Credit Calculator) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Render 3D Animation Scene</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Scene Title</label>
                  <button
                    type="button"
                    onClick={handleAutoStoryboard}
                    disabled={isGeneratingStoryboard}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition-all font-medium disabled:opacity-50"
                    title="Generate script and visual prompt via Google AI Studio GenAI (temperature=0.0 deterministic)"
                  >
                    {isGeneratingStoryboard ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    )}
                    {isGeneratingStoryboard ? "Extracting Storyboard..." : "Auto-Storyboard (google-genai temp=0.0)"}
                  </button>
                </div>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Robot in Lab Explaining Acid-Base Titration"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  Visual Scene Prompt (Replicate WAN 2.1 / RunwayML Gen-4.5)
                </label>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Describe lighting, character action, 3D style..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div className="rounded-lg border border-slate-700 p-3 space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="luqi-video-mode">Rendering mode</label>
                <select id="luqi-video-mode" value={renderMode}
                  onChange={(e) => setRenderMode(e.target.value as "silent_mp4" | "narrated_mp4")}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm">
                  <option value="silent_mp4">Silent MP4 — 10 credits per second</option>
                  <option value="narrated_mp4">Narrated MP4 — video plus 4 credits for speech</option>
                </select>
                {renderMode === "narrated_mp4" && !balance.data?.narratedVideoEnabled && (
                  <p role="status" className="text-xs text-amber-300">
                    Narrated rendering needs an ElevenLabs account and an installed FFmpeg mixer in the server.
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Narration uses the configured provider voice and is mixed into the scene. It is not lip-synced to a character.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" /> Narration script (used only for narrated MP4)
                  </label>
                  <span className="text-[10px] text-slate-500">{formDialogue.length} characters</span>
                </div>
                <textarea
                  value={formDialogue}
                  onChange={(e) => setFormDialogue(e.target.value)}
                  maxLength={500}
                  placeholder="Describe what the narrator says (maximum 500 characters)..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">
                    Duration: <span className="text-amber-400 font-bold">{formDuration} seconds</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={formDuration}
                    onChange={(e) => setFormDuration(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>2s</span>
                    <span>15s</span>
                    <span>30s</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Language</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    {VALID_LANGUAGES.map((code) => (
                      <option key={code} value={code}>
                        {LANGUAGE_MAP[code]?.flag} {LANGUAGE_MAP[code]?.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* REAL-TIME COST & MARGIN BREAKDOWN CARD */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" /> Credit Calculation
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Verified quote — no unverified margin claims
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-800">
                  <div>
                    <div className="text-slate-500">Video (WAN 2.1)</div>
                    <div className="font-bold text-slate-200">{Math.min(10, Math.max(2, formDuration)) * 10} cr</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Voiceover</div>
                    <div className="font-bold text-slate-200">{renderMode === "narrated_mp4" ? 4 : 0} cr</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Total User Charge</div>
                    <div className="font-bold text-amber-400">
                      {renderQuote.data?.creditsRequired ?? 0} Credits ({renderMode === "narrated_mp4" ? "narrated" : "silent"} MP4)
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                  <span>Provider costs vary; credits are quoted before rendering</span>
                  <span>Wallet Balance: {balance.data?.credits ?? 0} cr</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleGenerate}
                disabled={generateVideo.isPending || !formTitle.trim() || !formPrompt.trim() || !balance.data?.videoRenderingEnabled || (renderMode === "narrated_mp4" && !balance.data?.narratedVideoEnabled) || (balance.data?.credits ?? 0) < (renderQuote.data?.creditsRequired ?? Infinity)}
                className="flex-1 text-sm py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-600/20"
              >
                {generateVideo.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Rendering Animation Scene...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Confirm {renderQuote.data?.creditsRequired ?? 0} Credits & Render Silent MP4
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT DETAIL & ASSET INSPECTION MODAL */}
      {showProjectDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <StatusBadge status={showProjectDetail.status} />
              <button
                onClick={() => setShowProjectDetail(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-lg font-bold text-slate-100">{showProjectDetail.title}</h2>
            {showProjectDetail.description && (
              <p className="text-xs text-slate-400">{showProjectDetail.description}</p>
            )}

            {/* Video / Audio Preview Banner */}
            {showProjectDetail.videoUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-amber-400" /> Rendered Asset
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {showProjectDetail.videoUrl}
                  </span>
                </div>
                <div className="aspect-video rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center p-4">
                  <Play className="w-10 h-10 text-amber-400 mb-2 opacity-80" />
                  <p className="text-xs text-slate-300 font-semibold">{showProjectDetail.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {showProjectDetail.modelUsed || "Replicate (WAN 2.1) + ElevenLabs (Turbo v2.5)"}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">Visual Scene Prompt</div>
              <p className="text-xs text-slate-300 leading-relaxed">{showProjectDetail.prompt}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 mb-0.5">Language</div>
                <div className="text-slate-200">
                  {LANGUAGE_MAP[showProjectDetail.language]?.flag} {LANGUAGE_MAP[showProjectDetail.language]?.name}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 mb-0.5">Engine Stack</div>
                <div className="text-slate-200 truncate">{showProjectDetail.modelUsed || "ElevenLabs + WAN 2.1"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRICING & SUBSCRIPTION TIERS MODAL */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Coins className="w-6 h-6 text-amber-400" /> Virtual Credit Packs & Subscriptions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Protects margin while providing predictable monthly generative animation allowances.
                </p>
              </div>
              <button
                onClick={() => setShowPricingModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Top-up Packs */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Secure top-up checkout (credits credited after verified payment)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pricingTiers.data?.packs?.map((pack: any) => (
                  <div
                    key={pack.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-200">{pack.label}</div>
                      <div className="text-2xl font-extrabold text-amber-400 mt-1">
                        ${pack.priceUsd}{" "}
                        <span className="text-xs font-normal text-slate-500">/ R{pack.priceZar} ZAR</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        {Math.floor(pack.credits / 10)}s of silent WAN 2.1 MP4 video
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickTopup(pack.credits, pack.id)}
                      disabled={topupMutation.isPending || !balance.data?.videoRenderingEnabled}
                      className="mt-4 w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      {topupMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add {pack.credits} Credits
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Tiers */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Monthly Subscription Plans
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {pricingTiers.data?.tiers?.map((tier: any) => (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-2xl bg-slate-950 border ${
                      tier.recommended ? "border-amber-500/50 shadow-lg shadow-amber-500/10" : "border-slate-800"
                    } flex flex-col justify-between`}
                  >
                    <div>
                      {tier.recommended && (
                        <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 mb-2 inline-block">
                          Most Popular
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-slate-200">{tier.name}</h4>
                      <div className="text-xl font-black text-slate-100 mt-1">
                        ${tier.priceUsd}{" "}
                        <span className="text-xs font-normal text-slate-500">/ mo</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {tier.monthlyCredits.toLocaleString()} Credits / mo
                      </div>
                      <ul className="mt-3 space-y-1.5 text-[11px] text-slate-400">
                        {tier.features.map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => handleQuickTopup(tier.monthlyCredits, tier.id)}
                      className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Subscribe {tier.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2026 UNDERLYING API UNIT COST & COMMERCIAL DETAILS MODAL */}
      {showApiStatusModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 space-y-5 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> Underlying API Costs & Commercial Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real 2026 pricing for the underlying APIs orchestrated by Luqi AI.
                </p>
              </div>
              <button
                onClick={() => setShowApiStatusModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {apiStatus.data?.providers?.map((provider: any) => (
                <div
                  key={provider.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-200">{provider.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {provider.envVar}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{provider.purpose}</div>
                    <div className="text-[11px] text-amber-400/90 font-medium">
                      Commercial note: {provider.commercialNotice}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-200">{provider.cost}</div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        provider.configured
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {provider.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-400" /> Why Virtual Credits Protect Against Bankruptcy:
              </div>
              <p>
                Vendor rates and foreign exchange fluctuate. LUQI quotes <strong>10 credits per second for silent MP4 rendering</strong>; no guarantee of profit margin or soundtrack is implied. Video assets are stored privately after real generation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
