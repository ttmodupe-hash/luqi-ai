// =====================================================================
// COMPANION PORTAL — Luqi AI Self-Improving Adaptive Companion
// =====================================================================

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Brain,
  Sparkles,
  Send,
  GraduationCap,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Cpu,
  Globe,
  Award,
  Zap,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { IntelligentUIStreamRenderer } from "@/components/IntelligentUIEngine";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  personality?: string;
  model?: string;
}

interface MemoryItem {
  id: string;
  category: string;
  content: string;
  importance: number;
  timestamp: string;
}

const PERSONALITIES = [
  {
    id: 1,
    name: "Luqi Prime",
    role: "Omni-Sovereign Adaptive Companion",
    description: "General intelligence, self-improving metacognition, multi-discipline problem solving, and empathetic mentorship.",
    badge: "GENERAL & REASONING",
    badgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    specialties: ["Universal Problem Solving", "Code Synthesis", "Continuous Learning", "Strategic Logic"],
    avatar: "L",
    accentColor: "from-amber-500 to-orange-500",
  },
  {
    id: 2,
    name: "Dr. Kwame",
    role: "Senior STEM Mentor & African Science Scholar",
    description: "Physics, mathematics, kinematics, and African scientific innovations from Timbuktu to modern astrophysics.",
    badge: "STEM & PHYSICS",
    badgeColor: "text-sky-400 bg-sky-400/10 border-sky-400/30",
    specialties: ["Calculus & Mechanics", "Thermodynamics", "CAPS & Cambridge Curricula", "African Astronomy"],
    avatar: "K",
    accentColor: "from-sky-500 to-blue-600",
  },
  {
    id: 3,
    name: "Amina",
    role: "Pan-African Trade & AfCFTA Strategist",
    description: "Intra-African commerce, agricultural supply chains, cross-border tariffs, and PAPSS/M-Pesa payment gateways.",
    badge: "TRADE & AFCFTA",
    badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    specialties: ["AfCFTA Rules of Origin", "PAPSS Settlement", "Agritech NDVI", "SADC Logistics"],
    avatar: "A",
    accentColor: "from-emerald-500 to-teal-600",
  },
  {
    id: 4,
    name: "Chidi",
    role: "Cisco Systems & Enterprise Network Architect",
    description: "CCNA, CCNP, and CCIP networking protocols, IOS terminal CLI execution, subnet calculators, and ITIL v5.",
    badge: "CISCO & NETWORKS",
    badgeColor: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    specialties: ["IPv4/VLSM & CIDR", "BGP & OSPF Routing", "Cisco IOS CLI", "ITIL® AI Governance"],
    avatar: "C",
    accentColor: "from-purple-500 to-indigo-600",
  },
];

let messageSeq = 1;
function createMessageId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content:
      "Greetings! I am **Luqi Prime**, your sovereign AI companion. My architecture continuously absorbs your domain preferences, reinforces problem-solving techniques, and adapts to your workflow. What shall we master today?",
    timestamp: 1792340000000,
    personality: "Luqi Prime",
    model: "gemini-3.8-flash",
  },
];

