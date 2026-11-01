import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useOptionalCustomerSession } from '../providers/customer-session';
import { customerSessionBoundary } from '../lib/customer-session-boundary';
import { readGuide, clearGuideHandoff } from '../lib/interaction-handoff';
export default function GuideHandoffNotice() {
  const customer = useOptionalCustomerSession();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const handoff = readGuide(customerSessionBoundary(customer?.session ?? null), pathname);
  if (!handoff || dismissed) return null;
  return <aside aria-label="Your question from Chat" className="mx-auto my-3 w-full max-w-5xl min-w-0 space-y-2 rounded-xl border border-cyan-600 p-4 text-sm text-slate-100">
    <p>Your Chat draft is kept in this tab for up to 20 minutes, until you return or change accounts. No question was sent to AI or saved to browser storage.</p>
    {handoff.question && <details><summary>Question you chose to carry to this guide</summary><p className="break-words">{handoff.question}</p></details>}
    <Link className="inline-block min-h-11 px-2 py-3 text-cyan-200 underline" to="/chat">Return to my Chat draft</Link>
    <button type="button" className="min-h-11 px-2 py-3 underline" onClick={() => { clearGuideHandoff(); setDismissed(true); }}>Forget the carried draft</button>
  </aside>;
}
