/**
 * LUQI AI — AI Brain Chat Page
 * ==============================
 * Full-screen chat interface with the LUQI AI Brain.
 */

import { useState, useRef, useEffect } from "react";
import { Brain, Send, User, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "What tenders are available in Gauteng?",
  "How do I apply for NSFAS?",
  "Calculate my PAYE tax",
  "Load shedding schedule today",
  "Business registration steps",
  "SASSA grant eligibility",
];

export default function AIBrainPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm LUQI AI, your intelligent assistant for South Africa. Ask me anything about finance, education, health, tenders, load shedding, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/v25/ai-brain/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            session_id: "web-" + (localStorage.getItem("user_id") || "guest"),
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response || "I'm not sure about that. Try rephrasing your question." },
        ]);
      } else {
        // Mock fallback
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: mockResponse(text) },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: mockResponse(text) },
      ]);
    }
    setLoading(false);
  };

  const mockResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes("tender")) return "You can find government tenders on the National Treasury's eTenderPortal (etenders.treasury.gov.za) or on the SA Government website. I can help you understand the application process and required documents.";
    if (q.includes("nsfas")) return "NSFAS applications open around September each year. You'll need your ID, matric certificate, parent/guardian income proof, and proof of acceptance at a registered institution. Apply at nsfas.org.za.";
    if (q.includes("tax")) return "South Africa uses a progressive PAYE tax system. For 2026, the brackets are: R0-R95,750 (18%), R95,751-R365,000 (26%), R365,001-R550,000 (31%), and higher brackets up to 45%. Would you like me to calculate your specific tax?";
    if (q.includes("load shedding")) return "Check your load shedding schedule on EskomSePush (eskomsepush.co.za) or the City Power website for your municipality. The schedule rotates based on your area's load shedding group.";
    if (q.includes("business")) return "To register a business in SA: 1) Reserve a company name with CIPC, 2) Register your company type (PTY, sole prop, etc.), 3) Get a tax number from SARS, 4) Register for UIF if you have employees, 5) Open a business bank account.";
    if (q.includes("sassa")) return "SASSA offers several grants: Older Person's Grant (R2,090/month), Disability Grant (R2,090/month), Child Support Grant (R510/month), and SRD R370 grant. Eligibility depends on age, income, and circumstances.";
    return "That's a great question! LUQI AI can help with that. I'm connected to 90+ capability modules covering finance, education, health, tenders, and daily life in South Africa. Could you provide a bit more detail so I can give you the most accurate guidance?";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
        <Brain size={22} className="text-cyan-500" />
        <div>
          <h1 className="font-semibold text-sm">LUQI AI Brain</h1>
          <p className="text-xs text-neutral-400">90+ capabilities at your fingertips</p>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-cyan-500 ml-auto" />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-cyan-500" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-cyan-500 text-black"
                  : "bg-neutral-800 text-neutral-200"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />

        {/* Quick prompts (only show initially) */}
        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-left px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask LUQI AI anything..."
            className="flex-1 px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
