import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export function useWebSocket(sessionId: string) {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/chat`);
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({type: 'init', session_id: sessionId}));
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'response') {
        setMessages(prev => [...prev, {role: 'assistant', content: data.content}]);
      }
    };
    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
      setConnected(false);
    };
    return () => ws.close();
  }, [sessionId]);

  const sendMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {role: 'user', content}]);
    wsRef.current?.send(JSON.stringify({type: 'message', message: content, session_id: sessionId}));
  }, [sessionId]);

  return { messages, connected, sendMessage };
}
