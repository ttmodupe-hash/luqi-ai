import { useEffect, useRef, useState } from "react";
import { conversationClient, ConversationError, downloadConversationExport, downloadPrivateNotesExport, type AccountSession, type Conversation, type SavedMessage } from "../lib/private-conversations";
import AccountAccessForm from '../components/AccountAccessForm';
import AccountPasswordForm from '../components/AccountPasswordForm';

const modes = ["Luqi Prime — General", "Dr. Kwame — STEM", "Amina — Trade", "Chidi — Networks"];
const control = "rounded-lg border border-slate-500 bg-slate-900 p-3 text-white disabled:opacity-50";

export default function CompanionPage({ initialMode = 'signin' }: { initialMode?: 'signin' | 'signup' }) {
  // The session is deliberately held in memory; leaving this page requires signing in again.
  const [session, setSession] = useState<AccountSession | null>(null);
  const [accessMode, setAccessMode] = useState(initialMode);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [title, setTitle] = useState("");
  const [personalityId, setPersonalityId] = useState(1);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [moreConversations, setMoreConversations] = useState(false);
  const [moreMessages, setMoreMessages] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState(false);
  const epoch = useRef(0);
  const locked = useRef(false);
  const notesExport = useRef<AbortController | null>(null);
  useEffect(() => () => { epoch.current++; notesExport.current?.abort(); }, []);

  function clearSession() {
    notesExport.current?.abort(); notesExport.current = null;
    epoch.current++; locked.current = false;
    setSession(null); setConversations([]); setSelected(null);
    setMessages([]); setDraft(""); setTitle(""); setUncertain(false); setBusy(false); setPasswordBusy(false);
    setMoreConversations(false); setMoreMessages(false); setDeletePrompt(false); setNotice("");
  }
  async function run(action: (current: () => boolean) => Promise<void>, write = false, writeFailure?: string, readFailure?: string) {
    if (locked.current || passwordBusy) return;
    locked.current = true; setBusy(true); setNotice("");
    const version = epoch.current;
    const current = () => version === epoch.current;
    try { await action(current); }
    catch (error) {
      if (!current()) return;
      if (error instanceof ConversationError && error.status === 401) {
        clearSession(); setNotice("Sign-in failed or your session expired. Please sign in again.");
      } else if (error instanceof ConversationError && error.status === 429 && error.retryAfter) {
        setNotice(`Too many sign-in attempts. Wait ${error.retryAfter} seconds before trying again. We will not retry automatically.`);
      } else {
        if (write) setUncertain(true);
        setNotice(write
          ? writeFailure ?? "Save could not be confirmed. Your draft is retained. Refresh saved history and check for duplicates before trying again."
          : readFailure ?? "Unable to load data. Please try again. No AI reply has been generated.");
      }
    } finally { if (current()) { locked.current = false; setBusy(false); } }
  }
  function loadConversations(older = false) {
    if (!session) return;
    const api = conversationClient(session.token);
    void run(async current => {
      const result = await api.list(older ? conversations.at(-1)?.id : undefined);
      const history = !older && selected ? await api.messages(selected) : null;
      if (!current()) return;
      setConversations(previous => older ? [...previous, ...result.conversations] : result.conversations);
      setMoreConversations(result.conversations.length === 50);
      if (history) { setMessages([...history.messages].reverse()); setMoreMessages(history.messages.length === 50); }
      if (!older) { setUncertain(false); setNotice("Saved history refreshed. Check your retained draft before saving it again."); }
    });
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-slate-100">
    <header><h1 className="text-3xl font-bold">Companion conversations</h1>
      <p className="mt-2 text-slate-300">Save private conversation notes to your account. AI replies and automatic learning are currently disabled.</p>
      <p className="mt-2 text-sm text-slate-400">Saved notes are accessible to storage administrators; this is not end-to-end encryption. Signing out clears this page, but does not delete saved notes.</p>
      <p className="mt-2 text-sm text-slate-400">After signing in, you can change your password using your current password and download all your saved conversations, their messages and your saved memories together. This notes archive excludes account credentials, other modules, unsaved drafts and backups.</p>
    </header>
    {notice && <p role="status" className="rounded-lg border border-amber-500 p-3">{notice}</p>}
    {!session ? <AccountAccessForm initialMode={accessMode} onAuthenticated={result => {
      void run(async current => {
        setAccessMode('signin'); setSession(result);
        const data = await conversationClient(result.token).list();
        if (current()) { setConversations(data.conversations); setMoreConversations(data.conversations.length === 50); }
      }, false, undefined, 'You are signed in, but saved history could not be loaded. Use Refresh saved history to try again.');
    }} /> : <>
      <div className="flex flex-wrap items-center gap-3"><span className="break-all">{session.user.email}</span>
        <button className={control} disabled={passwordBusy} onClick={clearSession}>Sign out</button>
        <button className={control} disabled={busy || passwordBusy} onClick={() => loadConversations()}>Refresh saved history</button>
      </div>
      <AccountPasswordForm token={session.token} email={session.user.email}
        disabled={busy || uncertain || !!draft || !!title} onBusyChange={setPasswordBusy}
        onSessionEnd={message => { clearSession(); setNotice(message); }} />
      <section className="space-y-2 rounded-lg border border-slate-700 p-4" aria-label="Download all private notes">
        <p className="text-sm text-slate-300">Download every saved conversation and your memories, including older history beyond the visible list. Keep the JSON file private. Limits: 500 conversations, 5,000 messages, 5,000 memories and 4 MiB of saved text. Larger archives are refused without truncation; export individual conversations instead.</p>
        <button type="button" className={control} disabled={busy || passwordBusy || uncertain || !!draft} onClick={() => {
          void run(async current => {
            const controller = new AbortController(); notesExport.current = controller;
            try {
              const data = await conversationClient(session.token).exportAll(controller.signal);
              if (!current()) return;
              downloadPrivateNotesExport(data);
              setNotice('All saved notes download started. Keep the downloaded file private.');
            } catch (error) {
              if (current() && error instanceof ConversationError && [422, 429].includes(error.status)) {
                setNotice(error.status === 422
                  ? 'Your saved notes exceed the archive limits. No partial export was downloaded. Export individual conversations instead; saved notes are unchanged.'
                  : 'The notes exporter is busy. No file was downloaded. Try again later; we will not retry automatically.');
                return;
              }
              throw error;
            } finally { if (notesExport.current === controller) notesExport.current = null; }
          }, false, undefined, 'All-notes export could not be completed. No file was downloaded. Your saved notes are unchanged.');
        }}>Download all saved notes</button>
      </section>
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <form className="space-y-3" onSubmit={event => {
            event.preventDefault();
            void run(async current => {
              const saved = await conversationClient(session.token).create(title.trim(), personalityId);
              if (!current()) return;
              setConversations(previous => [{ id: saved.id, title: title.trim(), personalityId }, ...previous]);
              setDeletePrompt(false); setSelected(saved.id); setMessages([]); setMoreMessages(false); setTitle(""); setDraft(""); setNotice("Conversation saved.");
            }, true);
          }}>
            <label className="block">Conversation title<input className={`${control} mt-1 w-full`} maxLength={500} required disabled={busy || passwordBusy} value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label className="block">Topic<select className={`${control} mt-1 w-full`} disabled={busy || passwordBusy} value={personalityId} onChange={e => setPersonalityId(Number(e.target.value))}>{modes.map((mode, i) => <option key={mode} value={i + 1}>{mode}</option>)}</select></label>
            <button className={control} disabled={busy || passwordBusy || uncertain || !title.trim() || !!draft}>Create conversation</button>
          </form>
          <h2 className="text-xl">Saved conversations</h2>
          <p className="text-sm text-slate-400">Save or clear your draft before changing conversations.</p>
          <ul className="space-y-2">{conversations.map(item => <li key={item.id}><button className={`${control} w-full wrap-break-word text-left`} aria-pressed={selected === item.id} disabled={busy || passwordBusy || !!draft || uncertain} onClick={() => {
            setDeletePrompt(false); setSelected(item.id); setMessages([]); setMoreMessages(false);
            void run(async current => {
              const result = await conversationClient(session.token).messages(item.id);
              if (current()) { setMessages([...result.messages].reverse()); setMoreMessages(result.messages.length === 50); }
            });
          }}>{item.title}</button></li>)}</ul>
          {moreConversations && <button className={control} disabled={busy || passwordBusy} onClick={() => loadConversations(true)}>Older conversations</button>}
        </aside>
        <section className="min-w-0 space-y-4" aria-label="Conversation messages" aria-busy={busy}>
          {!selected ? <p>Select or create a conversation to save notes.</p> : <>
            <h2 className="text-xl">Saved messages</h2>
            <section className="space-y-2" aria-label="Export private notes">
              <p className="text-sm text-slate-400">Download this conversation's saved messages and your linked memories as a JSON file on this device. Keep the file private. Unsaved drafts are excluded.</p>
              <button type="button" className={control} disabled={busy || passwordBusy || uncertain || !!draft} onClick={() => {
                const exportingId = selected;
                void run(async current => {
                  try {
                    const data = await conversationClient(session.token).export(exportingId);
                    if (!current()) return;
                    downloadConversationExport(data);
                    setNotice("Export download started. Keep the downloaded file private.");
                  } catch (error) {
                    if (current() && error instanceof ConversationError && error.status === 422) {
                      setNotice("This conversation exceeds the export limit (1,000 messages, 1,000 linked memories or 1 MiB of text). No partial export was downloaded. Your saved notes are unchanged.");
                      return;
                    }
                    throw error;
                  }
                }, false, undefined, "Export could not be completed. No file was downloaded. Your saved notes are unchanged.");
              }}>Export selected conversation</button>
            </section>
            {!deletePrompt ? <button type="button" className={control} disabled={busy || passwordBusy || uncertain || !!draft} onClick={() => setDeletePrompt(true)}>Delete selected conversation</button> :
              <section className="space-y-3 rounded-lg border border-red-400 p-4" aria-label="Confirm conversation deletion">
                <p>Delete this conversation, all its saved messages and your linked memories? This cannot be undone in the app. Copies in backups, if any, are not erased by this action.</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={control} disabled={busy || passwordBusy || uncertain || !!draft} onClick={() => {
                    const deletingId = selected;
                    void run(async current => {
                      // Clear the active view while awaiting confirmation. Keep the list
                      // entry until the server confirms; a lost response needs refresh.
                      setSelected(null); setMessages([]); setMoreMessages(false); setDeletePrompt(false);
                      await conversationClient(session.token).remove(deletingId);
                      if (!current()) return;
                      setConversations(previous => previous.filter(item => item.id !== deletingId));
                      setNotice("Conversation, saved messages and your linked memories deleted from active storage.");
                    }, true, "Deletion could not be confirmed. Refresh saved history before trying again. No automatic retry was made.");
                  }}>Confirm deletion</button>
                  <button type="button" autoFocus className={control} disabled={busy || passwordBusy} onClick={() => setDeletePrompt(false)}>Cancel deletion</button>
                </div>
              </section>}

            {moreMessages && <button className={control} disabled={busy || passwordBusy} onClick={() => void run(async current => {
              const result = await conversationClient(session.token).messages(selected, messages[0]?.id);
              if (current()) { setMessages(previous => [...result.messages].reverse().concat(previous)); setMoreMessages(result.messages.length === 50); }
            })}>Older messages</button>}
            <ol className="space-y-3">{messages.map(message => <li key={message.id} className="rounded-lg border border-slate-700 p-4"><span className="text-sm text-slate-400">{message.role} · saved #{message.id}</span><p className="whitespace-pre-wrap wrap-break-word">{message.content}</p></li>)}</ol>
            <form className="space-y-3" onSubmit={event => {
              event.preventDefault();
              const content = draft.trim();
              if (!content || uncertain) return;
              void run(async current => {
                const saved = await conversationClient(session.token).save(selected, content);
                if (!current()) return;
                setMessages(previous => [...previous, { id: saved.id, role: saved.role, content, createdAt: null }]);
                setDraft(""); setNotice("Message saved to your account. AI replies remain disabled.");
              }, true);
            }}>
              <label className="block">Your message<textarea className={`${control} mt-1 min-h-32 w-full`} maxLength={8000} required disabled={busy || passwordBusy} value={draft} onChange={e => setDraft(e.target.value)} /></label>
              <p className="text-sm text-slate-400">{draft.length}/8,000 characters. Saving a message does not generate an AI response.</p>
              <button className={control} disabled={busy || passwordBusy || uncertain || !draft.trim()}>Save message</button>
              <button type="button" className={`${control} ml-2`} disabled={busy || passwordBusy} onClick={() => setDraft("")}>Clear draft</button>
            </form>
          </>}
        </section>
      </div>
    </>}
  </main>;
}
