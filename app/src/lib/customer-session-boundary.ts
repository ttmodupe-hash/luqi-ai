import type { AccountSession } from './private-conversations';

/** UI ownership only; server signature, credential and device checks still
 * authenticate every request. A verified rotation within the same device
 * family keeps drafts/consent. A fresh login, logout or different family clears
 * them. Legacy and opaque tokens retain the stricter token-change boundary. */
export function customerSessionBoundary(session: AccountSession | null): string | null {
  if (!session) return null;
  try {
    const part = session.token.split('.')[1];
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    if (/^luqi-rs1-[a-f0-9]{64}$/.test(claims.sid)) {
      return session.user.email.toLowerCase() + '\0' + claims.sid;
    }
  } catch { /* An expiry/authentication hint never grants access. */ }
  return session.token;
}
