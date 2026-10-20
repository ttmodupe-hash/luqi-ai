// =====================================================================
// FLOATING AI CHAT WIDGET — Universal Instant Query across All Pages
// =====================================================================

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  Sparkles,
  Send,
  X,
  MessageSquare,
  Bot,
  Maximize2,
  RefreshCw,
  Copy,
  Check,
  Cpu,
  ChevronDown,
  Camera,
  Paperclip,
} from "lucide-react";
import { IntelligentUIStreamRenderer } from "./IntelligentUIEngine";
import { getAuthHeaders } from "../lib/api";

export default function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string; timestamp: number; model?: string }[]
  >([
    {
      id: "intro-1",
      role: "assistant",
      content:
        "Hello & Eita! 👋 Welcome to Luqi-AI, powered by KHORO (The Digital Council of Wisdom). Even if this is your very first time using AI, you can talk to me just like a friend. Ask me anything—from writing a CV, school homework, or loan interest, to chatting in English, Sepitori, isiZulu, or Sesotho. How can I help you today?",
      timestamp: 0,
      model: "KHORO Core",
    },
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async () => {
    const text = query.trim();
    if (!text || isLoading) return;

    setQuery("");
    const userMsg = { id: "user-" + Date.now(), role: "user" as const, content: text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    const systemInstruction = `You are KHORO (Knowledge, Heuristic Orchestration & Reasoning Overseer), the warm, super-intelligent sovereign brain inside Luqi-AI.
Cultural Meaning: In Setswana, Sepedi, Sesotho, and Tshivenda, 'Khoro' is the traditional council courtyard where wisdom, justice, and community problem-solving unite.
- Help with ANYTHING: writing CVs and cover letters, school homework and university subjects, starting or growing a business, compound interest & debt calculations, everyday life questions, health & wellness information, legal/tax/SASSA guidance, or friendly conversation.
- CRITICAL RULE: NEVER list internal backend rules unless the user specifically asks you to audit a device spreadsheet or process a payment.
- When a user greets you ('Hi', 'Eita', 'Sawubona', 'Dumela', 'How are you?'), reply warmly, naturally, and briefly like a helpful friend.
- Match the user's language naturally (English, Sepitori, isiZulu, Sesotho, Setswana, Afrikaans, Kiswahili, Yoruba).`;

    try {
      // 1. First attempt /api/v1/luqi-core
      const res = await fetch("/api/v1/luqi-core", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ user_input: text, language: "SEPITORI_ENGLISH" }),
      });

      let content = "";
      let model = "Gemini 2.5 Flash";
      if (res.ok) {
        const data = await res.json();
        content = data?.response || "";
        if (data?.meta?.model) {
          model = data.meta.model;
        }
      }

      // 2. If backend response is empty or non-200, execute via server-side Gemini API
      if (!content || content.length < 5) {
        try {
          const genRes = await fetch("/api/gemini/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: text,
              model: "gemini-3.8-flash",
              systemInstruction,
              history: updatedMessages.slice(-6).map((m) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
              })),
            }),
          });
          if (genRes.ok) {
            const genData = await genRes.json();
            content = genData?.data?.text || "";
            model = genData?.data?.model || "gemini-3.8-flash";
          }
        } catch {
          // Handled below
        }
      }

      if (!content) {
        content = `Hello! 👋 I am Luqi-AI. I am here and ready to help you with anything—from schoolwork and CV writing to starting a business or everyday questions. How can I make your day easier?`;
      }

      setMessages((prev) => [
        ...prev,
        { id: "ai-" + Date.now(), role: "assistant", content, timestamp: Date.now(), model },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "ai-" + Date.now(),
          role: "assistant",
          content: `Hello! 👋 I am Luqi-AI. I am ready to help you with anything you need today. How can I assist you?`,
          timestamp: Date.now(),
          model: "Luqi-AI",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-white font-bold text-xs shadow-2xl shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 group ring-2 ring-white/20"
            title="Chat with Luqi AI"
            aria-label="Open Floating AI Chat"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            </div>
            <span>Chat with AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          </button>
        )}
      </div>

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] h-[550px] max-h-[85vh] rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/80 backdrop-blur-2xl flex flex-col overflow-hidden ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                L
              </div>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Luqi Prime AI</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    Omni
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Ask any question or query labs</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                to="/companion"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                title="Expand to Fullscreen Companion Studio"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      L
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      isUser
                        ? "bg-amber-500/20 border border-amber-500/30 text-amber-100 rounded-br-sm"
                        : "bg-slate-950/70 border border-slate-800 text-slate-100 rounded-bl-sm"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/60 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-300">Luqi Prime</span>
                          {m.model && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                              {m.model}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopy(m.id, m.content)}
                          className="hover:text-slate-200 transition-colors"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    <div className="leading-relaxed">
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <IntelligentUIStreamRenderer rawStreamText={m.content} content={m.content} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Luqi is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type any question here (just like sending a WhatsApp message)..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
