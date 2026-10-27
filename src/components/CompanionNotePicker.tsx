import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { conversationClient, type Conversation, type SavedMessage } from '../lib/private-conversations';
import { MAX_SHARED_COMPANION_NOTE_CHARS } from '../lib/companion-context';

export type SharedCompanionNote = { conversationId: number; messageId: number; title: string; content: string };

type Props = {
  token: string;
  disabled: boolean;
  selected: SharedCompanionNote | null;
  onSelect: (note: SharedCompanionNote | null) => void;
};

/** Explicitly opt-in private-note selection. No provider calls, local storage,
 * silent truncation, auto loading or automatic memory learning.
 */
export default function CompanionNotePicker({ token, disabled, selected, onSelect }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [moreConversations, setMoreConversations] = useState(false);
  const [moreMessages, setMoreMessages] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'ready' | 'error'>('idle');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, [token]);

  async function guarded(operation: () => Promise<void>) {
    if (inFlight.current || disabled || !token) return;
    inFlight.current = true; setLoading(true); setStatus('');
    try { await operation(); }
    catch {
      if (mounted.current) {
        setPhase('error');
        setStatus('Saved notes could not be loaded. No notes were changed or sent to AI.');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  function loadConversations(older = false) {
    if (older && (!moreConversations || !conversations.length || conversations.length >= 200)) return;
    void guarded(async () => {
      const page = (await conversationClient(token).list(older ? conversations.at(-1)?.id : undefined)).conversations;
      if (!mounted.current) return;
      setConversations(current => older
        ? [...current, ...page.filter(item => !current.some(old => old.id === item.id))].slice(0, 200)
        : page);
      setMoreConversations(page.length === 50 && (!older || conversations.length + page.length < 200));
      setPhase('ready');
    });
  }

  function openConversation(item: Conversation) {
    onSelect(null);
    setActive(item); setMessages([]); setMoreMessages(false);
    void guarded(async () => {
      const page = (await conversationClient(token).messages(item.id)).messages;
      if (!mounted.current) return;
      setMessages(page); setMoreMessages(page.length === 50);
      setPhase('ready');
    });
  }

  function loadOlderMessages() {
    if (!active || !moreMessages || !messages.length || messages.length >= 200) return;
    void guarded(async () => {
      const page = (await conversationClient(token).messages(active.id, messages.at(0)?.id)).messages;
      if (!mounted.current) return;
      setMessages(current => [...page.filter(item => !current.some(old => old.id === item.id)), ...current].slice(-200));
      setMoreMessages(page.length === 50 && messages.length + page.length < 200);
      setPhase('ready');
    });
  }

  return <section className="luqi-companion-notes" aria-label="Choose a private note for Luqi">
    <p>Luqi does not read your saved notes automatically. Choose one short note yourself; sharing it with an AI provider is a separate, one-request choice.</p>
    <div className="luqi-companion-note-actions">
      <button type="button" disabled={disabled || loading} onClick={() => loadConversations()}>
        {loading ? 'Loading notes…' : phase === 'idle' ? 'Load my saved notes' : 'Refresh saved notes'}
      </button>
      <Link to="/companion">Create or edit private notes</Link>
    </div>
    {status && <p role="alert">{status}</p>}
    {phase === 'ready' && !conversations.length && <p>No saved notes found. You can create one in private notes.</p>}
    {conversations.length > 0 && <div className="luqi-companion-note-list" role="group" aria-label="Saved note conversations">
      {conversations.map(item => <button type="button" key={item.id} disabled={disabled || loading}
        aria-pressed={active?.id === item.id}
        onClick={() => openConversation(item)}>{item.title || 'Untitled conversation'}</button>)}
    </div>}
    {moreConversations && <button type="button" disabled={disabled || loading} onClick={() => loadConversations(true)}>
      Load older note conversations
    </button>}
    {active && <div>
      <p>Choose a message you wrote in <strong>{active.title || 'this conversation'}</strong>. Long notes cannot be silently shortened.</p>
      {messages.length === 0 && phase === 'ready' && <p>No messages in this saved conversation yet.</p>}
      <div className="luqi-companion-note-messages" role="group" aria-label="Saved note messages">
        {messages.filter(message => message.role === 'user').map(message => {
          const content = message.content.trim();
          const usable = content.length > 0 && content.length <= MAX_SHARED_COMPANION_NOTE_CHARS;
          return <div key={message.id} className="luqi-companion-note-message">
            <p>{content}</p>
            <button type="button" disabled={disabled || loading || !usable}
              aria-pressed={selected?.conversationId === active.id && selected.messageId === message.id}
              onClick={() => onSelect({ conversationId: active.id, messageId: message.id,
                title: active.title || 'Saved note', content })}>
              {usable ? 'Select this note' : 'Note too long to share'}
            </button>
          </div>;
        })}
      </div>
      {moreMessages && <button type="button" disabled={disabled || loading} onClick={loadOlderMessages}>
        Load older note messages
      </button>}
    </div>}
    {selected && <div className="luqi-companion-note-selected">
      <strong>Selected — not yet shared:</strong>
      <p>{selected.content}</p>
      <button type="button" disabled={disabled || loading} onClick={() => onSelect(null)}>Clear selected note</button>
    </div>}
  </section>;
}
