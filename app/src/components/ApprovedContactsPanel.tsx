import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AccountSession } from '../lib/private-conversations';
import { p2pClient } from '../lib/p2p-client';
import type { P2PApprovedContact } from '../../contracts/p2p';
import type { ContactPresenceControls } from './useContactPresence';

export default function ApprovedContactsPanel({ session, close, presence }: {
  session: AccountSession | null; close: () => void; presence?: ContactPresenceControls;
}) {
  const [contacts, setContacts] = useState<P2PApprovedContact[]>([]);
  const [state, setState] = useState<'checking' | 'ready' | 'disabled' | 'unavailable'>('checking');
  const [eligible, setEligible] = useState(false);
  const [query, setQuery] = useState('');
  const [checkedAt, setCheckedAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    if (!session) return;
    let current = true, pending = false, verified = false, epoch = 0;
    setContacts([]); setCheckedAt(0); setState('checking');
    const api = p2pClient(session.token);
    const refresh = async () => {
      if (!current || pending || document.visibilityState === 'hidden') return;
      if (!navigator.onLine) { setContacts([]); setState('unavailable'); return; }
      pending = true; const version = epoch;
      try {
        if (!verified) {
          const status = await api.status(); if (!current) return;
          if (!status.enabled) { setContacts([]); setState('disabled'); return; }
          setEligible(status.eligibility !== 'verification_needed'); verified = true;
        }
        const result = await api.contacts();
        if (current && version === epoch && navigator.onLine && document.visibilityState !== 'hidden') { setContacts(result.contacts); setState('ready'); setCheckedAt(Date.now()); setNow(Date.now()); }
      } catch {
        if (current) { setContacts([]); setState('unavailable'); }
      } finally { pending = false; }
    };
    const changed = () => {
      epoch++; setContacts([]); setCheckedAt(0);
      if (document.visibilityState !== 'hidden') void refresh();
    };
    const offline = () => { epoch++; setContacts([]); setCheckedAt(0); setState('unavailable'); };
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    const clock = setInterval(() => setNow(Date.now()), 5_000);
    document.addEventListener('visibilitychange', changed); window.addEventListener('online', changed); window.addEventListener('offline', offline);
    return () => { current = false; clearInterval(timer); clearInterval(clock); document.removeEventListener('visibilitychange', changed); window.removeEventListener('online', changed); window.removeEventListener('offline', offline); };
  }, [session?.token, refreshVersion]);
  const needle = query.trim().normalize('NFKC').toLocaleLowerCase();
  const fresh = checkedAt > 0 && now >= checkedAt && now - checkedAt < 40_000;
  const found = contacts.filter(person => person.name.normalize('NFKC').toLocaleLowerCase().includes(needle));
  const online = fresh ? contacts.filter(person => person.presence === 'online').length : 0;
  return <div className="luqi-approved-contacts">
    {!session ? <>
      <p className="luqi-contacts-intro">Your people, here in Luqi.</p>
      <p>Sign in to see your approved contacts and their shared online status.</p>
      <Link to="/login" onClick={close}>Sign in to see contacts</Link>
    </> : <>
      <button type="button" className="luqi-contacts-refresh" disabled={state === 'checking'} onClick={() => setRefreshVersion(n => n + 1)}>Refresh contacts</button>
      <p className="luqi-contacts-count">{state === 'ready' && fresh ? `${online} contact${online === 1 ? '' : 's'} online` : state === 'checking' ? 'Checking contacts…' : 'Online status not confirmed'}</p>
      {state === 'disabled' && <p>Contacts messaging is not enabled on this release.</p>}
      {state === 'unavailable' && <p>Contacts could not be refreshed. No online status has been assumed.</p>}
      {state === 'ready' && <>
        <label className="luqi-contact-search">Find a contact<input type="search" value={query} maxLength={120}
          onChange={event => setQuery(event.target.value)} autoComplete="off" /></label>
        <ul aria-label="Your approved contacts">{found.map(person => {
          const status = fresh ? person.presence : 'unknown';
          const label = status === 'online' ? 'Online' : status === 'offline' ? 'Offline or away' : status === 'not_shared' ? 'Status not shared' : 'Status not confirmed';
          return <li key={person.circleId} className="luqi-contact-person">
            <span className={'luqi-contact-avatar is-' + status} aria-hidden="true">{person.name.slice(0, 1).toLocaleUpperCase()}<i /></span>
            <div><Link to={'/p2p?circle=' + encodeURIComponent(person.circleId)} onClick={close}>{person.name}</Link><small>{label}</small></div>
          </li>;
        })}</ul>
        {!found.length && <p>{contacts.length ? 'No approved contact matches this name.' : 'No mutually approved contacts yet. Add a private invitation in your circles.'}</p>}
        {presence && eligible && <label className="luqi-presence-consent"><input type="checkbox" checked={presence.sharing}
          onChange={event => presence.setSharing(event.target.checked)} /> Share my online status with approved contacts</label>}
        {presence?.message && <p className="luqi-collaboration-privacy" role="status">{presence.message}</p>}
      </>}
      <Link to="/p2p" onClick={close}>Manage contacts &amp; circles</Link>
    </>}
    <p className="luqi-collaboration-privacy">Only mutually approved contacts. Updates every 30 seconds while visible. Online means recent foreground activity; closed or background tabs may take up to 75 seconds to become away. No last-seen history is shared.</p>
  </div>;
}
