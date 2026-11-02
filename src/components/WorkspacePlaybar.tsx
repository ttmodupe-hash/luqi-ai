import { useEffect, useRef, useState } from 'react';
import { Compass, Moon, Sparkles, Wifi, WifiOff, X } from 'lucide-react';
import { useLocation } from 'react-router';
import DiscoveryDeck from './DiscoveryDeck';

export function readCalmPreference() {
  try { return localStorage.getItem('luqi:calm-mode') === 'true'; } catch { return false; }
}

export default function WorkspacePlaybar({ calm, onCalm }: { calm: boolean; onCalm: (value: boolean) => void }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => { if (dialog.current?.open) dialog.current.close(); }, [location.pathname]);
  return <>
    <div className="luqi-playbar" aria-label="Luqi experience controls">
      <button ref={trigger} type="button" className="luqi-playbar-explore" onClick={() => dialog.current?.showModal()}>
        <Compass size={17} aria-hidden="true" /><span>Explore something</span><Sparkles size={13} aria-hidden="true" /></button>
      <span className={'luqi-device-connection' + (online ? '' : ' is-offline')} title="Device connection only; service and AI availability are separate.">
        {online ? <Wifi size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}{online ? 'Device online' : 'Device offline'}</span>
      <button type="button" className="luqi-calm-toggle" aria-pressed={calm} onClick={() => onCalm(!calm)}>
        <Moon size={14} aria-hidden="true" />{calm ? 'Calm mode on' : 'Calm mode'}</button>
    </div>
    <dialog ref={dialog} className="luqi-discovery-dialog" aria-label="Explore Luqi" onClose={() => trigger.current?.focus()}>
      <div className="luqi-discovery-close"><span>YOUR LUQI, YOUR WAY</span><button type="button" aria-label="Close discovery" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
      <DiscoveryDeck compact />
    </dialog>
  </>;
}
