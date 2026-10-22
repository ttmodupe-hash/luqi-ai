import React, { useState } from "react";
import {
  Film,
  Image as ImageIcon,
  Sparkles,
  Play,
  Download,
  Loader2,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Video,
} from "lucide-react";

export const VeoVideoImageStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState<string>(
    "A photorealistic 3D scientific rendering of a human protein receptor interacting with an antimalarial artemisinin molecule, volumetric studio lighting, AlphaFold confidence glowing ribbons"
  );
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-nano-banana-2.1");
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedMedia, setGeneratedMedia] = useState<{
    type: "image" | "video";
    url: string;
    prompt: string;
    model: string;
  } | null>(null);

  const samplePrompts = [
    {
      title: "AlphaFold Molecular Docking",
      prompt:
        "AlphaFold 3D protein structure of p53 tumor suppressor with glowing ligand binding pocket, high precision scientific visualization, obsidian background",
    },
    {
      title: "Procedural Robotic Tutor",
      prompt:
        "Futuristic articulated robotic tutor demonstrating mechanical physics, studio PBR lighting, carbon fiber chassis, educational STEM lab setting",
    },
    {
      title: "African Botanical Pharmacology",
      prompt:
        "Microscopic botanical scan of Artemisia annua leaf trichomes releasing artemisinin crystals, laser confocal microscopy aesthetic",
    },
    {
      title: "Harmonic Pendulum Wave",
      prompt:
        "Harmonic pendulum array oscillating in resonance, neon kinetic trajectories, conservation of energy graph overlay, 8k crisp details",
    },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      if (activeTab === "image") {
        const res = await fetch("/api/gemini/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model: selectedModel,
            aspectRatio,
          }),
        });
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setGeneratedMedia({
            type: "image",
            url: json.data.imageUrl,
            prompt,
            model: json.data.model,
          });
        }
      } else {
        const res = await fetch("/api/gemini/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model: "veo-3.1-lite-generate-preview",
            aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
          }),
        });
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setGeneratedMedia({
            type: "video",
            url: json.data.videoUrl || "/assets/pendulum_simulation.mp4",
            prompt,
            model: json.data.model,
          });
        }
      }
    } catch (err) {
      console.error("Generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Studio Header & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            {activeTab === "image" ? <ImageIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">Multimodal Generative Studio</h3>
            <p className="text-[11px] text-slate-400 font-mono">Powered by Veo 3 & Gemini Nano Banana 2.1</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              setActiveTab("image");
              setSelectedModel("gemini-nano-banana-2.1");
            }}
            className={`px-4 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
              activeTab === "image"
                ? "bg-linear-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image Studio (2.1)
          </button>
          <button
            onClick={() => {
              setActiveTab("video");
              setSelectedModel("veo-3.1-lite-generate-preview");
            }}
            className={`px-4 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
              activeTab === "video"
                ? "bg-linear-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Veo 3 Video Studio
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Input & Parameters Pane (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 flex flex-col gap-4 shadow-xl">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Prompt Description
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your scientific diagram, molecular scene, or robotic demonstration..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 leading-relaxed resize-none"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Curated STEM Presets:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p.prompt)}
                    className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-300 block leading-tight">{p.title}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{p.prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Parameters Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Aspect Ratio</span>
                <div className="flex gap-1">
                  {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex-1 py-1.5 rounded-lg font-mono text-[11px] font-semibold transition-all ${
                        aspectRatio === ratio
                          ? "bg-orange-500 text-white"
                          : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Engine Tier</span>
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-amber-400">
                  {activeTab === "image" ? "gemini-nano-banana-2.1" : "veo-3.1-preview"}
                </div>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs bg-linear-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing with {activeTab === "image" ? "Nano Banana 2.1" : "Veo 3"}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate {activeTab === "image" ? "High-Resolution Image" : "Scientific Video Scene"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output Viewer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative min-h-[460px] h-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-6 shadow-2xl">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                  <div className="absolute inset-2 rounded-full border-4 border-amber-500/20 border-b-amber-500 animate-spin-slow" />
                </div>
                <h4 className="text-sm font-bold text-white">Rendering Multimodal Tensor Outputs</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Distributing compute across Google DeepMind generative accelerators...
                </p>
              </div>
            ) : generatedMedia ? (
              <div className="flex flex-col items-center w-full h-full justify-between gap-4">
                <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-slate-800/80">
                  {generatedMedia.type === "image" ? (
                    <img
                      src={generatedMedia.url}
                      alt={generatedMedia.prompt}
                      className="max-h-[380px] w-auto object-contain rounded-xl shadow-2xl"
                    />
                  ) : (
                    <video
                      src={generatedMedia.url}
                      controls
                      autoPlay
                      loop
                      className="max-h-[380px] w-auto object-contain rounded-xl shadow-2xl"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between w-full bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-white line-clamp-1">{generatedMedia.prompt}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Engine: {generatedMedia.model}</span>
                  </div>

                  <a
                    href={generatedMedia.url}
                    download={`luqi-${generatedMedia.type}-export`}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center text-slate-500">
                <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">Awaiting Generation Dispatch</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Select a preset or customize a prompt to synthesize 3D scientific scenes or Veo 3 animations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
