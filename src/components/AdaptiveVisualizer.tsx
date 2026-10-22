// =====================================================================
// AFRILEARN ADAPTIVE VISUALIZER — 2G SMS to 5G Ultra-Fidelity
// =====================================================================

import React, { useState, useEffect } from "react";
import {
  Wifi,
  Signal,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Box,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Radio,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { type DeliveryMode } from "@/api/services/afriLearnAdaptiveEngine";

interface AdaptiveVisualizerProps {
  initialConcept?: string;
}

const SPEED_PRESETS = [
  { label: "2G Rural (<100 Kbps)", speed: 75, mode: "OFFLINE_TEXT_SMS" as DeliveryMode, tag: "SMS / USSD" },
  { label: "3G Town (300 Kbps)", speed: 300, mode: "ULTRA_LIGHT_SVG" as DeliveryMode, tag: "Clean SVG" },
  { label: "4G Metro (10 Mbps)", speed: 10000, mode: "RICH_INTERACTIVE" as DeliveryMode, tag: "Interactive Canvas" },
  { label: "5G/6G Ultra (>50 Mbps)", speed: 120000, mode: "ULTRA_FIDELITY_3D" as DeliveryMode, tag: "3D Spatial WebGL" },
];

export const AdaptiveVisualizer: React.FC<AdaptiveVisualizerProps> = ({
  initialConcept = "Ohm's Law: Current (I) through a conductor is directly proportional to Voltage (V) and inversely proportional to Resistance (R).",
}) => {
  const [networkSpeed, setNetworkSpeed] = useState<number>(300);
  const [conceptText, setConceptText] = useState(initialConcept);
  const [conceptName, setConceptName] = useState("Ohm's Law & Circuit Kinematics");
  const [copied, setCopied] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [payload, setPayload] = useState<any>({
    deliveryMode: "ULTRA_LIGHT_SVG",
    compiledPayload: "",
    smsFallbackString: "Luqi Edu (*384#): Ohm's Law V=IR. Voltage=Current*Resistance. Dial *384*1# for practice questions.",
    bandwidthKbps: 300,
    conceptName: "Ohm's Law & Circuit Kinematics",
    svgMarkup: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
  <rect width="100%" height="100%" rx="16" fill="#020617" />
  <circle cx="100" cy="110" r="45" fill="#0d9488" opacity="0.3" stroke="#14b8a6" stroke-width="2" />
  <circle cx="300" cy="110" r="45" fill="#0284c7" opacity="0.3" stroke="#38bdf8" stroke-width="2" />
  <line x1="145" y1="110" x2="255" y2="110" stroke="#f59e0b" stroke-width="3" stroke-dasharray="6 4" />
  <text x="100" y="115" fill="#ffffff" font-size="14" font-family="monospace" font-weight="bold" text-anchor="middle">V = 12V</text>
  <text x="300" y="115" fill="#ffffff" font-size="14" font-family="monospace" font-weight="bold" text-anchor="middle">R = 4Ω</text>
  <text x="200" y="95" fill="#f59e0b" font-size="12" font-family="monospace" font-weight="bold" text-anchor="middle">I = 3.00A</text>
  <text x="200" y="180" fill="#94a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">V = I · R (Transfer: 0.6 KB - Instant on 2G/3G)</text>
</svg>`,
  });

  const compileMutation = trpc.superCore.compileAdaptiveLesson.useMutation();

  const handleFetchLesson = async (speed: number) => {
    setIsLoading(true);
    setNetworkSpeed(speed);
    try {
      const res = await compileMutation.mutateAsync({
        conceptTheory: conceptText,
        kbpsDownloadSpeed: speed,
        conceptName,
      });
      setPayload(res);
    } catch {
      toast.error("Failed to compile adaptive channel. Using cached fallback.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySms = () => {
    if (payload?.smsFallbackString) {
      navigator.clipboard.writeText(payload.smsFallbackString);
      setCopied(true);
      toast.success("SMS / USSD payload copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentMode = payload?.deliveryMode || "ULTRA_LIGHT_SVG";

  return (
    <div className="p-5 sm:p-6 max-w-2xl w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase text-white">
              AfriLearn Adaptive Network Hub
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Auto-tunes from 2G SMS (<span className="text-amber-400">&lt;100 Kbps</span>) to 5G Ultra-Fidelity (<span className="text-purple-400">&gt;50 Mbps</span>)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 text-[10px] font-mono rounded-xl font-bold border ${
              currentMode === "OFFLINE_TEXT_SMS"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : currentMode === "ULTRA_LIGHT_SVG"
                ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                : currentMode === "RICH_INTERACTIVE"
                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                : "bg-purple-500/10 text-purple-400 border-purple-500/20"
            }`}
          >
            {currentMode}
          </span>
        </div>
      </div>

      {/* Speed Preset Switcher */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 block">
          Simulate Network Infrastructure Link:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SPEED_PRESETS.map((preset, idx) => {
            const isSelected = networkSpeed === preset.speed;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleFetchLesson(preset.speed)}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-slate-950 border-emerald-500/60 ring-1 ring-emerald-500/30 text-white font-semibold"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-950"
                }`}
              >
                <div className="text-xs">{preset.label}</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{preset.tag}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Display Area */}
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 min-h-52 flex flex-col justify-center items-center relative overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-xs text-slate-400 animate-pulse">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Compiling Adaptive Educational Payload...</span>
          </div>
        ) : currentMode === "OFFLINE_TEXT_SMS" ? (
          // Mode 1: Feature Phone SMS/USSD Frame
          <div className="w-full max-w-md p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-emerald-400 pb-2 border-b border-emerald-500/20">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" /> Feature Phone USSD ({payload.ussdShortcode || "*384#"})
              </span>
              <span className="text-[10px] text-slate-400">
                {payload.smsFallbackString?.length || 0} / 160 Chars
              </span>
            </div>

            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
              {payload.smsFallbackString}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                Works offline on basic Nokia / 2G feature phones with 0 internet data.
              </span>
              <button
                onClick={copySms}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy SMS"}</span>
              </button>
            </div>
          </div>
        ) : currentMode === "ULTRA_LIGHT_SVG" ? (
          // Mode 2: Ultra-Light SVG
          <div className="w-full space-y-2">
            <div
              className="w-full text-teal-400"
              dangerouslySetInnerHTML={{ __html: payload.svgMarkup || payload.compiledPayload }}
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>Transfer Payload: ~0.8 KB (Compressed SVG Vector)</span>
              <span className="text-teal-400">0 External Requests</span>
            </div>
          </div>
        ) : currentMode === "ULTRA_FIDELITY_3D" ? (
          // Mode 4: 5G/6G Spatial 3D WebGL
          <div className="w-full space-y-3 text-center">
            <div className="relative w-full h-44 rounded-xl bg-linear-to-br from-purple-950/40 to-slate-950 border border-purple-500/30 flex flex-col items-center justify-center p-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-2 shadow-lg shadow-purple-500/20 animate-pulse">
                <Box className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-purple-300">
                5G/6G Spatial 3D WebGL Simulation Active
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                Orbital Camera &middot; 60 FPS Multi-Tonal Audio &middot; 120 Mbps Pipe
              </span>
            </div>
            <p className="text-xs text-slate-300">{payload.compiledPayload}</p>
          </div>
        ) : (
          // Mode 3: Rich Interactive Canvas
          <div className="w-full text-center space-y-3 p-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-sky-300">Rich Interactive HTML5 Simulation</h4>
            <p className="text-xs text-slate-300">{payload.compiledPayload}</p>
          </div>
        )}
      </div>

      {/* Cross-Subsidization Business Strategy Banner */}
      <div className="p-3.5 bg-linear-to-r from-purple-950/40 via-slate-950 to-emerald-950/40 rounded-2xl border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
        <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <span className="font-bold text-white">Cross-Subsidized Sustainable Equity:</span> Premium 5G/6G institutional subscriptions cross-subsidize 100% free zero-rated 2G SMS packets and lightweight vector models for students in off-grid rural communities.
        </div>
      </div>
    </div>
  );
};
