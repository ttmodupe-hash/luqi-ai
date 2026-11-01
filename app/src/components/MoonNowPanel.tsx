import { Component, Suspense, lazy, useState, type ComponentType, type ReactNode } from 'react';

export type MoonModule = { default: ComponentType };
const loadMoon = (): Promise<MoonModule> => import('./MoonNowContent');
const reloadPage = () => window.location.reload();
const frame = { minHeight: 380, margin: '1.5rem 0' };

function MoonLoading({ onReload }: { onReload: () => void }) {
  return <section className="luqi-info" style={frame} aria-label="Moon tracker loading">
    <h2>Moon now</h2>
    <p role="status" aria-live="polite">Loading the live Moon calculations…</p>
    <p>The rest of Luqi is ready to use. This panel opens here automatically; no sign-in or location is required.</p>
    <details><summary>Taking longer than expected?</summary>
      <p>Check your connection. Reloading clears unsaved text and in-memory sign-in, so copy important drafts first.</p>
      <button type="button" className="luqi-secondary" onClick={onReload}>Reload page</button>
    </details>
  </section>;
}

/** Only the Moon panel is replaced on failure; the homepage and its drafts stay mounted.
 * Error details and rejected asset URLs are never reflected into the page.
 * No automatic retry, reload, provider call or invented phase is used.
 */
class MoonErrorBoundary extends Component<{ children: ReactNode; onReload: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="luqi-info" style={frame} aria-label="Moon tracker recovery">
      <h2>Moon now</h2>
      <p role="alert">The Moon tracker could not load. Your other Luqi tools are still available.</p>
      <p>Your connection may have changed, or this tab may be using an older release.</p>
      <p>Reloading clears unsaved text and in-memory sign-in. Copy important drafts first.</p>
      <button type="button" className="luqi-secondary" onClick={this.props.onReload}>Reload page</button>
    </section>;
    return this.props.children;
  }
}

/** Keep the existing homepage entry point. The separately loaded calculation code
 * starts automatically when this panel renders, not after a new route or a click.
 * Its bytes remain part of the homepage's total transfer, not the initial JS graph.
 */
export default function MoonNowPanel({ loader = loadMoon, onReload = reloadPage }:
  { loader?: () => Promise<MoonModule>; onReload?: () => void }) {
  const [Panel] = useState(() => lazy(loader));
  return <MoonErrorBoundary onReload={onReload}>
    <Suspense fallback={<MoonLoading onReload={onReload} />}><Panel /></Suspense>
  </MoonErrorBoundary>;
}
