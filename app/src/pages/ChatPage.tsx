import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  Clock,
  Trash2,
  MessageSquare,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  module?: string;
  responseTimeMs?: number;
}

const SUGGESTED_QUERIES = [
  "Explain blockchain in simple terms",
  "What are the best investments for beginners?",
  "How do I create a budget?",
  "Teach me a Zulu greeting",
  "What is compound interest?",
  "How does the tax system work in South Africa?",
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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      const res = await fetch(`${API_BASE}/api/v25/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      const responseTimeMs = performance.now() - startTime;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response || data.message || data.content || "No response from assistant.",
        timestamp: Date.now(),
        module: data.module || "general",
        responseTimeMs,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);

      // Fallback: Use main chat endpoint
      try {
        const fallbackRes = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text }),
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const assistantMsg: Message = {
            role: "assistant",
            content: data.response || "I received your message but cannot provide a detailed response right now.",
            timestamp: Date.now(),
            module: data.module || "general",
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setError(null);
          return;
        }
      } catch {
        // Both endpoints failed
      }

      const errorMsg: Message = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${msg}. Please make sure the API server is running.`,
        timestamp: Date.now(),
        module: "error",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
            <MessageSquare size={16} className="text-black" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Luqi AI Chat</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Session: {sessionId.slice(0, 16)}...</span>
              {messages.length > 0 && (
                <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 text-xs">
                  {messages.length} messages
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                <Bot size={28} className="text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Start a Conversation</h2>
              <p className="text-sm text-neutral-400 mb-6 max-w-md mx-auto">
                Ask me about investments, taxes, African languages, career advice, or anything else. I'm here to help.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              <div className="max-w-[80%]">
                <Card
                  className={`${
                    msg.role === "user"
                      ? "bg-cyan-600 border-cyan-500"
                      : "bg-neutral-800 border-neutral-700"
                  }`}
                >
                  <CardContent className="p-3">
                    <p
                      className={`text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user" ? "text-white" : "text-neutral-100"
                      }`}
                    >
                      {msg.content}
                    </p>
                  </CardContent>
                </Card>
                <div className="flex items-center gap-2 mt-1 px-1">
                  {msg.role === "assistant" && msg.module && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        MODULE_COLORS[msg.module] || MODULE_COLORS.general
                      }`}
                    >
                      {msg.module}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                    <Clock size={8} />
                    {formatTime(msg.timestamp)}
                  </span>
                  {msg.responseTimeMs && (
                    <span className="text-[10px] text-neutral-500">
                      {(msg.responseTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
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
              <Card className="bg-neutral-800 border-neutral-700">
                <CardContent className="p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              <AlertTriangle size={12} />
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-neutral-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {loading ? <Sparkles size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </form>
      </div>
    </div>
  );
}
