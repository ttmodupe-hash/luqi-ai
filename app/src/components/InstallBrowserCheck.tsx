import { useEffect, useState } from 'react';
import { currentPublicBoot } from '../lib/public-release-update';
import { installPromptAvailable, isLuqiStandalone, subscribeLuqiInstall } from '../lib/pwa-install';
import { describeInstall, installDiagnosticText, type InstallObservation } from '../lib/install-diagnostics';

function observe(): InstallObservation {
  return {
    origin: window.location.origin, secure: window.isSecureContext === true,
    online: typeof navigator.onLine === 'boolean' ? navigator.onLine : null,
    serviceWorker: 'serviceWorker' in navigator, standalone: isLuqiStandalone(),
    promptAvailable: installPromptAvailable(),
    bootAsset: currentPublicBoot(document, window.location.origin),
  };
}
/** Explicit opt-in diagnostics; does not fetch, install, clear caches or reload. */
export function InstallBrowserCheck() {
  const [snapshot, setSnapshot] = useState<InstallObservation | null>(null);
  const [report, setReport] = useState(false);
  useEffect(() => {
    const refresh = () => { setSnapshot(previous => previous ? observe() : null); setReport(false); };
    const unsubscribe = subscribeLuqiInstall(refresh);
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    window.addEventListener('focus', refresh);
    const media = window.matchMedia?.('(display-mode: standalone)');
    media?.addEventListener?.('change', refresh);
    return () => {
      unsubscribe(); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh);
      window.removeEventListener('focus', refresh); media?.removeEventListener?.('change', refresh);
    };
  }, []);
  const diagnostic = snapshot ? describeInstall(snapshot) : null;
  return <section className="luqi-install-clarity" aria-labelledby="install-browser-check-title">
    <h2 id="install-browser-check-title">Check this browser before installing</h2>
    <p>This optional local check explains available browser features. It cannot certify that a phone is safe, that installation succeeded, or that an older cached tab recovered.</p>
    <button type="button" className="luqi-primary" onClick={() => { setSnapshot(observe()); setReport(false); }}>
      {snapshot ? 'Check this browser again' : 'Check this browser'}
    </button>
    {diagnostic && <>
      <p role="status">{diagnostic.nextStep}</p>
      <dl>
        <dt>Official HTTPS host</dt><dd>{diagnostic.officialHost ? 'Confirmed address only' : 'Not confirmed — use app.luqi-ai.com'}</dd>
        <dt>Secure browser context</dt><dd>{diagnostic.secure ? 'Reported by this browser' : 'Not reported — do not bypass warnings'}</dd>
        <dt>Connection hint</dt><dd>{diagnostic.online === null ? 'Unknown' : diagnostic.online ? 'Online hint; server availability not tested' : 'Offline hint; reconnect before updating'}</dd>
        <dt>Service worker support</dt><dd>{diagnostic.serviceWorker ? 'API available; no cache contents inspected' : 'Not available; browser use may still work'}</dd>
        <dt>Current display</dt><dd>{diagnostic.standalone ? 'Standalone window' : 'Browser tab'}</dd>
        <dt>Install prompt</dt><dd>{diagnostic.promptAvailable ? 'Offered by the browser' : 'Not currently offered; use the manual steps below'}</dd>
      </dl>
      <button type="button" className="luqi-install-open" onClick={() => setReport(value => !value)} aria-expanded={report} aria-controls="install-browser-report">
        {report ? 'Hide browser-check report' : 'Show browser-check report'}
      </button>
      {report && <div id="install-browser-report">
        <label htmlFor="install-browser-report-text">Local report — select and copy only when you choose to share it</label>
        <textarea id="install-browser-report-text" readOnly rows={13} value={installDiagnosticText(snapshot!)}
          style={{ display:'block', width:'100%', maxWidth:'100%', boxSizing:'border-box', fontSize:'0.85rem' }} />
        <p>No report is uploaded or saved. Remove personal information from any separate screenshot before sharing it.</p>
      </div>}
    </>}
  </section>;
}
