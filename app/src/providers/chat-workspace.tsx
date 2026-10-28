import { customerSessionBoundary } from '../lib/customer-session-boundary';
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PilotReply } from '../lib/ai-pilot';
import type { PilotConversationTurn } from '../lib/pilot-conversation';
import { useCustomerSession } from './customer-session';

/** Confirmed text replies only. No localStorage, cookies, indexedDB, URL
 * state, automatic model calls or private notes in this short-lived workspace.
 * A reload or account switch intentionally discards the entire history.
 */
export type ChatThread = {
  id: string;
  title: string;
  turns: PilotConversationTurn[];
  lastReply: PilotReply;
};
type ChatWorkspaceValue = {
  threads: ChatThread[];
  activeThread: ChatThread | null;
  selectionVersion: number;
  /** Provider acknowledgement is memory-only and scoped to the signed-in account. */
  providerAcknowledged: boolean;
  setProviderAcknowledged: (approved: boolean) => void;
  startNewChat: () => void;
  selectThread: (id: string) => void;
  forgetThread: (id: string) => void;
  recordConfirmedReply: (question: string, reply: PilotReply) => void;
};
const Context = createContext<ChatWorkspaceValue | null>(null);
const MAX_CHATS = 100; // Bounded in-tab recents; never advertised as a cloud archive.
const MAX_TURNS = 8; // The pilot shares a separate, shorter preview only with explicit consent.

export function ChatWorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useCustomerSession();
  const token = customerSessionBoundary(session);
  const tokenAtPaint = useRef(token);
  const nextId = useRef(0);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);

  // Hide a former identity synchronously during render and clear before paint.
  // Session expiry, sign-out and account switching all use this same boundary.
  const owned = token !== null && tokenAtPaint.current === token;
  const visibleThreads = owned ? threads : [];
  useLayoutEffect(() => {
    if (tokenAtPaint.current === token) return;
    tokenAtPaint.current = token;
    nextId.current = 0;
    setThreads([]);
    setActiveId(null);
    setAcknowledged(false);
    setSelectionVersion(version => version + 1);
  }, [token]);

  const setProviderAcknowledged = useCallback((approved: boolean) => {
    // Never carry an earlier account's consent across token changes.
    if (!token || tokenAtPaint.current !== token) return;
    setAcknowledged(approved === true);
  }, [token]);
  const providerAcknowledged = owned ? acknowledged : false;

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setSelectionVersion(version => version + 1);
  }, []);
  const selectThread = useCallback((id: string) => {
    if (!token || tokenAtPaint.current !== token || !threads.some(chat => chat.id === id)) return;
    setActiveId(id);
    setSelectionVersion(version => version + 1);
  }, [token, threads]);
  const forgetThread = useCallback((id: string) => {
    if (!token || tokenAtPaint.current !== token || !threads.some(chat => chat.id === id)) return;
    setThreads(current => current.filter(chat => chat.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setSelectionVersion(version => version + 1);
    }
  }, [token, threads, activeId]);
  const recordConfirmedReply = useCallback((question: string, reply: PilotReply) => {
    if (!token || tokenAtPaint.current !== token || !question.trim()) return;
    const safeQuestion = question.trim().slice(0, 6000);
    const nextTitle = safeQuestion.slice(0, 66).replace(/\s+/g, ' ');
    // Update only a current, known thread. Otherwise create a new in-tab chat.
    const targetId = activeId && visibleThreads.some(chat => chat.id === activeId)
      ? activeId : 'tab-' + (++nextId.current);
    setThreads(previous => {
      const existing = previous.find(chat => chat.id === targetId);
      const turns: PilotConversationTurn[] = [...(existing?.turns ?? []),
        { sender: 'user' as const, text: safeQuestion }, { sender: 'ai' as const, text: reply.response }].slice(-MAX_TURNS);
      const updated: ChatThread = { id: targetId, title: existing?.title ?? nextTitle, turns, lastReply: reply };
      return [updated, ...previous.filter(chat => chat.id !== targetId)].slice(0, MAX_CHATS);
    });
    setActiveId(targetId);
  }, [token, activeId, visibleThreads]);

  const activeThread = visibleThreads.find(chat => chat.id === activeId) ?? null;
  const value = useMemo<ChatWorkspaceValue>(() => ({
    threads: visibleThreads, activeThread, selectionVersion, providerAcknowledged, setProviderAcknowledged,
    startNewChat, selectThread, forgetThread, recordConfirmedReply,
  }), [visibleThreads, activeThread, selectionVersion, providerAcknowledged, setProviderAcknowledged,
    startNewChat, selectThread, forgetThread, recordConfirmedReply]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOptionalChatWorkspace() {
  return useContext(Context);
}
