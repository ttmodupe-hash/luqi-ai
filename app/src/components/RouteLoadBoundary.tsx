import { Component, Suspense, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

type Props = { children: ReactNode; onReload: () => void };
type FailureState = { failed: boolean; missingChunk: boolean };

/**
 * Fixed wording only: never include a rejected module URL, stack trace,
 * private account content or signed provider payload in customer messages.
 */
function isPublicChunkFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|loading chunk [\w-]+ failed|failed to load module script/i.test(message);
}

/** A failed lazy route never triggers automatic reload, retry or an AI call. */
class PageErrorBoundary extends Component<Props, FailureState> {
  state: FailureState = { failed: false, missingChunk: false };
  static getDerivedStateFromError(error: unknown): FailureState {
    return { failed: true, missingChunk: isPublicChunkFailure(error) };
  }
  render() {
    if (this.state.failed) return <section className="luqi-info" role="alert" aria-labelledby="page-load-error">
      <h1 id="page-load-error">This page could not load</h1>
      <p>{this.state.missingChunk
        ? 'This tab may be using files from an earlier Luqi release. Open the latest version by reloading when you are ready.'
        : 'Your connection may have changed, or a newer Luqi version may be available.'}</p>
      <p>Reloading clears unsaved text and in-memory sign-in. Copy important drafts first. It does not resubmit an AI question, government application or payment.</p>
      <button className="luqi-secondary" type="button" onClick={this.props.onReload}>Reload page</button>
      <p><Link to="/start">Back to getting started</Link></p>
    </section>;
    return this.props.children;
  }
}

export default function RouteLoadBoundary({ children, onReload = () => window.location.reload() }:
  { children: ReactNode; onReload?: () => void }) {
  const { pathname } = useLocation();
  // Reset on route changes so users can leave a failed tool. Never keep a
  // previous route's private account content behind a loading message.
  return <PageErrorBoundary key={pathname} onReload={onReload}>
    <Suspense fallback={<section className="luqi-info" role="status" aria-live="polite" aria-busy="true">
      <h1>Loading this tool…</h1>
      <p>Only the selected tool is being downloaded. You can still use the navigation.</p>
    </section>}>
      {children}
    </Suspense>
  </PageErrorBoundary>;
}
