import { useEffect, useRef, useState } from "react";
import { conversationClient, ConversationError, signIn, type Conversation, type SavedMessage } from "../lib/private-conversations";

const modes = ["Luqi Prime — General", "Dr. Kwame — STEM", "Amina — Trade", "Chidi — Networks"];
const control = "rounded-lg border border-slate-500 bg-slate-900 p-3 text-white disabled:opacity-50";

export default function CompanionPage() {
  // The session is deliberately held in memory; leaving this page requires signing in again.
  const [session, setSession] = useState<{ token: string; user: { email: string } } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [title, setTitle] = useState("");
  const [personalityId, setPersonalityId] = useState(1);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [moreConversations, setMoreConversations] = useState(false);
  const [moreMessages, setMoreMessages] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const epoch = useRef(0);
  const locked = useRef(false);
  useEffect(() => () => { epoch.current++; }, []);

  function clearSession() {
    epoch.current++; locked.current = false;
    setSession(null); setPassword(""); setEmail(""); setConversations([]); setSelected(null);
    setMessages([]); setDraft(""); setTitle(""); setUncertain(false); setBusy(false);
    setMoreConversations(false); setMoreMessages(false); setNotice("");
  }
  async function run(action: (current: () => boolean) => Promise<void>, write = false) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setNotice("");
    const version = epoch.current;
    const current = () => version === epoch.current;
    try { await action(current); }
    catch (error) {
      if (!current()) return;
      if (error instanceof ConversationError && error.status === 401) {
        clearSession(); setNotice("Sign-in failed or your session expired. Please sign in again.");
      } else {
        if (write) setUncertain(true);
        setNotice(write
          ? "Save could not be confirmed. Your draft is retained. Refresh saved history and check for duplicates before trying again."
          : "Unable to load data. Please try again. No AI reply has been generated.");
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
    </header>
    {notice && <p role="status" className="rounded-lg border border-amber-500 p-3">{notice}</p>}
    {!session ? <form className="max-w-md space-y-4" onSubmit={event => {
      event.preventDefault();
      void run(async current => {
        const result = await signIn(email, password);
        if (!current()) return;
        setPassword(""); setSession(result);
        const data = await conversationClient(result.token).list();
        if (current()) { setConversations(data.conversations); setMoreConversations(data.conversations.length === 50); }
      });
    }}>
      <h2 className="text-xl">Sign in to your existing LUQI account</h2>
      <label className="block">Email<input className={`${control} mt-1 w-full`} type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block">Password<input className={`${control} mt-1 w-full`} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button className={control} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="text-sm text-slate-400">This session lasts until you leave or reload this page. Account recovery requires your LUQI administrator.</p>
    </form> : <>
      <div className="flex flex-wrap items-center gap-3"><span className="break-all">{session.user.email}</span>
        <button className={control} onClick={clearSession}>Sign out</button>
        <button className={control} disabled={busy} onClick={() => loadConversations()}>Refresh saved history</button>
      </div>
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <form className="space-y-3" onSubmit={event => {
            event.preventDefault();
            void run(async current => {
              const saved = await conversationClient(session.token).create(title.trim(), personalityId);
              if (!current()) return;
              setConversations(previous => [{ id: saved.id, title: title.trim(), personalityId }, ...previous]);
              setSelected(saved.id); setMessages([]); setMoreMessages(false); setTitle(""); setDraft(""); setNotice("Conversation saved.");
            }, true);
          }}>
            <label className="block">Conversation title<input className={`${control} mt-1 w-full`} maxLength={500} required disabled={busy} value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label className="block">Topic<select className={`${control} mt-1 w-full`} disabled={busy} value={personalityId} onChange={e => setPersonalityId(Number(e.target.value))}>{modes.map((mode, i) => <option key={mode} value={i + 1}>{mode}</option>)}</select></label>
            <button className={control} disabled={busy || uncertain || !title.trim() || !!draft}>Create conversation</button>
          </form>
          <h2 className="text-xl">Saved conversations</h2>
          <p className="text-sm text-slate-400">Save or clear your draft before changing conversations.</p>
          <ul className="space-y-2">{conversations.map(item => <li key={item.id}><button className={`${control} w-full break-words text-left`} aria-pressed={selected === item.id} disabled={busy || !!draft || uncertain} onClick={() => {
            setSelected(item.id); setMessages([]); setMoreMessages(false);
            void run(async current => {
              const result = await conversationClient(session.token).messages(item.id);
              if (current()) { setMessages([...result.messages].reverse()); setMoreMessages(result.messages.length === 50); }
            });
          }}>{item.title}</button></li>)}</ul>
          {moreConversations && <button className={control} disabled={busy} onClick={() => loadConversations(true)}>Older conversations</button>}
        </aside>
        <section className="min-w-0 space-y-4" aria-label="Conversation messages" aria-busy={busy}>
          {!selected ? <p>Select or create a conversation to save notes.</p> : <>
            <h2 className="text-xl">Saved messages</h2>
            {moreMessages && <button className={control} disabled={busy} onClick={() => void run(async current => {
              const result = await conversationClient(session.token).messages(selected, messages[0]?.id);
              if (current()) { setMessages(previous => [...result.messages].reverse().concat(previous)); setMoreMessages(result.messages.length === 50); }
            })}>Older messages</button>}
            <ol className="space-y-3">{messages.map(message => <li key={message.id} className="rounded-lg border border-slate-700 p-4"><span className="text-sm text-slate-400">{message.role} · saved #{message.id}</span><p className="whitespace-pre-wrap break-words">{message.content}</p></li>)}</ol>
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
              <label className="block">Your message<textarea className={`${control} mt-1 min-h-32 w-full`} maxLength={8000} required disabled={busy} value={draft} onChange={e => setDraft(e.target.value)} /></label>
              <p className="text-sm text-slate-400">{draft.length}/8,000 characters. Saving a message does not generate an AI response.</p>
              <button className={control} disabled={busy || uncertain || !draft.trim()}>Save message</button>
              <button type="button" className={`${control} ml-2`} disabled={busy} onClick={() => setDraft("")}>Clear draft</button>
            </form>
          </>}
        </section>
      </div>
    </>}
  </main>;
}
