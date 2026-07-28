/**
 * LUQI AI — Local LLM
 * ===================
 * Run AI models locally for privacy-sensitive tasks.
 */

import { useState } from "react";
import { Cpu, Download, CheckCircle, AlertTriangle, Zap } from "lucide-react";

const MODELS = [
  { id: "llama3", name: "Llama 3 8B", size: "4.7 GB", status: "available", description: "General-purpose chat model" },
  { id: "mistral", name: "Mistral 7B", size: "4.1 GB", status: "available", description: "Fast, efficient for most tasks" },
  { id: "phi3", name: "Phi-3 Mini", size: "2.3 GB", status: "available", description: "Small but capable, good for laptops" },
  { id: "gemma", name: "Gemma 2B", size: "1.6 GB", status: "available", description: "Ultra-lightweight for mobile devices" },
];

export default function LocalLLMPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [installed, setInstalled] = useState<string[]>([]);

  const handleDownload = (id: string) => {
    setDownloading(id);
    setTimeout(() => {
      setDownloading(null);
      setInstalled((prev) => [...prev, id]);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Cpu size={22} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Local AI Models</h1>
            <p className="text-sm text-neutral-400">Run AI on your device — no internet required</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-400 font-medium">Experimental Feature</p>
            <p className="text-xs text-neutral-400 mt-1">
              Local models require significant RAM (8GB+ recommended) and disk space.
              For the best experience, use our cloud AI Brain which runs on powerful servers.
            </p>
          </div>
        </div>

        {/* Models */}
        <div className="space-y-3">
          {MODELS.map((model) => (
            <div
              key={model.id}
              className={`p-4 rounded-xl border transition-colors ${
                selected === model.id
                  ? "border-cyan-500 bg-cyan-500/5"
                  : "border-neutral-800 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-cyan-500" />
                  <div>
                    <p className="font-medium">{model.name}</p>
                    <p className="text-xs text-neutral-400">{model.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500">{model.size}</span>
                  {installed.includes(model.id) ? (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle size={14} /> Installed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDownload(model.id)}
                      disabled={downloading === model.id}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black text-xs font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {downloading === model.id ? (
                        <>Downloading...</>
                      ) : (
                        <><Download size={14} /> Download</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
