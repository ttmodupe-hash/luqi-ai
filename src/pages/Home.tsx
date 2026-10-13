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
        </div>

        {/* Core Subsystem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
