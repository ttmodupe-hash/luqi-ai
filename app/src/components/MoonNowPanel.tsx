import { Component, Suspense, lazy, useState, type ComponentType, type ReactNode } from 'react';

export type MoonModule = { default: ComponentType };
const loadMoon = (): Promise<MoonModule> => import('./MoonNowContent');
const reloadPage = () => window.location.reload();
const frame = { minHeight: 380, margin: '1.5rem 0' };

function ReloadAction({ onReload }: { onReload: () => void }) {
  return <><p>Reloading clears unsaved text and in-memory sign-in. Copy important drafts first.</p>
    <button type="button" className="luqi-secondary" onClick={onReload}>Reload page</button></>;
}
function MoonLoading({ onReload }: { onReload: () => void }) {
  return <section className="luqi-info" style={frame} aria-label="Moon tracker loading">
    <h2>Moon now</h2>
    <p role="status" aria-live="polite">Loading the live Moon calculations…</p>
    <p>This panel opens automatically. No sign-in or location is required.</p>
    <details><summary>Taking longer than expected?</summary><ReloadAction onReload={onReload} /></details>
  </section>;
}

/** Isolate failure to the panel, never exposing rejected URLs or clearing drafts.
 * Recovery is explicit: no automatic reload, retry or provider call. */
class MoonErrorBoundary extends Component<{ children: ReactNode; onReload: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="luqi-info" style={frame} aria-label="Moon tracker recovery">
      <h2>Moon now</h2>
      <p role="alert">The Moon tracker could not load. Your other Luqi tools are still available.</p>
      <p>Check your connection or reload the latest release.</p>
      <ReloadAction onReload={this.props.onReload} />
    </section>;
    return this.props.children;
  }
}

/** Download automatically in place. Deferred bytes still count in total transfer. */
export default function MoonNowPanel({ loader = loadMoon, onReload = reloadPage }:
  { loader?: () => Promise<MoonModule>; onReload?: () => void }) {
  const [Panel] = useState(() => lazy(loader));
  return <MoonErrorBoundary onReload={onReload}>
    <Suspense fallback={<MoonLoading onReload={onReload} />}><Panel /></Suspense>
  </MoonErrorBoundary>;
}
