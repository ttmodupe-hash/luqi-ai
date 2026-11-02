import { useEffect, useRef, useState } from 'react';
import { p2pClient } from '../lib/p2p-client';

export function useContactPresence(token: string | undefined) {
  const [choice, setChoice] = useState<{ token: string; enabled: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const lease = useRef<string | null>(null), sequence = useRef(0);
  const sharing = !!token && choice?.token === token && choice.enabled;
  useEffect(() => {
    if (!sharing || !token) return;
    lease.current ??= crypto.randomUUID();
    const id = lease.current, api = p2pClient(token);
    let current = true, pending = false, lastAttempt = 0;
    const beat = async () => {
      if (!current || pending || !navigator.onLine || document.visibilityState !== 'visible' || Date.now() - lastAttempt < 10_000) return;
      pending = true; lastAttempt = Date.now();
      try {
        await api.presence(id, ++sequence.current, true);
        if (current) setMessage('Sharing recent activity with approved contacts.');
      } catch {
        if (current) setMessage('Online status could not be confirmed. Existing signals expire within 75 seconds.');
      } finally { pending = false; }
    };
    setMessage('Starting online-status sharing…'); void beat();
    const timer = setInterval(() => void beat(), 30_000);
    const resume = () => void beat();
    document.addEventListener('visibilitychange', resume); window.addEventListener('online', resume);
    return () => {
      current = false; clearInterval(timer);
      document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume);
      // A newer sequence prevents a delayed earlier heartbeat from undoing Hide.
      void api.presence(id, ++sequence.current, false).catch(() => {});
    };
  }, [sharing, token]);
  return { sharing, message, setSharing: (enabled: boolean) => {
    if (!token) return;
    setChoice({ token, enabled });
    if (!enabled) setMessage('Updates stopped. Any existing online signal expires within 75 seconds.');
  } };
}
export type ContactPresenceControls = ReturnType<typeof useContactPresence>;
