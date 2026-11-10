import { useEffect, useState } from 'react';
import { TOWNSHIP_RECHECK_AFTER, TOWNSHIP_REVIEWED_ON, isTownshipReviewFresh } from '../lib/township-economy';

const reviewDeadline = Date.parse(TOWNSHIP_RECHECK_AFTER + 'T23:59:59+02:00');
const readFreshness = () => isTownshipReviewFresh(new Date());

/** Rechecks the existing review boundary; never fetches sources or renews their dates. */
export default function TownshipSourceStatus() {
  const [fresh, setFresh] = useState(readFreshness);
  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      setFresh(readFreshness());
      window.clearTimeout(timer);
      const remaining = reviewDeadline - Date.now() + 1;
      // Check at the actual cutoff, with a bounded fallback for clock changes.
      timer = window.setTimeout(refresh, Number.isFinite(remaining) && remaining > 0
        ? Math.min(remaining, 60_000) : 60_000);
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  function showSources() {
    // A fixed local target: no URL handoff, external navigation or input transmission.
    const sources = document.querySelector<HTMLElement>('[aria-label="Township official programmes"]');
    if (!sources) return;
    sources.tabIndex = -1;
    sources.focus({ preventScroll: true });
    sources.scrollIntoView?.({ block: 'start' });
  }

  return <aside aria-label="Workbench programme source context" className="space-y-2 rounded-lg border border-amber-600 bg-slate-950 p-3 text-sm text-amber-100">
    <p role="status" aria-label="Township programme review status" aria-live="polite" aria-atomic="true" className="font-semibold">
      {fresh ? 'Programme guidance has a dated review.' : 'Programme guidance needs a new review.'}
    </p>
    <p className="text-xs">Last source review: {TOWNSHIP_REVIEWED_ON}. Review due: {TOWNSHIP_RECHECK_AFTER} (South African time).</p>
    <p>Confirm current funding and permit requirements with the original issuer. Your pricing calculations, quotation and saved work remain usable; they do not confirm eligibility or approval.</p>
    <button type="button" onClick={showSources} className="min-h-11 rounded border border-amber-500 px-3 py-2 font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      View original programme sources
    </button>
  </aside>;
}
