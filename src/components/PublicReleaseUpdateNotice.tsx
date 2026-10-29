import { useEffect, useState } from 'react';
import { checkPublicRelease, PUBLIC_RELEASE_CHECK_COOLDOWN_MS } from '../lib/public-release-update';

/**
 * Only a visible, user-controlled notice. Never reloads a tab automatically:
 * Chat drafts, sessions, payment steps and form text may be in memory.
 */
export default function PublicReleaseUpdateNotice() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let active = true;
    let checking = false;
    let lastAttempt = 0;
    const inspect = async () => {
      if (!active || checking || document.visibilityState === 'hidden' ||
          typeof window.fetch !== 'function' || !window.navigator.onLine) return;
      const now = Date.now();
      if (now - lastAttempt < PUBLIC_RELEASE_CHECK_COOLDOWN_MS) return;
      lastAttempt = now;
      checking = true;
      try {
        const result = await checkPublicRelease(document, window.location.origin, window.fetch.bind(window));
        if (active && result === 'update-available') setAvailable(true);
      } finally { checking = false; }
    };
    const focus = () => { void inspect(); };
    const resume = () => { if (document.visibilityState !== 'hidden') void inspect(); };
    const first = window.setTimeout(() => { void inspect(); }, 6_000);
    window.addEventListener('focus', focus);
    window.addEventListener('pageshow', focus);
    window.addEventListener('online', focus);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      window.clearTimeout(first);
      window.removeEventListener('focus', focus);
      window.removeEventListener('pageshow', focus);
      window.removeEventListener('online', focus);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  if (!available || dismissed) return null;
  return <section role="status" aria-live="polite" aria-label="Luqi app update available"
    className="luqi-release-update mx-3 my-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500 bg-slate-900 p-3 text-slate-100">
    <div className="min-w-0 flex-1 text-sm">
      <strong className="block">A newer Luqi version is available</strong>
      <p>Save or copy unsent messages and unfinished forms before refreshing. Your current sign-in or unsaved drafts may be lost. Refreshing does not send a message, application or payment.</p>
    </div>
    <button type="button" className="rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-100"
      onClick={() => window.location.reload()}>Refresh Luqi</button>
    <button type="button" className="rounded-md border border-slate-500 px-3 py-2 text-sm"
      onClick={() => setDismissed(true)}>Not now</button>
  </section>;
}
