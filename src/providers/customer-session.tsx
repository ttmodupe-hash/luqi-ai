import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AccountSession } from '../lib/private-conversations';

/**
 * Shared customer identity for Notes, Omega and the metered text trial.
 * The token lives ONLY in React memory: no cookies, browser storage, URL,
 * service worker messages, automatic provider requests or hidden refresh.
 * A full reload intentionally requires sign-in again. Admin is separate.
 */
type CustomerSessionContextValue = {
  session: AccountSession | null;
  acceptSession: (value: AccountSession) => void;
  signOut: () => void;
};
const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const acceptSession = useCallback((value: AccountSession) => setSession(value), []);
  const signOut = useCallback(() => setSession(null), []);
  const value = useMemo(() => ({ session, acceptSession, signOut }), [session, acceptSession, signOut]);
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
