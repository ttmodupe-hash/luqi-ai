import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
  cache_stats?: Record<string, unknown>;
  kb_stats?: Record<string, unknown>;
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

  const get = useCallback(async (endpoint: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const post = useCallback(async (endpoint: string, body: unknown) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // Backward-compatible typed helpers
  const chat = useCallback(async (query: string): Promise<ChatMessage | null> => {
    try {
      const data = await post('/api/v25/chat', { query });
      return {
        role: 'assistant',
        content: data.response || 'No response',
        module: data.module,
        responseTimeMs: data.response_time_ms,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        role: 'assistant',
        content: `Error: ${msg}. Make sure the API server is running.`,
        module: 'error',
      };
    }
  }, [post]);

  const getStatus = useCallback(async (): Promise<SystemStatus | null> => {
    try {
      return await get('/api/v25/status');
    } catch {
      return null;
    }
  }, [get]);

  const kbAsk = useCallback(async (question: string): Promise<KBAnswer[] | null> => {
    try {
      const data = await post('/api/v25/kb/ask', { question });
      return data.answers || [];
    } catch {
      return null;
    }
  }, [post]);

  const kbSearch = useCallback(async (query: string): Promise<unknown[] | null> => {
    try {
      const data = await post('/api/v25/kb/search', { query });
      return data.results || [];
    } catch {
      return null;
    }
  }, [post]);

  const kbCategories = useCallback(async (): Promise<string[] | null> => {
    try {
      const data = await get('/api/v25/kb/categories');
      return data.categories || [];
    } catch {
      return null;
    }
  }, [get]);

  return { get, post, chat, getStatus, kbAsk, kbSearch, kbCategories, loading, error };
}
