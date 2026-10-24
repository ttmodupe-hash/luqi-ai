import { Component, Suspense, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

type Props = { children: ReactNode; onReload: () => void };

/** Catch render/import failures without displaying raw diagnostic content.
 * Never retry automatically: a reload discards in-memory sessions and drafts.
 */
class PageErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="luqi-info" role="alert" aria-labelledby="page-load-error">
      <h1 id="page-load-error">This page could not load</h1>
      <p>Your connection may have changed, or a newer version of LUQI may be available.</p>
      <p>Reloading clears unsaved text and in-memory sign-in. It does not resubmit an AI question or start a payment.</p>
      <button className="luqi-secondary" type="button" onClick={this.props.onReload}>Reload page</button>
      <p><Link to="/start">Back to getting started</Link></p>
    </section>;
    return this.props.children;
  }
}

export default function RouteLoadBoundary({ children, onReload = () => window.location.reload() }:
  { children: ReactNode; onReload?: () => void }) {
  const { pathname } = useLocation();
  // Reset on route changes so users can leave a failed tool. Never keep the
  // previous route's private account view visible behind a new loading screen.
  return <PageErrorBoundary key={pathname} onReload={onReload}>
    <Suspense fallback={<section className="luqi-info" role="status" aria-live="polite" aria-busy="true">
      <h1>Loading this tool…</h1>
      <p>Only the selected tool is being downloaded. You can still use the navigation.</p>
    </section>}>
      {children}
    </Suspense>
  </PageErrorBoundary>;
}
