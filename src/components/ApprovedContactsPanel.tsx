import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AccountSession } from '../lib/private-conversations';
import { p2pClient } from '../lib/p2p-client';
import type { P2PApprovedContact } from '../../contracts/p2p';

export default function ApprovedContactsPanel({ session, close }: {
  session: AccountSession | null; close: () => void;
}) {
  const [contacts, setContacts] = useState<P2PApprovedContact[]>([]);
  const [state, setState] = useState<'checking' | 'ready' | 'disabled' | 'unavailable'>('checking');
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!session) return;
    let current = true;
    const api = p2pClient(session.token);
    void (async () => {
      const status = await api.status();
      if (!current) return;
      if (!status.enabled) { setState('disabled'); return; }
      const result = await api.contacts();
      if (current) { setContacts(result.contacts); setState('ready'); }
    })().catch(() => { if (current) { setContacts([]); setState('unavailable'); } });
    return () => { current = false; };
  }, [session?.token]);
  const needle = query.trim().normalize('NFKC').toLocaleLowerCase();
  const found = contacts.filter(person => person.name.normalize('NFKC').toLocaleLowerCase().includes(needle));
  return <div className="luqi-approved-contacts">
    <p>Only mutually approved people can exchange private messages. Searching a name does not grant access.</p>
    {!session ? <>
      <p>Use your existing Luqi account for Chat, Notes and Circles.</p>
      <Link to="/login" onClick={close}>Sign in to Luqi</Link>
    </> : <>
      <p className="luqi-collaboration-session">You are signed in to Luqi. Circles uses this same account.</p>
      {state === 'checking' && <p role="status">Checking your approved contacts…</p>}
      {state === 'disabled' && <p role="status">Peer messaging is not available on this release yet. Your Luqi sign-in is still active.</p>}
      {state === 'unavailable' && <p role="status">Your contacts could not be checked. Close and reopen this panel to try again. No message was sent.</p>}
      {state === 'ready' && <>
        <label>Find an approved contact<input type="search" value={query} maxLength={120}
          onChange={event => setQuery(event.target.value)} autoComplete="off" /></label>
        <ul aria-label="Your approved contacts">{found.map(person => <li key={person.circleId}>
          <Link to="/p2p" onClick={close}>{person.name}</Link>
          <span>Approved contact · active Luqi account</span>
        </li>)}</ul>
        {!found.length && <p>{contacts.length ? 'No approved contact matches this name.' : 'No mutually approved contacts yet. Private invitations require approval from both people.'}</p>}
      </>}
      <Link to="/p2p" onClick={close}>Open your circles</Link>
    </>}
    <p className="luqi-collaboration-privacy">An active account does not mean someone is online. This release shares no online status or last-seen times.</p>
    <p className="luqi-collaboration-privacy">Name discovery beyond approved contacts and multi-person group chat are still in development.</p>
  </div>;
}
