import { lazy } from 'react';
import RouteLoadBoundary from './RouteLoadBoundary';

const Content = lazy(() => import('./HomeDiscoveryContent'));

/** Keep discovery and creation on the homepage, automatically loaded in their
 * existing position without blocking the core shell, tool search or Moon. */
export default function HomeExtras() {
  return <RouteLoadBoundary loading={<section className="luqi-info" role="status" aria-live="polite">
    <p>Loading discovery and creator tools…</p>
  </section>}><Content /></RouteLoadBoundary>;
}
