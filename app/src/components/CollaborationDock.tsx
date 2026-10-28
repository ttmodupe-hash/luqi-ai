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
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [location.pathname, customer?.session?.token]);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return <aside className={'luqi-collaboration-dock' + (location.pathname === '/chat' ? ' on-chat' : '')}
    aria-label="Circles and chat access">
    <button ref={trigger} type="button" className="luqi-collaboration-trigger"
      aria-label="Open Circles & Chat" aria-haspopup="dialog" aria-expanded={open}
      aria-controls="luqi-collaboration-panel" onClick={() => setOpen(true)}>
      <MessageCircle size={20} aria-hidden="true" /><span>Circles &amp; Chat</span>
    </button>
    <dialog ref={dialog} id="luqi-collaboration-panel" className="luqi-collaboration-panel"
      aria-labelledby="luqi-collaboration-title" onCancel={() => setOpen(false)}
      onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <header><h2 id="luqi-collaboration-title">Circles &amp; Chat</h2>
        <button type="button" aria-label="Close Circles & Chat" onClick={() => setOpen(false)}>
          <X size={20} aria-hidden="true" />
        </button></header>
      {open && <RouteLoadBoundary><Contacts key={customer?.session?.token ?? 'guest'}
        session={customer?.session ?? null} close={() => setOpen(false)} /></RouteLoadBoundary>}
    </dialog>
  </aside>;
}
