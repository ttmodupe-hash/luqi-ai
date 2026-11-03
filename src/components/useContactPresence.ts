import { useEffect, useRef, useState } from 'react';
import { p2pClient } from '../lib/p2p-client';

type Availability = 'online' | 'away';
export function useContactPresence(token: string | undefined) {
  const [choice, setChoice] = useState<{ token: string; enabled: boolean; availability: Availability } | null>(null);
  const [message, setMessage] = useState('');
  const lease = useRef<string | null>(null), sequence = useRef(0);
  const refresh = useRef<(() => void) | null>(null);
  const sharing = !!token && choice?.token === token && choice.enabled;
  const availability: Availability = sharing ? choice!.availability : 'online';
  const desired = useRef<Availability>(availability);
  desired.current = availability;
  useEffect(() => {
    if (!sharing || !token) return;
    lease.current ??= crypto.randomUUID();
    const id = lease.current, api = p2pClient(token);
    let current = true, pending = false, lastAttempt = 0;
    let deferred: ReturnType<typeof setTimeout> | undefined;
    const beat = async () => {
      if (!current || pending || !navigator.onLine || document.visibilityState !== 'visible') return;
      const remaining = 10_000 - (Date.now() - lastAttempt);
      if (remaining > 0) {
        deferred ??= setTimeout(() => { deferred = undefined; void beat(); }, Math.min(10_000, remaining));
        return;
      }
      pending = true; lastAttempt = Date.now();
      const sent = desired.current;
      try {
        if (sent === 'away') await api.presence(id, ++sequence.current, true, 'away');
        else await api.presence(id, ++sequence.current, true);
        if (current) setMessage(sent === desired.current
          ? (sent === 'away' ? 'Sharing Away from this tab with approved contacts.' : 'Sharing recent activity with approved contacts.')
          : 'Updating your shared status…');
      } catch {
        if (current) setMessage('Shared status could not be confirmed. Existing signals expire within 75 seconds.');
      } finally {
        pending = false;
        if (current && desired.current !== sent) void beat();
      }
    };
    refresh.current = () => void beat();
    setMessage('Starting online-status sharing…'); void beat();
    const timer = setInterval(() => void beat(), 30_000);
    const resume = () => void beat();
    document.addEventListener('visibilitychange', resume); window.addEventListener('online', resume);
    return () => {
      current = false; refresh.current = null; clearInterval(timer);
      if (deferred !== undefined) clearTimeout(deferred);
      document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume);
      // A newer sequence prevents a delayed earlier heartbeat from undoing Hide.
      void api.presence(id, ++sequence.current, false).catch(() => {});
    };
  }, [sharing, token]);
  useEffect(() => { refresh.current?.(); }, [availability]);
  return { sharing, availability, message, setSharing: (enabled: boolean) => {
    if (!token) return;
    setChoice(previous => ({ token, enabled, availability: previous?.token === token ? previous.availability : 'online' }));
    if (!enabled) setMessage('Updates stopped. Any existing signal expires within 75 seconds.');
  }, setAvailability: (value: Availability) => {
    if (!token || !sharing || (value !== 'online' && value !== 'away')) return;
    setMessage('Updating your shared status…');
    setChoice({ token, enabled: true, availability: value });
  } };
}
export type ContactPresenceControls = ReturnType<typeof useContactPresence>;
