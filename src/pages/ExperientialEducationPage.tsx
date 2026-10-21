// =====================================================================
// EXPERIENTIAL EDUCATION PORTAL — Autonomous Interactive Learning
// =====================================================================

import { useState } from "react";
import VisualNetworkingLab from "@/components/VisualNetworkingLab";
import { Link } from "react-router";
import {
  GraduationCap,
  Sparkles,
  Play,
  RefreshCw,
  Terminal,
  Layers,
  Activity,
  CheckCircle2,
  BookOpen,
  Sliders,
  Award,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { ExperientialSimulatorSandbox } from "@/components/ExperientialSimulatorSandbox";
import { type GradeTier, type EducationalModuleRecord } from "@/api/services/experientialEducationOrchestrator";

const DEFAULT_MODULES: EducationalModuleRecord[] = [
  {
    id: "mod-pre-1",
    conceptHash: "pre-counting-baobab",
    conceptName: "Anansi & The Baobab Counting Tree",
    targetGradeTier: "PRE_SCHOOL",
    description: "Counting fruit clusters (1 to 10) on the ancient Baobab tree with Anansi the spider.",
    compiledFrontend: `function executeCalculation(input) {
  const count = Math.max(1, Math.min(10, Math.round(input)));
  const fruits = Array(count).fill("🥭").join(" ");
  const birds = count > 5 ? "🦅 High canopy eagle watching!" : "🐦 Sunbird chirping!";
  return count + " Baobab mangoes: " + fruits + " | " + birds;
}`,
    optimizationsCount: 2,
    timestamp: "2026-10-18T10:00:00Z",
    initialValue: 3,
    min: 1,
    max: 10,
    unit: "fruits",
  },
  {
    id: "mod-primary-1",
    conceptHash: "primary-solar-rooftop",
    conceptName: "Solar Photovoltaic Energy Harvest",
    targetGradeTier: "PRIMARY",
    description: "Calculate daily household clean solar energy generated based on solar panel count.",
    compiledFrontend: `function executeCalculation(panels) {
  const p = Math.max(1, panels);
  const dailyKwh = (p * 400 * 5.5 / 1000).toFixed(2);
  const homesPowered = (dailyKwh / 10).toFixed(1);
  return dailyKwh + " kWh/day generated | Powers " + homesPowered + " standard households";
}`,
    optimizationsCount: 3,
    timestamp: "2026-10-18T11:00:00Z",
    initialValue: 8,
    min: 1,
    max: 40,
    unit: "panels",
  },
  {
    id: "mod-high-1",
    conceptHash: "high-projectile-kinematics",
    conceptName: "Projectile Kinematics & Restoring Trajectory",
    targetGradeTier: "HIGH_SCHOOL",
    description: "Calculate maximum launch distance and peak altitude at 45 degree angle without aerodynamic drag.",
    compiledFrontend: `function executeCalculation(velocity) {
  const v = Math.max(1, velocity);
  const g = 9.81;
  const range = ((v * v * Math.sin(Math.PI / 2)) / g).toFixed(2);
  const height = ((v * v * 0.5) / (2 * g)).toFixed(2);
  return "Max Range: " + range + " meters | Peak Altitude: " + height + " meters (g = 9.81 m/s²)";
}`,
    optimizationsCount: 4,
    timestamp: "2026-10-18T12:00:00Z",
    initialValue: 25,
    min: 5,
    max: 120,
    unit: "m/s",
  },
  {
    id: "mod-higher-1",
    conceptHash: "higher-gravitational-orbital",
    conceptName: "Gravitational Acceleration & Orbital Velocity",
    targetGradeTier: "HIGHER_LEARNING",
    description: "Calculate circular orbital velocity v = sqrt(GM/r) for satellite orbital mechanics at Earth radius.",
    compiledFrontend: `function executeCalculation(massMultiplier) {
  const G = 6.6743e-11;
  const earthMass = 5.972e24 * Math.max(0.1, massMultiplier);
  const r = 6.371e6 + 400e3;
  const v = Math.sqrt((G * earthMass) / r);
  const gSurface = (G * earthMass) / (6.371e6 * 6.371e6);
  return "Orbital Velocity: " + v.toFixed(1) + " m/s (" + (v * 3.6).toFixed(1) + " km/h) | Surface Gravity: " + gSurface.toFixed(2) + " m/s²";
}`,
    optimizationsCount: 5,
    timestamp: "2026-10-18T13:00:00Z",
    initialValue: 1,
    min: 0.1,
    max: 10,
    unit: "Earth Mass (M⊕)",
  },
];

export default function ExperientialEducationPage() {
  const [activeTier, setActiveTier] = useState<GradeTier>("HIGH_SCHOOL");
  const [selectedConceptHash, setSelectedConceptHash] = useState("high-projectile-kinematics");

  // Compiler form
  const [newConceptName, setNewConceptName] = useState("Ohm's Law & Dissipated Heat");
  const [newTheoreticalText, setNewTheoreticalText] = useState(
    "Calculate electrical power dissipation P = I^2 * R based on varying circuit current in Amperes with fixed 10 Ohms resistance. Export function executeCalculation(current) { return (current * current * 10).toFixed(2) + ' Watts'; }"
  );
  const [newTier, setNewTier] = useState<GradeTier>("HIGH_SCHOOL");
  const [newVerificationSuite, setNewVerificationSuite] = useState(
    "if (typeof executeCalculation !== 'function') throw new Error('Missing executeCalculation'); const w = executeCalculation(2); if (!w.includes('40')) throw new Error('Failed 2A calculation');"
  );
  const [isCompiling, setIsCompiling] = useState(false);

  const modulesQuery = trpc.superCore.listEducationalModules.useQuery();
  const compileMutation = trpc.superCore.compileEducationalSimulation.useMutation();

  const allModules: EducationalModuleRecord[] = modulesQuery.data && modulesQuery.data.length > 0
    ? (modulesQuery.data as EducationalModuleRecord[])
    : DEFAULT_MODULES;

  const filteredModules = allModules.filter((m) => m.targetGradeTier === activeTier);
  const activeModule = allModules.find((m) => m.conceptHash === selectedConceptHash) || filteredModules[0] || allModules[0];

  const handleCompileSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompiling) return;

    setIsCompiling(true);
    try {
      const result = await compileMutation.mutateAsync({
        conceptName: newConceptName,
        theoreticalText: newTheoreticalText,
        gradeTier: newTier,
        verificationSuite: newVerificationSuite,
      });

      toast.success(`Simulation compiled & verified in ${result.latencyMs}ms (${result.loops} cycles)!`);
      modulesQuery.refetch();
      setActiveTier(newTier);
      setSelectedConceptHash(result.conceptHash);
    } catch (err: any) {
      toast.error(err?.message || "Compilation failed.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-purple-500/20"
            >
              🎓
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">Experiential Education Core</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-mono font-bold border border-purple-500/20">
                  AUTONOMOUS COMPILER
                </span>
              </div>
              <p className="text-xs text-slate-400">Cross-Grade Interactive Simulation Sandbox Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/telemetry"
              className="text-xs px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all font-medium"
            >
              ⚡ Telemetry & Sandbox
            </Link>
            <Link
              to="/companion"
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all font-medium"
            >
              AI Companion
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <VisualNetworkingLab />
        {/* Grade Tier Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { id: "PRE_SCHOOL", label: "Pre-School", desc: "Animal & Folklore Counting", icon: "🌱", color: "border-amber-500/40 text-amber-400" },
              { id: "PRIMARY", label: "Primary", desc: "Visual Puzzles & Sliders", icon: "⚡", color: "border-emerald-500/40 text-emerald-400" },
              { id: "HIGH_SCHOOL", label: "High School", desc: "Kinematics & Vector Labs", icon: "🔬", color: "border-sky-500/40 text-sky-400" },
              { id: "HIGHER_LEARNING", label: "Higher Learning", desc: "Multi-Variable Calculus & Gravity", icon: "🌌", color: "border-purple-500/40 text-purple-400" },
            ] as const
          ).map((tier) => {
            const isActive = activeTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => {
                  setActiveTier(tier.id);
                  const firstInTier = allModules.find((m) => m.targetGradeTier === tier.id);
                  if (firstInTier) setSelectedConceptHash(firstInTier.conceptHash);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isActive
                    ? "bg-slate-900 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/10 border-purple-500"
                    : "bg-slate-900/50 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700"
                }`}
              >
                <div className="text-xl mb-1">{tier.icon}</div>
                <div className="text-xs font-bold text-slate-100">{tier.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{tier.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Active Simulation Player & Modules List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Interactive Simulation Sandbox */}
          <div className="lg:col-span-2 flex flex-col items-center">
            {activeModule ? (
              <ExperientialSimulatorSandbox
                module={activeModule}
                onRefresh={() => modulesQuery.refetch()}
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-3xl border border-slate-800 w-full">
                No simulations available for this tier. Use the compiler below to create one!
              </div>
            )}
          </div>

          {/* Right: Modules in this tier */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    {activeTier.replace("_", " ")} Modules
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {filteredModules.length} available
                </span>
              </div>

              <div className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
                {filteredModules.map((m) => {
                  const isSelected = m.conceptHash === activeModule?.conceptHash;
                  return (
                    <button
                      key={m.conceptHash}
                      onClick={() => setSelectedConceptHash(m.conceptHash)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? "bg-slate-950 border-purple-500/60 shadow-md ring-1 ring-purple-500/30"
                          : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{m.conceptName}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{m.description}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Optimizations: {m.optimizationsCount}x</span>
                        <span className="text-purple-400">{m.unit || "interactive"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-400">
              💡 <span className="text-slate-300 font-semibold">Low-Bandwidth Optimized:</span> All mathematical models run completely client-side in the browser with 0 continuous server bandwidth.
            </div>
          </div>
        </div>

        {/* Autonomous Educational Simulation Compiler */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Autonomous Educational Simulation Compiler
                </h3>
                <p className="text-xs text-slate-400">
                  Transform any dry textbook theory into a verified interactive simulation sandbox.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
              Auto-Fix Ring Active
            </span>
          </div>

          <form onSubmit={handleCompileSimulation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Concept Title
                </label>
                <input
                  type="text"
                  value={newConceptName}
                  onChange={(e) => setNewConceptName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Target Grade Tier
                </label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as GradeTier)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="PRE_SCHOOL">Pre-School (Visual & Folklore Storytelling)</option>
                  <option value="PRIMARY">Primary (Puzzles & Arithmetic Sliders)</option>
                  <option value="HIGH_SCHOOL">High School (Kinematics & Vector Labs)</option>
                  <option value="HIGHER_LEARNING">Higher Learning (Multi-Variable & Relativistic)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Theoretical Curriculum Specification
                </label>
                <textarea
                  value={newTheoreticalText}
                  onChange={(e) => setNewTheoreticalText(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Programmatic Assertion Suite (VM Verification Checks)
                </label>
                <textarea
                  value={newVerificationSuite}
                  onChange={(e) => setNewVerificationSuite(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-teal-300 focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The engine writes code to an isolated Node VM and verifies that assertions pass before saving.
                </span>
              </div>

              <button
                type="submit"
                disabled={isCompiling}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
              >
                {isCompiling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compiling, Testing & Auto-Fixing in Sandbox...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Compile & Verify Simulation Sandbox</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