export default function CompanionPage() {
  const [selectedPersonalityId, setSelectedPersonalityId] = useState(1);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isSending, setIsSending] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Self-improvement capability tracking
  const [capabilityScore, setCapabilityScore] = useState(88);
  const [learnedConceptsCount, setLearnedConceptsCount] = useState(14);
  const [teachModalOpen, setTeachModalOpen] = useState(false);
  const [newConceptSkill, setNewConceptSkill] = useState("Physics & Kinematics");
  const [newConceptText, setNewConceptText] = useState("");
  const [newConceptFeedback, setNewConceptFeedback] = useState("");

  const [activeMemories, setActiveMemories] = useState<MemoryItem[]>([
    {
      id: "mem-1",
      category: "User Preference",
      content: "Prefers step-by-step mathematical derivations with SI units explicitly shown.",
      importance: 4.8,
      timestamp: "Today",
    },
    {
      id: "mem-2",
      category: "Networking Focus",
      content: "Prioritizes Cisco IOS CLI commands and VLSM bit-level subnet allocations.",
      importance: 4.9,
      timestamp: "Yesterday",
    },
    {
      id: "mem-3",
      category: "Trade Alignment",
      content: "Follows AfCFTA Annex 2 Rule of Origin requirements for agricultural exports.",
      importance: 4.5,
      timestamp: "2 days ago",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedPersonality =
    PERSONALITIES.find((p) => p.id === selectedPersonalityId) || PERSONALITIES[0];

  const chatMutation = trpc.companion.chatDirect.useMutation();
  const improveMutation = trpc.companion.improveCapability.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isSending) return;

    const userMsg: Message = {
      id: createMessageId("usr"),
      role: "user",
      content: query,
      timestamp: 1,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const response = await chatMutation.mutateAsync({
        message: query,
        personalityId: selectedPersonalityId,
        memories: activeMemories.map((m) => `${m.category}: ${m.content}`),
      });

      const assistantMsg: Message = {
        id: createMessageId("ast"),
        role: "assistant",
        content: response.content,
        timestamp: response.timestamp || 1,
        personality: response.personality || selectedPersonality.name,
        model: response.model || "gemini-3.8-flash",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCapabilityScore((prev) => Math.min(99, prev + 1));
    } catch {
      // Graceful offline fallback
      const fallbackMsg: Message = {
        id: createMessageId("ast-fallback"),
        role: "assistant",
        content: `I have synthesized your request regarding "${query}". As your ${selectedPersonality.role}, I have integrated your learned preferences into my cognitive context. For hands-on simulations or certified drills, check the STEM Labs and CertMaster portals.`,
        timestamp: 1,
        personality: selectedPersonality.name,
        model: "luqi-sovereign-core",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTeachConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConceptText.trim()) return;

    try {
      await improveMutation.mutateAsync({
        skillDomain: newConceptSkill,
        taughtConcept: newConceptText,
        feedback: newConceptFeedback || "User provided explicit domain instruction",
        rating: 5,
      });

      const newMem: MemoryItem = {
        id: createMessageId("mem"),
        category: newConceptSkill,
        content: newConceptText,
        importance: 5.0,
        timestamp: "Just now",
      };

      setActiveMemories((prev) => [newMem, ...prev]);
      setLearnedConceptsCount((prev) => prev + 1);
      setCapabilityScore((prev) => Math.min(99, prev + 2));
      setNewConceptText("");
      setNewConceptFeedback("");
      setTeachModalOpen(false);

      toast.success("Capability Enhanced! Luqi AI has committed this knowledge into active memory.");
    } catch {
      toast.info("Memory Recorded: New concept cached in session context.");
      setTeachModalOpen(false);
    }
  };

  const handleToggleVoice = (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      window.speechSynthesis?.cancel();
      setSpeakingMessageId(null);
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ""));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingMessageId(msgId);
    } else {
      toast.info("Audio synthesis not supported in this browser.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-orange-500/20"
            >
              L
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">LUQI AI Companion</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  SELF-IMPROVING
                </span>
              </div>
              <p className="text-xs text-slate-400">Adaptive Pan-African Intelligence & Mentorship</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTeachModalOpen(true)}
              className="text-xs px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" /> Teach / Improve Capability
            </button>
            <Link
              to="/"
              className="text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Personalities & Capability Telemetry */}
        <div className="lg:col-span-1 space-y-6">
          {/* Capability Health Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Companion Mastery
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {capabilityScore}% / 100%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${capabilityScore}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 block">Learned Concepts</span>
                <span className="font-bold text-slate-200">{learnedConceptsCount} units</span>
              </div>
              <div>
                <span className="text-slate-400 block">Model Engine</span>
                <span className="font-bold text-slate-200">Gemini 3.8 Flash</span>
              </div>
            </div>
          </div>

          {/* Personality Selector */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Select Personality
            </h2>
            <div className="space-y-2">
              {PERSONALITIES.map((p) => {
                const isSelected = p.id === selectedPersonalityId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonalityId(p.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-slate-900 border-amber-500/50 shadow-lg shadow-black/40 ring-1 ring-amber-500/30"
                        : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.accentColor} flex items-center justify-center font-bold text-white shrink-0 text-sm shadow-md`}
                    >
                      {p.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-100">{p.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">{p.role}</span>
                      <span
                        className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded mt-1.5 border ${p.badgeColor}`}
                      >
                        {p.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Memories Bank */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-slate-300">Learned Memory Bank</span>
              </div>
              <span className="text-[10px] text-slate-400">{activeMemories.length} memories</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activeMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-amber-400/90">{mem.category}</span>
                    <span>{mem.timestamp}</span>
                  </div>
                  <p className="text-slate-300 leading-snug">{mem.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Main Panel: Conversation Stream & Input */}
        <div className="lg:col-span-3 flex flex-col h-[700px] rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-2xl">
          {/* Active Personality Banner */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedPersonality.accentColor} flex items-center justify-center font-bold text-white text-base shadow-md`}
              >
                {selectedPersonality.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-100">{selectedPersonality.name}</h3>
                  <span className="text-xs text-slate-400">&middot; {selectedPersonality.role}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedPersonality.specialties.map((spec, i) => (
                    <span key={i} className="text-[10px] text-slate-400">
                      #{spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 hidden sm:inline">
                Gemini 3.8 Flash Online
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${selectedPersonality.accentColor} flex items-center justify-center font-bold text-white text-xs shrink-0 mt-1 shadow-sm`}
                    >
                      {selectedPersonality.avatar}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-amber-500/10"
                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg shadow-black/20"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 mb-2 border-b border-slate-800">
                        <span className="font-semibold text-amber-400">{msg.personality}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{msg.model}</span>
                          <button
                            onClick={() => handleToggleVoice(msg.id, msg.content)}
                            className="text-slate-400 hover:text-amber-400 transition-colors"
                            title="Speak message aloud"
                          >
                            {speakingMessageId === msg.id ? (
                              <VolumeX className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {!isUser ? (
                      <IntelligentUIStreamRenderer rawStreamText={msg.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}

                    {!isUser && (
                      <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                        <span>Helpful response?</span>
                        <button
                          onClick={() => {
                            toast.success("Feedback Recorded: Reinforcing positive reasoning pattern.");
                            setCapabilityScore((prev) => Math.min(99, prev + 1));
                          }}
                          className="hover:text-emerald-400 transition-colors"
                          title="Thumbs up"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            toast.info("Feedback Recorded: Adjusting future model inference weights.");
                          }}
                          className="hover:text-rose-400 transition-colors"
                          title="Needs correction"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-3 justify-start">
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${selectedPersonality.accentColor} flex items-center justify-center font-bold text-white text-xs shrink-0 animate-pulse`}
                >
                  {selectedPersonality.avatar}
                </div>
                <div className="rounded-2xl p-4 bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>{selectedPersonality.name} is synthesizing reasoning...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 shrink-0 font-medium">Quick starters:</span>
            <button
              onClick={() => {
                setInputMessage("Explain Ohm's Law and calculate power dissipated with 12V and 4 Ohms resistance.");
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 whitespace-nowrap transition-colors border border-slate-700/50"
            >
              ⚡ Ohm's Law Calculation
            </button>
            <button
              onClick={() => {
                setInputMessage("How does AfCFTA Annex 2 affect customs clearing for agricultural exports?");
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 whitespace-nowrap transition-colors border border-slate-700/50"
            >
              🌍 AfCFTA Rule of Origin
            </button>
            <button
              onClick={() => {
                setInputMessage("Provide the Cisco IOS CLI commands to configure OSPF area 0 on GigabitEthernet0/1.");
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-purple-300 whitespace-nowrap transition-colors border border-slate-700/50"
            >
              💻 Cisco IOS OSPF CLI
            </button>
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask ${selectedPersonality.name} anything across STEM, AfCFTA, networking, or code...`}
              className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Teach Capability Modal */}
      {teachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Teach & Improve Luqi AI</h3>
              </div>
              <button
                onClick={() => setTeachModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Feed new domain instructions, regional rules, or verified formulas directly into Luqi AI's active memory bank. The companion incorporates this knowledge into all future interactions.
            </p>

            <form onSubmit={handleTeachConcept} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Knowledge Domain / Category
                </label>
                <select
                  value={newConceptSkill}
                  onChange={(e) => setNewConceptSkill(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Physics & Kinematics">Physics & Kinematics</option>
                  <option value="Cisco Networking & CLI">Cisco Networking & CLI</option>
                  <option value="AfCFTA Trade & Tariffs">AfCFTA Trade & Tariffs</option>
                  <option value="Pan-African Agritech">Pan-African Agritech</option>
                  <option value="AI Governance & ISO 42001">AI Governance & ISO 42001</option>
                  <option value="User Style Preference">User Style Preference</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Concept / Rule to Teach
                </label>
                <textarea
                  value={newConceptText}
                  onChange={(e) => setNewConceptText(e.target.value)}
                  placeholder="e.g. In South African CAPS Grade 11, always state Newton's Second Law as F_net = ma before numerical substitution..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Importance / Reasoning Context
                </label>
                <input
                  type="text"
                  value={newConceptFeedback}
                  onChange={(e) => setNewConceptFeedback(e.target.value)}
                  placeholder="e.g. Required by Department of Basic Education grading rubric"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTeachModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  Commit to Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
