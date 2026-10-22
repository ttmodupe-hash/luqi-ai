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
  Activity,
  Dna,
  Cpu,
} from "lucide-react";
import PublicPlatformView from "@/components/PublicPlatformView";
import CapabilitiesComparisonMatrix from "@/components/CapabilitiesComparisonMatrix";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* 100% PUBLIC-ONLY SOVEREIGN VIEW */}
        <PublicPlatformView />

        {/* Quick Omni-Query Trigger Bar */}
        <div
          onClick={() => window.dispatchEvent(new CustomEvent("luqi:open-search"))}
          className="max-w-xl mx-auto flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-900 transition-all cursor-pointer shadow-lg shadow-black/40 group text-left ring-1 ring-white/5 hover:ring-amber-500/20"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400 group-hover:scale-105 transition-transform">
              <Search className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-sm text-slate-200 font-semibold group-hover:text-amber-300 transition-colors block truncate">
                Explore boundless capabilities, labs & sovereign engines...
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                ITIL® 5 AI, Cisco CLI, Simple & Double Pendulum, AfCFTA, Video Studio, Flight Recorder
              </span>
            </div>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg shrink-0 ml-2">
            ⌘K
          </kbd>
        </div>

        {/* Core Subsystem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: 3D Bioscience & Multimodal Innovation Hub */}
          <Link
            to="/multimodal-hub"
            className="group rounded-3xl border border-sky-500/50 bg-linear-to-br from-sky-500/20 via-slate-900/80 to-slate-900/95 p-6 hover:border-sky-400 hover:bg-slate-900/95 transition-all flex flex-col justify-between shadow-xl shadow-sky-500/15 ring-1 ring-sky-500/30"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
                <Dna className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                  3D Bioscience & Multimodal Hub
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold border border-sky-500/30">
                  ALPHAFOLD 3D
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                DeepMind Science AlphaFold pLDDT 4-band molecular structures, PDB crystals, 8-part procedural Three.js robotics tutor, Veo 3 generative studio, and live voice copilot.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-sky-400">
              <span>Enter Multimodal Hub</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card: Consumer Rights & Legal Demand Shield */}
          <Link
            to="/consumer-rights"
            className="group rounded-3xl border border-amber-500/50 bg-linear-to-br from-amber-500/15 via-slate-900/70 to-slate-900/95 p-6 hover:border-amber-400 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/20"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                  Consumer Rights & Legal Demand
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  CPA · NCA · OMBUD
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Analyze consumer complaints, cite exact CPA & NCA laws (6-month warranty, debt review traps, illegal loan sharks), and instantly draft formal demand letters ready to copy and send.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>Open Legal Defense Shield</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card: Grade 10 Simple Pendulum & Energy Conservation Lab */}
          <Link
            to="/pendulum-lab"
            className="group rounded-3xl border border-sky-500/50 bg-linear-to-br from-sky-500/15 via-slate-900/70 to-slate-900/95 p-6 hover:border-sky-400 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-xl shadow-sky-500/10 ring-1 ring-sky-500/20"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                  Simple Pendulum Lab
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold border border-sky-500/30">
                  GRADE 10 PHYSICS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Zero-dependency digital lab simulation. Includes real-time sliders for gravity (g), string length (L), and mass (m), with live waveform graph of kinetic vs. potential energy (Ek vs Ep).
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-sky-400">
              <span>Launch Interactive Lab</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card: Luqi AI Self-Improving Companion */}
          <Link
            to="/companion"
            className="group rounded-3xl border border-purple-500/40 bg-linear-to-br from-purple-500/10 via-slate-900/60 to-slate-900/90 p-6 hover:border-purple-400 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg shadow-purple-500/5 md:col-span-2 lg:col-span-1"
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
            className="group rounded-3xl border border-amber-500/40 bg-linear-to-br from-amber-500/10 via-slate-900/60 to-slate-900/90 p-6 hover:border-amber-400 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg shadow-amber-500/5 md:col-span-2 lg:col-span-1"
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

          {/* Card 1: LuqiToons 3D Video Studio */}
          <Link
            to="/luqitoons"
            className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-orange-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-105 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-orange-400 transition-colors">
                  LuqiToons 3D Animation Studio
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono font-bold border border-orange-500/30">
                  LUQITOONS 3D
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Sovereign 3D cartoon and character animation studio. Chaining text-to-animation (WAN 2.1 / RunwayML Gen-4.5) and ElevenLabs neural voiceover across 22 African & global languages. Includes 1-click STEM & African folklore templates.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-orange-400">
              <span>Launch LuqiToons Studio</span>
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

        {/* AI Capabilities & Archiving Comparison Matrix */}
        <CapabilitiesComparisonMatrix />
      </main>
    </div>
  );
}
