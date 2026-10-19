// =====================================================================
// HOME PORTAL — Luqi AI Master Dashboard
// =====================================================================

import { Link } from "react-router";
import {
  Film,
  FlaskConical,
  HeartPulse,
  Archive,
  CreditCard,
  Shield,
  Sparkles,
  ArrowRight,
  Coins,
  Brain,
  Wand2,
  FileSpreadsheet,
  GraduationCap,
  Search,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-orange-500/20">
              L
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">LUQI AI</h1>
              <p className="text-xs text-slate-400">Pan-African & Global AI Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("luqi:open-search"))}
              className="text-xs px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-amber-500/50 transition-all flex items-center gap-2 font-medium"
              title="Global Command Palette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Search 48 Pages</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded">
                ⌘K
              </kbd>
            </button>
            <Link
              to="/companion"
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1.5 font-medium"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" /> AI Companion
            </Link>
            <Link
              to="/cert-academy"
              className="text-xs px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 font-medium"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" /> CertMaster Academy
            </Link>
            <Link
              to="/african-radar"
              className="text-xs px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" /> African Radar
            </Link>
            <Link
              to="/archive"
              className="text-xs px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 font-medium"
            >
              <Archive className="w-3.5 h-3.5" /> Archive Vault
            </Link>
            <Link
              to="/video-studio"
              className="text-xs px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 transition-all flex items-center gap-1.5 font-medium"
            >
              <Film className="w-3.5 h-3.5" /> Video Studio
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Hero Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" /> One Engine &middot; Every Domain &middot; Total Archiving
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
            Active Intelligence & Complete Mechanical/Cognitive Archiving
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            From interactive STEM lab calculations and margin-guarded generative animation, to LangGraph flight recorders and CrewAI persistent memory.
          </p>

          {/* Interactive Global Command Palette Trigger Bar */}
          <div
            onClick={() => window.dispatchEvent(new CustomEvent("luqi:open-search"))}
            className="max-w-xl mx-auto flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-900 transition-all cursor-pointer shadow-lg shadow-black/40 group text-left mt-4 ring-1 ring-white/5 hover:ring-amber-500/20"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-sm text-slate-200 font-semibold group-hover:text-amber-300 transition-colors block truncate">
                  Jump quickly across all 48 operational pages...
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  ITIL® 5 AI, Cisco CLI, Subnet Bit Calc, 7 STEM Labs, AfCFTA, Video Studio, Flight Recorder
                </span>
              </div>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg shrink-0 ml-2">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Core Subsystem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Luqi AI Self-Improving Companion */}
          <Link
            to="/companion"
            className="group rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-slate-900/60 to-slate-900/90 p-6 hover:border-purple-400 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg shadow-purple-500/5 md:col-span-2 lg:col-span-1"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-purple-400 transition-colors">
                  AI Companion
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
                  SELF-IMPROVING
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Adaptive multi-personality companion with episodic memory, active capability teaching, Leitner drills, and voice synthesis. Continuously learns from your feedback and domain instructions.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-purple-400">
              <span>Launch Companion & Mentors</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 0: CertMaster Academy (ITIL AI Governance & Cisco CCNA/CCNP/CCIP) */}
          <Link
            to="/cert-academy"
            className="group rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900/90 p-6 hover:border-amber-400 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg shadow-amber-500/5 md:col-span-2 lg:col-span-1"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                  CertMaster Academy
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  ITIL® 5 + CISCO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Exam preparation suite for ITIL® AI Governance (v5), CCNA 200-301, CCNP ENCOR/ENARSI & CCIP Service Provider. Includes live Cisco IOS CLI emulator, VLSM bit calculator, and Leitner spaced flashcards.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>Launch Exam & CLI Labs</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 1: Video Studio */}
          <Link
            to="/video-studio"
            className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-orange-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-105 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-orange-400 transition-colors">
                Generative Video & Voice Studio
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Native animation pipeline chaining ElevenLabs voiceover, Replicate WAN 2.1 video generation, and AI scriptwriting with a 50%+ Margin Protector.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-orange-400">
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Total Archive Vault */}
          <Link
            to="/archive"
            className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
                <Archive className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                Total Archiving Vault
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                LangGraph unalterable flight recorder, CrewAI unified cognitive memory, and date-partitioned file storage with paired JSON metadata.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span>Inspect Flight Recorder</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Lab Simulator */}
          <Link
            to="/lab-simulator"
            className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-sky-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                STEM Lab Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                7 interactive physics/chemistry labs, 13 curriculum frameworks (CAPS, Cambridge, Gaokao), and real-time safe mathematical calculation engine.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-sky-400">
              <span>Open Lab Simulator</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Self-Healing Architecture */}
          <Link
            to="/self-healing"
            className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                Self-Healing Engine
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Autonomous runtime error interception, automated patch generation, canary rollout monitoring, and predictive failure analytics.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>View System Health</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Pricing & Subscriptions */}
          <Link
            to="/pricing"
            className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                Virtual Credits & Pricing
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Unit cost transparency for ElevenLabs and Replicate. Subscription tiers and Paystack / Stripe credit replenishment.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>View Pricing Plans</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 6: African Opportunity Radar */}
          <Link
            to="/african-radar"
            className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                African Opportunity Radar
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Autonomous Chief Strategy Officer loop scanning African tech verticals, drafting AfCFTA grant proposals, testing PAPSS/Flutterwave APIs, and calculating corridor tariffs.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Open Opportunity Radar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
