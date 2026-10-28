import { Link } from 'react-router';
import AiPilotPage from './AiPilotPage';
import '../chat-workspace.css';

/** Chat-first view. Other working tools stay one click away in the sidebar.
 * A real reply still requires the existing shared customer login and consent.
 */
export default function LuqiChatWorkspacePage() {
  return <div className="luqi-chat-main">
    <AiPilotPage embedded workspaceMode />
    <nav className="luqi-chat-workspace-links" aria-label="More Luqi support">
      <Link to="/ask">Explore Africa and plan a goal locally</Link>
      <Link to="/companion">Open saved private notes</Link>
      <Link to="/service-status">Service status</Link>
    </nav>
  </div>;
}
