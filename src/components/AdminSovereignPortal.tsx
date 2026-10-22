import { useEffect } from 'react';
import ApiSystemStatusDashboard from './ApiSystemStatusDashboard';

export function AdminSovereignPortal() {
  useEffect(() => {
    // Old UI versions stored raw passkeys and trusted any stored string. Clear
    // those obsolete credentials; they must never grant a browser admin session.
    try {
      sessionStorage.removeItem('luqi_admin_token');
      sessionStorage.removeItem('luqi_admin_key');
    } catch { /* Browser storage may be unavailable. No session is granted. */ }
  }, []);
  return <main className="mx-auto max-w-4xl space-y-6 p-6 text-slate-100">
    <h1 className="text-3xl font-bold">LUQI administration</h1>
    <section className="rounded-xl border border-amber-600 p-5" aria-label="Administrator access">
      <h2 className="text-xl font-semibold">Administrator sign-in unavailable</h2>
      <p className="mt-2">This portal requires a reviewed server-side administrator session before privileged controls can be enabled.</p>
      <p className="mt-2">No payments, approvals, knowledge compilation or automated actions can be submitted from this page.</p>
    </section>
    <ApiSystemStatusDashboard />
  </main>;
}
export default AdminSovereignPortal;
