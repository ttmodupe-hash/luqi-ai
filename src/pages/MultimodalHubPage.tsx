import React, { useState } from "react";
import {
  Dna,
  Cpu,
  Film,
  Brain,
  Sparkles,
  Radio,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Bioscience3DViewer } from "../components/Bioscience3DViewer";
import { BioscienceLab } from "../components/BioscienceLab";
import { PhysicsRobotics3DViewer } from "../components/PhysicsRobotics3DViewer";
import { VeoVideoImageStudio } from "../components/VeoVideoImageStudio";
import { GroundedGeminiChat } from "../components/GroundedGeminiChat";

export const MultimodalHubPage: React.FC = () => {
  const [activeStudio, setActiveStudio] = useState<"bioscience" | "robotics" | "veo" | "chat">("bioscience");

  const studios = [
    {
      id: "bioscience",
      title: "Bioscience Lab (3D + Gemini)",
      subtitle: "3D Molecule Viewer & Multimodal Bio-Query Engine",
      icon: Dna,
      accent: "text-sky-400",
      border: "hover:border-sky-500/50",
      bgActive: "bg-sky-500/15 border-sky-500/50 text-sky-300",
      badge: "Multimodal Gemini",
    },
    {
      id: "robotics",
      title: "3D Robotics & Kinematics",
      subtitle: "8-Part Articulated STEM Tutor & Physics Rig",
      icon: Cpu,
      accent: "text-emerald-400",
      border: "hover:border-emerald-500/50",
      bgActive: "bg-emerald-500/15 border-emerald-500/50 text-emerald-300",
      badge: "Three.js 60FPS",
    },
    {
      id: "veo",
      title: "Veo 3 & Image Studio",
      subtitle: "Nano Banana 2.1 & Veo Video Preview",
      icon: Film,
      accent: "text-orange-400",
      border: "hover:border-orange-500/50",
      bgActive: "bg-orange-500/15 border-orange-500/50 text-orange-300",
      badge: "Generative Video",
    },
    {
      id: "chat",
      title: "Grounded Gemini Research",
      subtitle: "gemini-4-argon, 3.8 Flash & Google Search / Maps",
      icon: Brain,
      accent: "text-amber-400",
      border: "hover:border-amber-500/50",
      bgActive: "bg-amber-500/15 border-amber-500/50 text-amber-300",
      badge: "Search Grounded",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Studio Banner */}
      <div className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Sovereign Multimodal Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                PRO ACTIVE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Luqi AI Multimodal & 3D Bioscience Innovation Hub
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Unifying Google DeepMind Science bioinformatics, AlphaFold pLDDT protein models, procedural 3D Three.js
              robotics, real-time voice copilot, and Veo 3 generative animation in a single sovereign workbench.
            </p>
          </div>

          {/* Quick Metrics Badge Array */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto text-xs">
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">AlphaFold Model</span>
              <span className="text-white font-mono font-bold text-sm">v4 / pLDDT 4-Band</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Three.js Graphics</span>
              <span className="text-sky-400 font-mono font-bold text-sm">60 FPS WebGL</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Live Voice</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">gemini-3.8-live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Navigation Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {studios.map((s) => {
            const Icon = s.icon;
            const isActive = activeStudio === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStudio(s.id as any)}
                className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between gap-3 ${
                  isActive
                    ? `${s.bgActive} shadow-xl`
                    : `bg-slate-900/60 border-slate-800/80 ${s.border} text-slate-300 hover:bg-slate-900`
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                      isActive ? "bg-white/10" : "bg-slate-800/80"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${s.accent}`} />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800 font-semibold">
                    {s.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight leading-snug">{s.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{s.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Studio Workspace */}
        <div className="flex-1 w-full animate-in fade-in duration-200">
          {activeStudio === "bioscience" && <BioscienceLab />}
          {activeStudio === "robotics" && <PhysicsRobotics3DViewer />}
          {activeStudio === "veo" && <VeoVideoImageStudio />}
          {activeStudio === "chat" && <GroundedGeminiChat />}
        </div>
      </div>
    </div>
  );
};
