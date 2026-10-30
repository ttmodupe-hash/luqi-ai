import { lazy, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useOptionalCustomerSession } from '../providers/customer-session';
import RouteLoadBoundary from './RouteLoadBoundary';
import type { ContactPresenceControls } from './useContactPresence';
import './collaboration-dock.css';

// Guests make no private reads; signed-in people see only their approved Luqi contacts.
const Contacts = lazy(() => import('./ApprovedContactsPanel'));
export default function CollaborationDock({ presence }: { presence?: ContactPresenceControls }) {
  const customer = useOptionalCustomerSession(), location = useLocation();
  const [open, setOpen] = useState(true);
  const panel = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => { setOpen(true); }, [location.pathname, customer?.session?.token]);
  return <aside className={'luqi-collaboration-dock' + (location.pathname === '/chat' ? ' on-chat' : '')}
    aria-label="Luqi contacts" onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); close(); }
    }}>
    <button ref={trigger} type="button" className="luqi-collaboration-trigger"
      aria-label="Contacts" aria-expanded={open}
      aria-controls="luqi-collaboration-panel" onClick={() => { if (open) close(); else setOpen(true); }}>
      <Users size={20} aria-hidden="true" /><span>Contacts</span>{open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
    </button>
    {open && <section ref={panel} id="luqi-collaboration-panel" className="luqi-collaboration-panel"
      aria-labelledby="luqi-collaboration-title" tabIndex={-1}>
      <h2 id="luqi-collaboration-title" className="luqi-sr-only">Your contacts</h2>
      {open && <RouteLoadBoundary loading={<p className="luqi-collaboration-privacy" aria-busy="true">Loading contacts…</p>}><Contacts key={customer?.session?.token ?? 'guest'}
        session={customer?.session ?? null} close={close} presence={presence} /></RouteLoadBoundary>}
    </section>}
  </aside>;
}
