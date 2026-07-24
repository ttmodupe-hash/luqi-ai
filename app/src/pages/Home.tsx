import { useState, useRef, useEffect } from "react";
import { useApi, type ChatMessage } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Clock } from "lucide-react";

const SUGGESTED_QUERIES = [
  "What is Bitcoin?",
  "How do I file taxes in South Africa?",
  "Translate hello to Zulu",
  "What are African fintech opportunities?",
  "Check Bitcoin price",
  "How do I spot a scam?",
];

const MODULE_COLORS: Record<string, string> = {
  knowledge_base: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  deep_research: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  investment: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  tax: "bg-green-500/10 text-green-400 border-green-500/20",
  language: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  financial_lit: "bg-red-500/10 text-red-400 border-red-500/20",
  opportunity: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  email: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  professional: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  companion: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  general: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Luqi-AI v3.5.0. I can help with research, investments, taxes, African languages, scam detection, and more. What would you like to know?",
      module: "general",
    },
  ]);
  const [input, setInput] = useState("");
  const { chat, loading, error } = useApi();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const response = await chat(text);
    if (response) {
      setMessages((prev) => [...prev, response]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} className="text-black" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-cyan-600 text-white"
                    : "bg-neutral-800 border border-neutral-700 text-neutral-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.role === "assistant" && msg.module && (
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        MODULE_COLORS[msg.module] || MODULE_COLORS.general
                      }`}
                    >
                      {msg.module}
                    </span>
                    {msg.responseTimeMs && (
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={10} />
                        {msg.responseTimeMs.toFixed(0)}ms
                      </span>
                    )}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={16} className="text-neutral-300" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-black animate-pulse" />
              </div>
              <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggested queries */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-neutral-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Luqi-AI anything..."
              className="bg-neutral-800 border-neutral-700 text-white pr-10 placeholder:text-neutral-500"
              disabled={loading}
            />
            {error && (
              <div className="absolute -top-6 left-0 text-xs text-red-400">{error}</div>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
