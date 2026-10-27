import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AccountSession } from '../lib/private-conversations';
import { restoreCustomerSession, revokeCustomerSession, clearCustomerResumeHint,
  hasCustomerResumeHint } from '../lib/customer-resume';

/**
 * Shared customer identity for Notes, Omega and the metered text trial.
 * Bearer JWTs stay ONLY in React memory. When an operator later enables
 * durable resume, a separate HttpOnly/SameSite/host-only server cookie can
 * restore the account after reload without browser token storage. No automatic
 * provider call is made. Admin authentication remains strictly separate.
 */
type CustomerSessionContextValue = {
  session: AccountSession | null;
  expired: boolean;
  restoring: boolean;
  signOutUnconfirmed: boolean;
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
  const [restoring, setRestoring] = useState(() => hasCustomerResumeHint());
  const [signOutUnconfirmed, setSignOutUnconfirmed] = useState(false);
  const current = useRef<ActiveSession | null>(null);
  const resumeEpoch = useRef(0);
  const restoringRequest = useRef<AbortController | null>(null);
  const acceptSession = useCallback((value: AccountSession) => {
    // Manual sign-in always wins over any late restore from a prior identity.
    resumeEpoch.current++; restoringRequest.current?.abort(); restoringRequest.current = null;
    const now = Date.now(), deadline = sessionDeadline(value.token, now);
    const next = deadline > now ? { session: value, deadline } : null;
    current.current = next; setActive(next); setExpired(next === null);
    setRestoring(false); setSignOutUnconfirmed(false);
  }, []);
  const signOut = useCallback(() => {
    resumeEpoch.current++; restoringRequest.current?.abort(); restoringRequest.current = null;
    // Start this deliberate one-shot request BEFORE clearing the inert hint.
    // The actual credential stays in the HttpOnly cookie and is never read here.
    const revoke = hasCustomerResumeHint() ? revokeCustomerSession() : null;
    clearCustomerResumeHint();
    current.current = null; setActive(null); setExpired(false); setRestoring(false);
    if (revoke) void revoke.catch(() => setSignOutUnconfirmed(true));
    else setSignOutUnconfirmed(false);
  }, []);
  useEffect(() => {
    if (!hasCustomerResumeHint()) { setRestoring(false); return; }
    const controller = new AbortController(); const version = ++resumeEpoch.current;
    restoringRequest.current = controller; setRestoring(true);
    void restoreCustomerSession(controller.signal).then(value => {
      if (!controller.signal.aborted && resumeEpoch.current === version &&
          current.current === null && value) acceptSession(value);
    }).catch(() => {
      // A transient failure does not erase the cookie or fabricate a login.
      // An explicit sign-in still works; no automatic retry or provider call.
    }).finally(() => {
      if (resumeEpoch.current === version) { restoringRequest.current = null; setRestoring(false); }
    });
    return () => { controller.abort(); };
  }, [acceptSession]);
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
  const value = useMemo(() => ({ session, expired, restoring, signOutUnconfirmed, acceptSession, signOut }),
    [session, expired, restoring, signOutUnconfirmed, acceptSession, signOut]);
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
