import { lazy } from 'react';
import { useLocation } from 'react-router';
import { Users } from 'lucide-react';
import { useOptionalCustomerSession } from '../providers/customer-session';
import RouteLoadBoundary from './RouteLoadBoundary';
import type { ContactPresenceControls } from './useContactPresence';
import './collaboration-dock.css';

// A permanent part of Luqi's page, not a floating chatbot or modal.
// Guests make no private reads; only mutually approved contacts are displayed.
const Contacts = lazy(() => import('./ApprovedContactsPanel'));
export default function CollaborationDock({ presence }: { presence?: ContactPresenceControls }) {
  const customer = useOptionalCustomerSession();
  const location = useLocation();
  const onChat = location.pathname.startsWith('/chat') || location.pathname === '/p2p';
  return <aside className={'luqi-collaboration-dock' + (onChat ? ' on-chat' : '')}
    aria-label="Luqi contacts">
    <header className="luqi-people-heading">
      <span className="luqi-people-icon" aria-hidden="true"><Users size={21} /></span>
      <div>
        <p>YOUR PEOPLE · INSIDE LUQI</p>
        <h2>People &amp; private chat</h2>
      </div>
    </header>
    <section id="luqi-collaboration-panel" className="luqi-collaboration-panel" aria-label="Your contacts">
      <RouteLoadBoundary loading={<p className="luqi-collaboration-privacy" aria-busy="true">Loading contacts…</p>}>
        <Contacts key={customer?.session?.token ?? 'guest'} session={customer?.session ?? null} presence={presence} />
      </RouteLoadBoundary>
    </section>
  </aside>;
}
