import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, RefreshCw } from 'lucide-react';
import { conversationClient, type Conversation } from '../lib/private-conversations';

/** Opt-in preview of persisted, owner-scoped private notes; NOT AI chat
 * history. Authentication is handled by the shared in-memory account and
 * verified again on every API request. No background polling or auto retry.
 */
export default function SavedNotesPeek({ token, onNavigate }: { token: string; onNavigate: () => void }) {
  const [notes, setNotes] = useState<Conversation[]>([]);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [hasMore, setHasMore] = useState(false);
  const [shown, setShown] = useState(10);
  const [retryOlder, setRetryOlder] = useState(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  async function load(older = false) {
    if (inFlight.current || (!token.trim()) || (older && (!notes.length || !hasMore))) return;
    inFlight.current = true;
    setPhase('loading');
    setRetryOlder(older);
    try {
      // A single bounded GET, no hidden retries or customer uploads. The
      // underlying account request already enforces a 15-second deadline.
      const result = await conversationClient(token).list(older ? notes.at(-1)?.id : undefined);
      if (!alive.current) return;
      const page = result.conversations;
      setNotes(current => older
        ? [...current, ...page.filter(entry => !current.some(old => old.id === entry.id))].slice(0, 200)
        : page);
      setHasMore(page.length === 50 && (!older || notes.length + page.length < 200));
      setPhase('ready');
    } catch {
      if (alive.current) setPhase('error');
    } finally { inFlight.current = false; }
  }

  return <section className="luqi-saved-notes-peek" aria-labelledby="luqi-saved-notes-title">
    <div className="luqi-saved-notes-header">
      <h3 id="luqi-saved-notes-title"><BookOpen size={15} aria-hidden="true" /> Saved private notes</h3>
      <Link to="/companion" onClick={onNavigate}>Open notes</Link>
    </div>
    <p className="luqi-saved-notes-disclaimer">Stored separately from LUQIChat. Choose to load your own notes.</p>
    {phase === 'idle' && <button type="button" className="luqi-saved-notes-load" onClick={() => { void load(); }}>
      Load saved notes
    </button>}
    {phase === 'loading' && <p role="status" className="luqi-saved-notes-status">
      Loading saved notes… Your current Chat stays available.
    </p>}
    {phase === 'error' && <div role="alert" className="luqi-saved-notes-error">
      <p>Could not load saved notes. Your existing data has not been changed.</p>
      <button type="button" onClick={() => { void load(retryOlder); }}>
        <RefreshCw size={14} aria-hidden="true" /> Try again
      </button>
    </div>}
    {notes.length > 0 && <div className="luqi-saved-notes-list" role="list" aria-label="Saved note conversations">
      {notes.slice(0, shown).map(note => <div key={note.id} role="listitem">
        <Link to="/companion" title={note.title} onClick={onNavigate}>
          <BookOpen size={14} aria-hidden="true" /><span>{note.title}</span>
        </Link>
      </div>)}
    </div>}
    {phase === 'ready' && !notes.length && <p role="status" className="luqi-saved-notes-status">
      No saved notes on this account yet.
    </p>}
    {phase !== 'loading' && shown < notes.length && <button type="button" className="luqi-saved-notes-load"
      onClick={() => setShown(count => Math.min(count + 10, 200))}>
      Show more saved notes
    </button>}
    {phase === 'ready' && hasMore && shown >= notes.length && <button type="button" className="luqi-saved-notes-load"
      onClick={() => { void load(true); }}>
      Load older saved notes
    </button>}
  </section>;
}
