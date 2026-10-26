import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AccountSession } from '../lib/private-conversations';

/**
 * Shared customer identity for Notes, Omega and the metered text trial.
 * The token lives ONLY in React memory: no cookies, browser storage, URL,
 * service worker messages, automatic provider requests or hidden refresh.
 * A full reload intentionally requires sign-in again. Admin is separate.
 */
type CustomerSessionContextValue = {
  session: AccountSession | null;
  expired: boolean;
  acceptSession: (value: AccountSession) => void;
  signOut: () => void;
};
const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);

const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
/** An expiry hint can only shorten the UI lifetime. It never authenticates a
 * token: signature, account and credential checks remain on the server. Opaque
 * tokens are bounded too; malformed JWT expiry hints fail closed. */
function sessionDeadline(token: string, now: number): number {
  const maximum = now + MAX_SESSION_MS;
  if (!token || token.length > 4096) return now;
  if (!token.includes('.')) return maximum;
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]+=*$/.test(parts[1])) return now;
    const claims = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const expiry = claims?.exp;
    if (!Number.isSafeInteger(expiry) || expiry <= 0 || !Number.isSafeInteger(expiry * 1000)) return now;
    return Math.min(maximum, expiry * 1000);
  } catch { return now; }
}
type ActiveSession = { session: AccountSession; deadline: number };

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [expired, setExpired] = useState(false);
  const current = useRef<ActiveSession | null>(null);
  const acceptSession = useCallback((value: AccountSession) => {
    const now = Date.now(), deadline = sessionDeadline(value.token, now);
    const next = deadline > now ? { session: value, deadline } : null;
    current.current = next; setActive(next); setExpired(next === null);
  }, []);
  const signOut = useCallback(() => {
    current.current = null; setActive(null); setExpired(false);
  }, []);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      // A suspended tab or a former account's timer must not end a new session.
      if (current.current !== active) return;
      const remaining = active.deadline - Date.now();
      if (remaining <= 0) {
        current.current = null; setActive(null); setExpired(true);
      } else timer = setTimeout(check, remaining);
    };
    check();
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [active]);
  const session = active?.session ?? null;
  const value = useMemo(() => ({ session, expired, acceptSession, signOut }), [session, expired, acceptSession, signOut]);
  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSession(): CustomerSessionContextValue {
  const value = useContext(CustomerSessionContext);
  if (!value) throw new Error('Customer session provider unavailable');
  return value;
}

/** The shared chrome also renders in standalone accessibility tests. */
export function useOptionalCustomerSession(): CustomerSessionContextValue | null {
  return useContext(CustomerSessionContext);
}
