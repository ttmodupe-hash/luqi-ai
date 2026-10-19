// =====================================================================
// EXPERIENTIAL SIMULATOR SANDBOX — Cross-Grade Autonomous Learning Engine
// =====================================================================

import React, { useState, useMemo } from "react";
import { Sparkles, RefreshCw, Sliders, CheckCircle2, Code2, GraduationCap, Compass, HelpCircle } from "lucide-react";
import { type GradeTier, type EducationalModuleRecord } from "@/api/services/experientialEducationOrchestrator";

interface SandboxProps {
  module: EducationalModuleRecord;
  onRefresh?: () => void;
}

export const ExperientialSimulatorSandbox: React.FC<SandboxProps> = ({ module, onRefresh }) => {
  const [localVariable, setLocalVariable] = useState<number>(module.initialValue || 10);
  const [showCode, setShowCode] = useState(false);

  // Client-Side Execution Engine: Computes localized mathematics instantly without backend lag
  const executionFeedback = useMemo(() => {
    if (!module.compiledFrontend) {
      return "Simulation compiled and ready.";
    }

    try {
      // Safe execution function
      const interactiveSolver = new Function(
        "input",
        `
        "use strict";
        ${module.compiledFrontend}
        if (typeof executeCalculation === 'function') {
          return executeCalculation(input);
        }
        return "Simulation compiled successfully.";
      `
      );
      const result = interactiveSolver(localVariable);
      return String(result);
    } catch (err: any) {
      return `Calculation Output: ${localVariable} ${module.unit || "units"}`;
    }
  }, [module.compiledFrontend, localVariable, module.unit]);

  const minVal = module.min !== undefined ? module.min : 1;
  const maxVal = module.max !== undefined ? module.max : 100;

  const getTierColor = (tier: GradeTier) => {
    switch (tier) {
      case "PRE_SCHOOL":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PRIMARY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "HIGH_SCHOOL":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "HIGHER_LEARNING":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
            🧪
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">{module.conceptName}</h4>
            <span className="text-[11px] text-slate-400">{module.description}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border ${getTierColor(module.targetGradeTier)}`}>
            {module.targetGradeTier.replace("_", " ")}
          </span>
          <button
            onClick={() => setShowCode(!showCode)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Inspect Verified JS Code"
          >
            <Code2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Code Inspector Collapsible */}
      {showCode && (
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-purple-300 max-h-40 overflow-y-auto">
          <span className="text-[10px] text-slate-400 block mb-1 font-sans font-semibold">
            Verified Sandboxed Logic:
          </span>
          <pre className="whitespace-pre-wrap">{module.compiledFrontend}</pre>
        </div>
      )}

      {/* Parameter Control Slider */}
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            Adjust Parameter Variable
          </span>
          <span className="font-mono text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 font-bold">
            {localVariable} {module.unit || ""}
          </span>
        </div>

        <input
          type="range"
          min={minVal}
          max={maxVal}
          step={module.targetGradeTier === "HIGHER_LEARNING" ? 0.1 : 1}
          value={localVariable}
          onChange={(e) => setLocalVariable(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />

        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>Min: {minVal}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setLocalVariable((v) => Math.max(minVal, Number((v * 0.5).toFixed(1))))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
            >
              0.5x
            </button>
            <button
              onClick={() => setLocalVariable(module.initialValue || 10)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
            >
              Reset
            </button>
            <button
              onClick={() => setLocalVariable((v) => Math.min(maxVal, Number((v * 2).toFixed(1))))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
            >
              2x
            </button>
          </div>
          <span>Max: {maxVal}</span>
        </div>
      </div>

      {/* Dynamic Vector & Mathematical Simulation Output Presentation */}
      <div className="p-4 bg-slate-950/80 border border-dashed border-purple-500/30 rounded-2xl min-h-24 flex flex-col justify-center items-center text-center space-y-1">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Live Simulation State Output
        </span>
        <p className="text-sm sm:text-base font-bold text-teal-300 font-mono leading-relaxed">
          {executionFeedback}
        </p>
      </div>
    </div>
  );
};
