import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BookOpen, BriefcaseBusiness, ChevronLeft, ChevronRight, CircleHelp, Compass,
  FolderOpen, Globe2, GraduationCap, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen,
  PenLine, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useOptionalChatWorkspace } from '../providers/chat-workspace';
import { useOptionalCustomerSession } from '../providers/customer-session';
import '../chat-workspace.css';

const shortcuts = [
  { path: '/chat', label: 'LUQIChat', icon: MessageCircle },
  { path: '/business-desk', label: 'Business desk', icon: BriefcaseBusiness },
  { path: '/study-desk', label: 'Study desk', icon: GraduationCap },
  { path: '/content-studio', label: 'Content studio', icon: PenLine },
  { path: '/ask', label: 'Africa & travel guide', icon: Globe2 },
  { path: '/companion', label: 'Private notes', icon: BookOpen },
  { path: '/omega-tasks', label: 'Omega tools', icon: Compass },
] as const;

export default function ChatSidebar() {
  const workspace = useOptionalChatWorkspace();
  const customer = useOptionalCustomerSession();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState('');
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [mobileOpen]);
  const recent = (workspace?.threads ?? []).filter(chat =>
    chat.title.toLowerCase().includes(filter.trim().toLowerCase()));
  const close = () => setMobileOpen(false);
  const start = () => { workspace?.startNewChat(); close(); };
  return <>
    <div className="luqi-chat-mobile-bar">
      <button type="button" aria-controls="luqi-chat-sidebar" aria-expanded={mobileOpen}
        aria-label={mobileOpen ? 'Close chat sidebar' : 'Open chat sidebar'} onClick={() => setMobileOpen(open => !open)}>
        {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
      <Link to="/chat" onClick={close}>LUQI<span>Chat</span></Link>
      <button type="button" aria-label="New chat" onClick={start}><Plus size={22} aria-hidden="true" /></button>
    </div>
    {mobileOpen && <button className="luqi-chat-backdrop" type="button" aria-label="Close chat sidebar" onClick={close} />}
    <aside id="luqi-chat-sidebar" aria-label="LUQIChat sidebar"
      className={'luqi-chat-rail' + (mobileOpen ? ' luqi-chat-rail-open' : '') + (collapsed ? ' luqi-chat-rail-compact' : '')}>
      <div className="luqi-chat-rail-top">
        <Link to="/" className="luqi-chat-rail-brand" onClick={close} aria-label="LUQI workspace home">
          <img src="/luqi-mark.svg" alt="" aria-hidden="true" width="31" height="31" />
          <span>LUQI <strong>AI</strong></span>
        </Link>
        <button type="button" className="luqi-chat-rail-collapse"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(value => !value)}>
          {collapsed ? <PanelLeftOpen size={19} aria-hidden="true" /> : <PanelLeftClose size={19} aria-hidden="true" />}
        </button>
      </div>
      <div className="luqi-chat-rail-primary">
        <button className="luqi-chat-rail-new" type="button" onClick={start} title="New chat">
          <Plus size={20} aria-hidden="true" /><span>New chat</span>
        </button>
        <button className="luqi-chat-rail-search" type="button" title="Search LUQI tools"
          onClick={() => { close(); window.dispatchEvent(new Event('luqi:open-search')); }}>
          <Search size={18} aria-hidden="true" /><span>Search tools</span>
        </button>
      </div>
      <nav aria-label="Jump into LUQI services" className="luqi-chat-rail-services">
        <p className="luqi-chat-rail-section-label">Jump into</p>
        {shortcuts.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path}
          title={label} onClick={close} className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon size={19} aria-hidden="true" /><span>{label}</span>
        </NavLink>)}
      </nav>
      <section className="luqi-chat-rail-recent" aria-labelledby="luqi-recent-title">
        <div className="luqi-chat-rail-recent-heading">
          <h2 id="luqi-recent-title">Recent chats</h2>
          <span>this tab</span>
        </div>
        {customer?.session && (workspace?.threads.length ?? 0) > 0 &&
          <label className="luqi-chat-rail-filter">
            <Search size={15} aria-hidden="true" />
            <span className="luqi-sr-only">Find a recent chat</span>
            <input value={filter} maxLength={100} onChange={event => setFilter(event.target.value)}
              placeholder="Find a chat" />
          </label>}
        {!customer?.session ? <p>Sign in to use Chat. Conversation history is not saved automatically.</p>
          : !(workspace?.threads.length) ? <p>Confirmed chats from this tab appear here. They are cleared on sign-out or reload.</p>
          : recent.length ? <div className="luqi-chat-rail-threads" role="group" aria-label="Chats from this tab">
            {recent.map(chat => <button key={chat.id} type="button" title={chat.title}
              aria-current={workspace?.activeThread?.id === chat.id ? 'true' : undefined}
              className={workspace?.activeThread?.id === chat.id ? 'active' : ''}
              onClick={() => { workspace?.selectThread(chat.id); close(); }}>
              <MessageCircle size={16} aria-hidden="true" /><span>{chat.title}</span>
            </button>)}
          </div> : <p>No chats match your search.</p>}
      </section>
      <nav className="luqi-chat-rail-bottom" aria-label="Help and account">
        <Link to="/service-status" title="Service status" onClick={close}>
          <ShieldCheck size={18} aria-hidden="true" /><span>Service status</span>
        </Link>
        <Link to="/contact" title="Help and feedback" onClick={close}>
          <CircleHelp size={18} aria-hidden="true" /><span>Help and feedback</span>
        </Link>
        {customer?.session ? <button type="button" onClick={() => { customer.signOut(); close(); }}
          title="Sign out of LUQI">
          <ChevronLeft size={18} aria-hidden="true" /><span>Sign out</span>
        </button> : <Link to="/login" title="Sign in" onClick={close}>
          <ChevronRight size={18} aria-hidden="true" /><span>Sign in</span>
        </Link>}
        <p>Chats are private to this tab, not permanently saved. <Link to="/privacy" onClick={close}>Privacy</Link></p>
      </nav>
    </aside>
  </>;
}
