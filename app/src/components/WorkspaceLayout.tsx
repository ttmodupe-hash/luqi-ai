import { lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { Toaster } from "./ui/toaster";
import RouteLoadBoundary from "./RouteLoadBoundary";
import PublicReleaseUpdateNotice from "./PublicReleaseUpdateNotice";
import WorkspacePlaybar, { readCalmPreference } from "./WorkspacePlaybar";
import "../experience.css";
import { useContactPresence } from "./useContactPresence";
import CollaborationDock from './CollaborationDock';
// The sidebar and its icons/styles are chat-only, never part of public homepage startup JS.
const ChatSidebar = lazy(() => import("./ChatSidebar"));
import { findWorkspaceTools } from "./workspace-catalog";
import { useOptionalCustomerSession } from "../providers/customer-session";
import { captureLuqiInstallPrompt } from "../lib/pwa-install";
import "../workspace.css";

captureLuqiInstallPrompt();

const navigation = [
  ["/chat", "Chat"],
  ["/near-me", "Near me"],
  ["/opportunities", "Opportunities"],
  ["/local-pulse", "Local Pulse"],
  ["/social-support", "SASSA & UIF"],
  ["/tenders", "Tenders"],
  ["/municipalities", "Municipal services"],
  ["/township-economy", "Township business"],
  ["/visa-entry", "Visa & Entry"],
  ["/spatial-vision", "👁️ Spatial Vision & 3D Lab"],
  ["/", "Workspace"],
  ["/companion", "Private notes"],
  ["/omega-tasks", "Luqi tools"],
  ["/content-studio", "Create"],
  ["/start", "Start here"],
  ["/install", "Install"],
] as const;
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [calm, setCalm] = useState(readCalmPreference);
  const changeCalm = (value: boolean) => {
    setCalm(value);
    try { localStorage.setItem("luqi:calm-mode", String(value)); } catch { /* Preference works without storage. */ }
  };
  const isChatWorkspace = location.pathname === "/chat";
  const customer = useOptionalCustomerSession();
  const presence = useContactPresence(customer?.session?.token);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const open = () => setSearchOpen(true);
    const keys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("luqi:open-search", open);
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("luqi:open-search", open);
      window.removeEventListener("keydown", keys);
    };
  }, []);
  useEffect(() => {
    if (searchOpen && !dialog.current?.open) {
      setQuery("");
      dialog.current?.showModal();
      dialog.current?.querySelector("input")?.focus();
    } else if (!searchOpen && dialog.current?.open) dialog.current.close();
  }, [searchOpen]);
  const results = findWorkspaceTools(query);
  return (
    <div className={isChatWorkspace ? "luqi-shell luqi-shell-chat" : "luqi-shell"} data-motion={calm ? "calm" : "auto"}>
      <Toaster />
      <a
        className="luqi-skip"
        href="#workspace-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("workspace-content");
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <PublicReleaseUpdateNotice />
      {isChatWorkspace ? (
        <div className="luqi-chat-shell">
          <RouteLoadBoundary><ChatSidebar /></RouteLoadBoundary>
          <div id="workspace-content" tabIndex={-1} className="luqi-page-content">
            {customer?.expired && <p role="status" className="luqi-info">
              Your session ended. <Link to="/login">Sign in again</Link> to use your Luqi account.
            </p>}
            <WorkspacePlaybar calm={calm} onCalm={changeCalm} />
            <div className="luqi-tool-content">{children}</div>
            <CollaborationDock presence={presence} />
          </div>
        </div>
      ) : (
        <>
      <header
        className="luqi-header"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <div className="luqi-header-inner">
          <Link to="/" className="luqi-brand" aria-label="Luqi workspace home">
            <img className="luqi-brand-symbol" src="/luqi-mark.svg" alt="" aria-hidden="true" width="36" height="36" />
            <span>
              Luqi
            </span>
          </Link>
          <nav aria-label="Primary navigation" className="luqi-desktop-nav">
            {navigation.map(([path, name]) => (
              <NavLink key={path} to={path} end={path === "/"}>
                {name}
              </NavLink>
            ))}
          </nav>
          <div className="luqi-header-actions">
            <button
              ref={searchButton}
              type="button"
              className="luqi-search-button"
              aria-label="Search workspace"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} aria-hidden="true" />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <Link className="luqi-account-link" to="/chat">
              Ask Luqi <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            {customer?.session && <button type="button" className="luqi-header-signout"
              aria-label="Log out of Luqi" onClick={customer.signOut}>Sign out</button>}
            <button
              ref={menuButton}
              className="luqi-menu-button"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="luqi-mobile-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X size={21} aria-hidden="true" />
              ) : (
                <Menu size={21} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="luqi-mobile-navigation"
            aria-label="Mobile navigation"
            className="luqi-mobile-nav"
          >
            {navigation.map(([path, name]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={() => setMenuOpen(false)}
              >
                {name}
                <ArrowUpRight size={16} aria-hidden="true" />
              </NavLink>
            ))}
            {customer?.session && <button type="button" className="luqi-mobile-signout"
              aria-label="Log out of Luqi" onClick={() => { customer.signOut(); setMenuOpen(false); }}>
              Sign out of Luqi
            </button>}
          </nav>
        )}
      </header>
      <div id="workspace-content" tabIndex={-1} className="luqi-page-content">
        {customer?.expired && <p role="status" className="luqi-info">
          Your session ended. <Link to="/login">Sign in again</Link> to use your Luqi account.
        </p>}
        <WorkspacePlaybar calm={calm} onCalm={changeCalm} />
        <div className="luqi-tool-content">{children}</div>
        <CollaborationDock presence={presence} />
      </div>
      <footer className="luqi-footer">
        <div>
          <Link to="/" className="luqi-footer-brand">
            Luqi
          </Link>
          <p>Room for curiosity. Built with Africa in mind.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/service-status">Service status</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Help and feedback</Link>
          <Link to="/pricing">Plans</Link>
          <Link to="/payments">Payments</Link>
          <Link to="/install">Install Luqi</Link>
        </nav>
        <span>© {new Date().getFullYear()} Luqi</span>
      </footer>
        </>
      )}
      <dialog
        ref={dialog}
        className="luqi-search-dialog"
        aria-labelledby="workspace-search-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not([disabled]), input:not([disabled]), a[href]",
            ),
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={() => setSearchOpen(false)}
        onClose={() => {
          setSearchOpen(false);
          searchButton.current?.focus();
        }}
      >
        <div className="luqi-dialog-heading">
          <h2 id="workspace-search-title">Find your next step</h2>
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          >
            <X size={21} aria-hidden="true" />
          </button>
        </div>
        <label className="luqi-dialog-input">
          <Search size={19} aria-hidden="true" />
          <span className="luqi-sr-only">Search tools</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Notes, physics, languages…"
          />
        </label>
        <div className="luqi-search-results" aria-live="polite">
          {results.length === 0 ? (
            <p className="luqi-empty">
              No matching tools. Try “notes” or “physics”.
            </p>
          ) : (
            results.map((tool) => (
              <div key={tool.id} className="luqi-search-result">
                {tool.path ? (
                  <Link to={tool.path} onClick={() => setSearchOpen(false)}>
                    {tool.title}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                ) : (
                  <h3>{tool.title}</h3>
                )}
                <span>{tool.status}</span>
                <p>{tool.description}</p>
              </div>
            ))
          )}
        </div>
        <p className="luqi-dialog-note">
          AI text has a separate signed-in trial with availability checks and
          provider limits. Voice, payments and autonomous workers remain unavailable.
        </p>
      </dialog>
    </div>
  );
}
