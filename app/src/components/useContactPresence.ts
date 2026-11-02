import { useEffect, useRef, useState } from 'react';
import { p2pClient } from '../lib/p2p-client';

export interface ContactPresenceControls {
  sharing: boolean;
  message: string;
  setSharing: (enabled: boolean) => void;
  away?: boolean;
  setAway?: (away: boolean) => void;
}

export function useContactPresence(token: string | undefined) {
  const [choice, setChoice] = useState<{ token: string; enabled: boolean; away: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const lease = useRef<string | null>(null), sequence = useRef(0);
  const sharing = !!token && choice?.token === token && choice.enabled;
  const away = sharing && choice?.away === true;
  const mode = useRef(false), sendChoice = useRef<(() => void) | null>(null);
  mode.current = away;
  useEffect(() => {
    if (!sharing || !token) return;
    lease.current ??= crypto.randomUUID();
    const id = lease.current, api = p2pClient(token);
    let current = true, pending = false, lastAttempt = -Infinity, lastMode: boolean | undefined;
    const beat = async () => {
      if (!current || pending || !navigator.onLine || document.visibilityState !== 'visible') return;
      const nextMode = mode.current;
      if (Date.now() - lastAttempt < 10_000 && nextMode === lastMode) return;
      pending = true; lastAttempt = Date.now(); lastMode = nextMode;
      try {
        if (nextMode) await api.presence(id, ++sequence.current, true, true);
        else await api.presence(id, ++sequence.current, true);
        if (current) setMessage(nextMode
          ? 'Sharing Away with approved contacts. Another Online tab can keep you online.'
          : 'Sharing recent activity with approved contacts.');
      } catch {
        if (current) setMessage('Online status could not be confirmed. Existing signals expire within 75 seconds.');
      } finally {
        pending = false;
        // A choice made during an in-flight heartbeat is applied afterwards.
        if (current && lastMode !== mode.current) void beat();
      }
    };
    const resume = () => void beat();
    sendChoice.current = resume;
    setMessage('Starting online-status sharing…'); void beat();
    const timer = setInterval(resume, 30_000);
    document.addEventListener('visibilitychange', resume); window.addEventListener('online', resume);
    return () => {
      current = false; sendChoice.current = null; clearInterval(timer);
      document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume);
      // A newer sequence prevents a delayed earlier heartbeat from undoing Hide.
      void api.presence(id, ++sequence.current, false).catch(() => {});
    };
  }, [sharing, token]);
  useEffect(() => { sendChoice.current?.(); }, [away]);
  return { sharing, away, message,
    setAway: (value: boolean) => {
      if (!token || !sharing) return;
      setChoice({ token, enabled: true, away: value });
    },
    setSharing: (enabled: boolean) => {
      if (!token) return;
      setChoice({ token, enabled, away: false });
      if (!enabled) setMessage('Updates stopped. Any existing online signal expires within 75 seconds.');
    },
  };
}
