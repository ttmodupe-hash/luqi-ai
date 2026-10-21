import { useState } from "react";
import ExperimentNotebook from "./ExperimentNotebook";
import PendulumReplay from "./PendulumReplay";
import ScienceTimeline from "./ScienceTimeline";
import {
  Sparkles,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  X,
  Dna,
  FlaskConical,
  Activity,
  Layers,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StandaloneLab {
  id: string;
  title: string;
  subject: "Biology" | "Chemistry" | "Mathematics" | "Physics";
  gradeTier: string;
  badge: string;
  description: string;
  topics: string[];
  offlinePath: string;
  icon: typeof Dna;
  colorScheme: {
    border: string;
    glow: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
  };
}

const EXECUTIVE_LABS: StandaloneLab[] = [
  {
    id: "pendulum-physics",
    title: "Simple Pendulum & Mechanical Energy",
    subject: "Physics",
    gradeTier: "Grade 10–12 / CAPS & Cambridge",
    badge: "100% OFFLINE RK4",
    description:
      "Interactive harmonic oscillation with real-time sliders for gravity, length, and mass. Displays live dual-curve waveform graph of kinetic vs. potential energy proving mechanical energy conservation.",
    topics: ["Conservation of Energy", "E_mech = E_k + E_p", "Gravitational Field (g)", "Period T = 2π√(L/g)"],
    offlinePath: "/labs/physics_lab.html",
    icon: Activity,
    colorScheme: {
      border: "border-sky-500/40",
      glow: "hover:shadow-sky-500/20",
      accent: "text-sky-400",
      badgeBg: "bg-sky-500/20",
      badgeText: "text-sky-300",
    },
  },
  {
    id: "biology-enzyme",
    title: "Cellular Dynamics & Enzyme Kinetics",
    subject: "Biology",
    gradeTier: "Grade 10–12 / AP & IB Biology",
    badge: "MICHAELIS-MENTEN",
    description:
      "Simulate macromolecular active sites, substrate-ligand collisions, and induced-fit binding. Experience thermal denaturation and competitive vs. allosteric inhibition curves in real time.",
    topics: ["Enzyme Saturation (V_max)", "Substrate Affinity (K_m)", "Thermal Denaturation", "Lineweaver-Burk"],
    offlinePath: "/labs/biology_lab.html",
    icon: Dna,
    colorScheme: {
      border: "border-purple-500/40",
      glow: "hover:shadow-purple-500/20",
      accent: "text-purple-400",
      badgeBg: "bg-purple-500/20",
      badgeText: "text-purple-300",
    },
  },
  {
    id: "chemistry-titration",
    title: "Precision Acid-Base Titration",
    subject: "Chemistry",
    gradeTier: "Grade 10–12 / Cambridge & AP",
    badge: "PRECISION BURETTE",
    description:
      "Automated digital burette and magnetic stirring apparatus. Observe microscopic ion neutralizations, indicator transitions (phenolphthalein/bromothymol), and exact derivative inflection peaks (dpH/dV).",
    topics: ["Equivalence Point", "Strong vs Weak Acids", "pH = -log[H+]", "Buffer Capacity"],
    offlinePath: "/labs/chemistry_lab.html",
    icon: FlaskConical,
    colorScheme: {
      border: "border-amber-500/40",
      glow: "hover:shadow-amber-500/20",
      accent: "text-amber-400",
      badgeBg: "bg-amber-500/20",
      badgeText: "text-amber-300",
    },
  },
  {
    id: "algebra-calculus",
    title: "Dynamic Polynomial & Calculus Studio",
    subject: "Mathematics",
    gradeTier: "Grade 10–12 / Algebra II & Pre-Calc",
    badge: "DERIVATIVES & INTEGRALS",
    description:
      "Interactive Cartesian plane for cubic, quadratic, and sinusoidal curves. Glide the tangent slider to visualize instantaneous derivative slopes f'(x) and calculate definite Riemann integrals.",
    topics: ["Instantaneous Rate of Change", "Tangent Slope f'(x)", "Riemann Definite Integral", "Turning Points"],
    offlinePath: "/labs/algebra_lab.html",
    icon: Compass,
    colorScheme: {
      border: "border-emerald-500/40",
      glow: "hover:shadow-emerald-500/20",
      accent: "text-emerald-400",
      badgeBg: "bg-emerald-500/20",
      badgeText: "text-emerald-300",
    },
  },
  {
    id: "geometry-3d",
    title: "3D Spatial Polyhedra & Geometric Proofs",
    subject: "Mathematics",
    gradeTier: "Grade 10–12 / Spatial Geometry",
    badge: "EULER INVARIANT V-E+F=2",
    description:
      "Explore Platonic solids in 360-degree Euler space using pure mathematical 3D perspective projection. Features dynamic cross-sectional slicing planes, vertex highlights, and topological proofs.",
    topics: ["Euler's Formula V - E + F = 2", "3D Perspective Matrix", "Conic Section Slices", "Surface Area & Volume"],
    offlinePath: "/labs/geometry_lab.html",
    icon: Layers,
    colorScheme: {
      border: "border-indigo-500/40",
      glow: "hover:shadow-indigo-500/20",
      accent: "text-indigo-400",
      badgeBg: "bg-indigo-500/20",
      badgeText: "text-indigo-300",
    },
  },
];

export default function ExecutiveLabSuite() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectedLab, setSelectedLab] = useState<StandaloneLab | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const filteredLabs =
    activeTab === "All"
      ? EXECUTIVE_LABS
      : EXECUTIVE_LABS.filter((lab) => lab.subject === activeTab);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-amber-500/30 shadow-2xl shadow-black/50">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Executive STEM Laboratories
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Zero-External-Dependencies & Offline
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Bespoke STEM Simulation Suite</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Engineered with an obsidian, sapphire, and gold aesthetic. Fully self-contained digital labs spanning Biology, Chemistry, Algebra, Geometry, and Physics.
          </p>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 shrink-0">
          {["All", "Physics", "Biology", "Chemistry", "Mathematics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Lab Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLabs.map((lab) => {
          const IconComponent = lab.icon;
          return (
            <div
              key={lab.id}
              className={`group relative rounded-3xl bg-slate-900/60 border ${lab.colorScheme.border} p-6 flex flex-col justify-between hover:bg-slate-900/95 transition-all duration-300 shadow-xl ${lab.colorScheme.glow} backdrop-blur-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center ${lab.colorScheme.accent} group-hover:scale-110 transition-transform`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono font-bold ${lab.colorScheme.badgeBg} ${lab.colorScheme.badgeText} border-transparent`}
                  >
                    {lab.badge}
                  </Badge>
                </div>

                <div className="text-[11px] font-medium text-slate-400 mb-1">
                  {lab.gradeTier}
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  {lab.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {lab.description}
                </p>

                {/* Topics tags */}
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {lab.topics.map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedLab(lab)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex-1 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Launch Lab</span>
                </Button>

                <a
                  href={lab.offlinePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={lab.offlinePath}
                  download
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition"
                  title="Download standalone single-file lab for school server"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive In-App Simulation Modal */}
      {selectedLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
          <div
            className={`relative bg-slate-950 border border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-6xl h-[92vh]"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono font-bold ${selectedLab.colorScheme.badgeBg} ${selectedLab.colorScheme.badgeText}`}
                >
                  {selectedLab.subject}
                </Badge>
                <h3 className="text-sm font-bold text-white truncate max-w-md">
                  {selectedLab.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedLab.offlinePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl text-xs transition flex items-center gap-1.5"
                  title="Open standalone"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedLab(null);
                    setIsFullscreen(false);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                  title="Close Lab"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preserve the original lab while providing an independent learning notebook. */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-950">
              <iframe
                src={selectedLab.offlinePath}
                title={selectedLab.title}
                className="w-full h-[55vh] border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
              <div className="px-4 pb-4">
                <ExperimentNotebook key={selectedLab.id} labId={selectedLab.id} />
                {selectedLab.id === "pendulum-physics" && <PendulumReplay />}
                {selectedLab.id === "biology-enzyme" && <ScienceTimeline subject="biology" />}
                {selectedLab.id === "chemistry-titration" && <ScienceTimeline subject="chemistry" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
