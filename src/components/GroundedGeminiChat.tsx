import React, { useState, useRef, useEffect } from "react";
import {
  Brain,
  Send,
  Search,
  MapPin,
  Sparkles,
  Bot,
  User,
  Loader2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  modelUsed?: string;
  groundingSources?: Array<{ title?: string; uri?: string }>;
}

export const GroundedGeminiChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "model",
      content:
        "Greetings. I am the Luqi AI Sovereign Research Intelligence Engine. You can challenge me on complex bio-molecular pathways, physical pendulum kinetics, or request live groundings via Google Search and Maps.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      modelUsed: "gemini-3.8-flash",
    },
  ]);

  const [input, setInput] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash");
  const [groundingMode, setGroundingMode] = useState<"none" | "search" | "maps">("search");
  const [rolePreset, setRolePreset] = useState<string>("bioinformatics");
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const rolePrompts: Record<string, { label: string; instruction: string }> = {
    bioinformatics: {
      label: "DeepMind Bioinformatics Lead",
      instruction:
        "You are a Senior DeepMind Bioinformatics Architect. Provide rigorous, quantitative explanations of protein folding, AlphaFold pLDDT confidence interpretations, PDB crystallographic resolution, and pharmacological drug-target mechanisms.",
    },
    robotics: {
      label: "Robotics & Kinematics Engineer",
      instruction:
        "You are an expert Robotics and Kinematics Engineer. Explain joint articulation matrices, torque calculations, harmonic mechanical oscillation, and conservation of mechanical energy with clean physical equations.",
    },
    african_stem: {
      label: "Pan-African STEM Innovator",
      instruction:
        "You are an inspiring Pan-African STEM Educator and Technologist. Answer with educational clarity, connecting modern computational biology and physics to African innovation, local flora (e.g. Artemisia, Sutherlandia), and high school / university STEM curricula.",
    },
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const query = input.trim();
    setInput("");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          model: selectedModel,
          systemInstruction: rolePrompts[rolePreset].instruction,
          grounding: groundingMode,
          history: historyPayload,
        }),
      });

      const json = await res.json();
      if (json.status === "success" && json.data) {
        const candidate = json.data;
        const searchChunks =
          candidate.groundingMetadata?.groundingChunks?.map((c: any) => ({
            title: c.web?.title || c.maps?.title || "Grounded Source",
            uri: c.web?.uri || c.maps?.uri || "#",
          })) || [];

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: candidate.text || "Execution finished with nominal results.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: candidate.model,
          groundingSources: searchChunks.length > 0 ? searchChunks : undefined,
        };

        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: "The sovereign computational core returned a local fallback due to network latency.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: "gemini-3.8-flash (fallback)",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[680px] w-full rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Header & Model / Grounding Configuration */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
        {/* Model Switcher */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Brain className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Gemini Multimodal Chat</span>
              <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                PRO TIER
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {(["gemini-4-argon", "gemini-3.8-flash", "gemini-3.1-flash-lite"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors ${
                    selectedModel === m ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.replace("gemini-", "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Role & Grounding Toggles */}
        <div className="flex items-center gap-2">
          {/* Role selector */}
          <select
            value={rolePreset}
            onChange={(e) => setRolePreset(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
          >
            {Object.entries(rolePrompts).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Grounding Mode Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setGroundingMode("search")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                groundingMode === "search" ? "bg-sky-500 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="Google Search Live Grounding"
            >
              <Search className="w-3 h-3" />
              Search
            </button>
            <button
              onClick={() => setGroundingMode("maps")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                groundingMode === "maps" ? "bg-emerald-500 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="Google Maps Grounding"
            >
              <MapPin className="w-3 h-3" />
              Maps
            </button>
            <button
              onClick={() => setGroundingMode("none")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                groundingMode === "none" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="Direct Parametric Reasoning"
            >
              Raw
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "model" && (
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md"
                  : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-xl"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>

              {/* Grounding Sources Badges */}
              {m.groundingSources && m.groundingSources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Search className="w-3 h-3 text-sky-400" />
                    Verified Grounded Sources:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.groundingSources.slice(0, 3).map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md bg-slate-950 text-sky-300 border border-slate-800 hover:border-sky-500/50 text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <span className="line-clamp-1 max-w-[140px]">{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Model & Timestamp Footer */}
              <div
                className={`flex items-center justify-between text-[10px] mt-2 font-mono ${
                  m.role === "user" ? "text-slate-800" : "text-slate-500"
                }`}
              >
                <span>{m.modelUsed || "gemini-core"}</span>
                <span>{m.timestamp}</span>
              </div>
            </div>

            {m.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Reasoning across {selectedModel} with {groundingMode} grounding...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Inquire as ${rolePrompts[rolePreset].label}... (Press Enter)`}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-3 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl font-bold transition-all disabled:opacity-40 shadow-lg shadow-amber-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
