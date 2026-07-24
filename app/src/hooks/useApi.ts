import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v25';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async (endpoint: string, options?: RequestInit) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setState({ data: null, loading: false, error });
      throw err;
    }
  }, []);

  const post = useCallback(async (endpoint: string, body: unknown) => {
    return fetchData(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }, [fetchData]);

  const get = useCallback(async (endpoint: string) => {
    return fetchData(endpoint, { method: 'GET' });
  }, [fetchData]);

  return { ...state, fetchData, post, get };
}
