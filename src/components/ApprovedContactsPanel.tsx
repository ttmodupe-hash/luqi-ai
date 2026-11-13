import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AccountSession } from '../lib/private-conversations';
import { p2pClient } from '../lib/p2p-client';
import type { P2PApprovedContact } from '../../contracts/p2p';
import type { ContactPresenceControls } from './useContactPresence';
import './contact-presence-status.css';

export default function ApprovedContactsPanel({ session, presence }: {
  session: AccountSession | null; presence?: ContactPresenceControls;
}) {
  const [contacts, setContacts] = useState<P2PApprovedContact[]>([]);
  // A new account can render before passive effects clear the previous roster.
  const [rosterToken, setRosterToken] = useState<string | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'disabled' | 'unavailable'>('checking');
  const [eligible, setEligible] = useState(false);
  // Search terms are private too: never carry account A's lookup into B's roster.
  const [search, setSearch] = useState<{ token: string; value: string } | null>(null);
  const [checkedAt, setCheckedAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    setSearch(null);
    if (!session) { setRosterToken(null); return; }
    let current = true, pending = false, verified = false, epoch = 0;
    setContacts([]); setCheckedAt(0); setEligible(false); setState('checking');
    setRosterToken(session.token);
    const api = p2pClient(session.token);
    const visible = () => document.visibilityState !== 'hidden';
    const refresh = async () => {
      if (!current || pending || !visible()) return;
      if (!navigator.onLine) { setContacts([]); setState('unavailable'); return; }
      pending = true; const version = epoch;
      try {
        if (!verified) {
          const status = await api.status(); if (!current) return;
          if (!status.enabled) { setContacts([]); setState('disabled'); return; }
          setEligible(status.eligibility !== 'verification_needed'); verified = true;
        }
        const result = await api.contacts();
        if (current && version === epoch && navigator.onLine && visible()) { setContacts(result.contacts); setState('ready'); setCheckedAt(Date.now()); setNow(Date.now()); }
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
  // Render only the roster fetched for THIS account, including the first
  // commit of an account switch before React runs cleanup and effects.
  const rosterMatchesSession = !!session && rosterToken === session.token;
  const activeState = rosterMatchesSession ? state : 'checking';
  const activeContacts = rosterMatchesSession ? contacts : [];
  const activeEligible = rosterMatchesSession && eligible;
  const query = session && search?.token === session.token ? search.value : '';
  const needle = query.trim().normalize('NFKC').toLocaleLowerCase();
  const fresh = rosterMatchesSession && checkedAt > 0 && now >= checkedAt && now - checkedAt < 40_000;
  const found = activeContacts.filter(person => person.name.normalize('NFKC').toLocaleLowerCase().includes(needle));
  const online = fresh ? activeContacts.filter(person => person.presence === 'online').length : 0;
  return <div className="luqi-approved-contacts">
    {!session ? <>
      <p className="luqi-contacts-intro">Your people, here in Luqi.</p>
      <p>Sign in to see your approved contacts and their shared online status.</p>
      <Link to="/login">Sign in to see contacts</Link>
    </> : <>
      <button type="button" className="luqi-contacts-refresh" disabled={activeState === 'checking'} onClick={() => setRefreshVersion(n => n + 1)}>Refresh contacts</button>
      <p className="luqi-contacts-count">{activeState === 'ready' && fresh ? `${online} contact${online === 1 ? '' : 's'} online` : activeState === 'checking' ? 'Checking contacts…' : 'Online status not confirmed'}</p>
      {activeState === 'disabled' && <p>Contacts messaging is not enabled on this release.</p>}
      {activeState === 'unavailable' && <p>Contacts could not be refreshed. No online status has been assumed.</p>}
      {activeState === 'ready' && <>
        <label className="luqi-contact-search">Find a contact<input type="search" value={query} maxLength={120}
          onChange={event => setSearch({ token: session.token, value: event.target.value })} autoComplete="off" /></label>
        <ul aria-label="Your approved contacts">{found.map(person => {
          const status = fresh ? person.presence : 'unknown';
          const label = status === 'online' ? 'Online' : status === 'away' ? 'Away' : status === 'offline' ? 'Offline' : status === 'not_shared' ? 'Status not shared' : 'Status not confirmed';
          return <li key={person.circleId} className="luqi-contact-person">
            <span className={'luqi-contact-avatar is-' + status} aria-hidden="true">{person.name.slice(0, 1).toLocaleUpperCase()}<i /></span>
            <div><Link to={'/chat/people?circle=' + encodeURIComponent(person.circleId)}>{person.name}</Link><small>{label}</small></div>
          </li>;
        })}</ul>
        {found.length > 0 && <p className="luqi-people-in-app-hint">Select a person to open their private conversation inside Luqi.</p>}
        {!found.length && <p>{activeContacts.length ? 'No approved contact matches this name.' : 'No mutually approved contacts yet. Add a private invitation in your circles.'}</p>}
      </>}
      {presence && ((activeState === 'ready' && activeEligible) || presence.sharing) && <label className="luqi-presence-consent"><input type="checkbox" checked={presence.sharing}
        onChange={event => presence.setSharing(event.target.checked)} /> {activeState === 'ready' && activeEligible
          ? 'Share my online status from this tab'
          : 'Stop sharing my online status from this tab'}</label>}
      {presence?.sharing && activeState === 'ready' && activeEligible && presence.setAway && <button type="button" className="luqi-presence-mode"
        aria-pressed={presence.away === true} onClick={() => presence.setAway?.(!presence.away)}>
        {presence.away ? 'Show me as online' : 'Show me as away'}
      </button>}
      {presence?.sharing && activeState !== 'ready' && <p className="luqi-collaboration-privacy" role="status">
        Shared status is not confirmed. You can stop sharing from this tab.
      </p>}
      {rosterMatchesSession && presence?.message && (activeState === 'ready' || !presence.sharing) &&
        <p className="luqi-collaboration-privacy" role="status">{presence.message}</p>}
      <Link className="luqi-people-manage" to="/chat/people">Open private chat in Luqi</Link>
    </>}
    <p className="luqi-collaboration-privacy">Only mutually approved contacts. Updates every 30 seconds while visible. Online means a recent foreground signal. Away is your explicit choice. Offline means a previously shared signal expired after 75 seconds, not proof that a device is disconnected. Another Online tab can keep you online; hidden or unconfirmed status stays neutral. No last-seen history is shared.</p>
  </div>;
}
