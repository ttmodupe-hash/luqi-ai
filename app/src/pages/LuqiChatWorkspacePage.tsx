import { Link, useSearchParams } from 'react-router';
import AiPilotPage from './AiPilotPage';
import { getPanAfricanStudyPrompt } from '../services/panAfricanSovereignEngine';
import '../chat-workspace.css';

/** Chat-first view. Other working tools stay one click away in the sidebar.
 * A real reply still requires the existing shared customer login and consent.
 */
export default function LuqiChatWorkspacePage() {
  const [params] = useSearchParams();
  // Only three fixed study IDs are recognised; never execute or forward a URL prompt.
  const initialQuestion = getPanAfricanStudyPrompt(params.get('study'));
  return <div className="luqi-chat-main">
    <AiPilotPage embedded workspaceMode initialQuestion={initialQuestion ?? ''} />
    <nav className="luqi-chat-workspace-links" aria-label="More Luqi support">
      <Link to="/ask">Explore Africa and plan a goal locally</Link>
      <Link to="/companion">Open saved private notes</Link>
      <Link to="/service-status">Service status</Link>
    </nav>
  </div>;
}
