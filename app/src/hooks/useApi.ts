import { useState, useCallback } from "react";

const API_BASE = "http://localhost:8080";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  module?: string;
  responseTimeMs?: number;
  sources?: Array<{ title: string; source: string }>;
}

export interface SystemStatus {
  version: string;
  modules: Record<string, boolean>;
  db_tables?: Record<string, number>;
  cache_stats?: Record<string, any>;
  kb_stats?: Record<string, any>;
  uptime_seconds?: number;
}

export interface KBAnswer {
  question: string;
  answer: string;
  confidence: number;
  category: string;
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (query: string): Promise<ChatMessage | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        role: "assistant",
        content: data.response || "No response",
        module: data.module,
        responseTimeMs: data.response_time_ms,
      };
    } catch (e: any) {
      setError(e.message);
      return {
        role: "assistant",
        content: `Error: ${e.message}. Make sure the API server is running on port 8080.`,
        module: "error",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatus = useCallback(async (): Promise<SystemStatus | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const kbAsk = useCallback(async (question: string): Promise<KBAnswer[] | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/kb/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.answers || [];
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const kbSearch = useCallback(async (query: string): Promise<any[] | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/kb/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.results || [];
    } catch {
      return null;
    }
  }, []);

  const kbCategories = useCallback(async (): Promise<string[] | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/kb/categories`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.categories || [];
    } catch {
      return null;
    }
  }, []);

  return { chat, getStatus, kbAsk, kbSearch, kbCategories, loading, error };
}