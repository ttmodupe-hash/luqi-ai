import { lazy } from 'react';
import { Link, useLocation } from 'react-router';
import AiPilotPage from './AiPilotPage';
import RouteLoadBoundary from '../components/RouteLoadBoundary';
import '../chat-workspace.css';
const CivicEvidenceDesk = lazy(() => import('./CivicEvidenceDesk'));
const CivicEvidenceChat = lazy(() => import('../components/CivicEvidenceChat'));

/** One shared Chat workspace. Civic source context is a validated record ID, never URL-supplied instructions. */
export default function LuqiChatWorkspacePage() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const evidence = query.getAll('evidence');
  if (evidence.length) return <div className="luqi-chat-main"><RouteLoadBoundary>
    <CivicEvidenceChat key={location.search} claimId={evidence.length === 1 ? evidence[0] : ''} />
  </RouteLoadBoundary></div>;
  if (query.get('civic') === '1') return <div className="luqi-chat-main luqi-chat-main-civic"><RouteLoadBoundary><CivicEvidenceDesk /></RouteLoadBoundary></div>;
  return <div className="luqi-chat-main">
    <nav className="luqi-chat-workspace-links" aria-label="Evidence-based civic support">
      <Link to="/chat?civic=1">Civic evidence — understand public records and voting information</Link>
    </nav>
    <AiPilotPage embedded workspaceMode />
    <nav className="luqi-chat-workspace-links" aria-label="More Luqi support">
      <Link to="/ask">Explore Africa and plan a goal locally</Link>
      <Link to="/companion">Open saved private notes</Link>
      <Link to="/service-status">Service status</Link>
    </nav>
  </div>;
}
