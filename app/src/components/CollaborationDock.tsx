import { lazy, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { MessageCircle, X } from 'lucide-react';
import { useOptionalCustomerSession } from '../providers/customer-session';
import RouteLoadBoundary from './RouteLoadBoundary';
import './collaboration-dock.css';

// No private account requests, cryptography bundle or contact names on startup.
const Contacts = lazy(() => import('./ApprovedContactsPanel'));
export default function CollaborationDock() {
  const customer = useOptionalCustomerSession(), location = useLocation();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => { setOpen(false); }, [location.pathname, customer?.session?.token]);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  return <aside className={'luqi-collaboration-dock' + (location.pathname === '/chat' ? ' on-chat' : '')}
    aria-label="Circles and chat access" onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); close(); }
    }}>
    <button ref={trigger} type="button" className="luqi-collaboration-trigger"
      aria-label="Open Circles & Chat" aria-expanded={open}
      aria-controls="luqi-collaboration-panel" onClick={() => { if (open) close(); else setOpen(true); }}>
      <MessageCircle size={20} aria-hidden="true" /><span className="luqi-collaboration-full-label">Circles &amp; Chat</span>
      <span className="luqi-collaboration-short-label">Circles</span>
    </button>
    {open && <section ref={panel} id="luqi-collaboration-panel" className="luqi-collaboration-panel"
      aria-labelledby="luqi-collaboration-title" tabIndex={-1}>
      <header><h2 id="luqi-collaboration-title">Circles &amp; Chat</h2>
        <button type="button" aria-label="Close Circles & Chat" onClick={close}>
          <X size={20} aria-hidden="true" />
        </button></header>
      {open && <RouteLoadBoundary><Contacts key={customer?.session?.token ?? 'guest'}
        session={customer?.session ?? null} close={close} /></RouteLoadBoundary>}
    </section>}
  </aside>;
}
