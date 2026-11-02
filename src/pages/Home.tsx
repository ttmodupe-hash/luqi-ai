import { lazy, Suspense, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  FlaskConical,
  Globe2,
  Layers3,
  NotebookPen,
  Search,
  ShieldCheck,
  Smartphone,
  MessageCircle,
  Compass,
  X,
} from "lucide-react";
import HomeExtras from "../components/HomeExtras";
import HeroAiChatConsole from "../components/HeroAiChatConsole";
import MoonNowPanel from "../components/MoonNowPanel";
import { findWorkspaceTools } from "../components/workspace-catalog";
import "../workspace.css";
import "../home-cinematic.css";
const AfricanBiblicalStudy = lazy(() => import("../components/AfricanBiblicalStudy"));
const icons = {
  notes: NotebookPen,
  physics: FlaskConical,
  status: ShieldCheck,
  languages: Globe2,
  academy: BookOpen,
  agents: Layers3,
  business: BriefcaseBusiness,
  study: GraduationCap,
};

export default function Home() {
  const navigate = useNavigate();
  const [homeNeed, setHomeNeed] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  function openLocalGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = homeNeed.trim().slice(0, 500);
    if (value) navigate("/ask", { state: { luqiHomeNeed: value } });
  }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "preview">("all");
  const tools = findWorkspaceTools(query, filter);
  const readyCount = tools.filter(tool => tool.ready && !!tool.path).length;
  return (
    <main className="luqi-home">
      <div className="luqi-home-inner">
        <section className="luqi-hero luqi-cinematic-hero" aria-labelledby="workspace-title">
          <div className="luqi-hero-copy">
            <p className="luqi-eyebrow"><span /> YOUR EVERYDAY WORKSPACE · AFRICA IN MIND</p>
            <h1 id="workspace-title">Knowledge. People.<br /><em>A Stronger Africa.</em></h1>
            <p className="luqi-hero-description">AI, tools and source-linked information for everyday life, learning, business and opportunities across Africa.</p>
            <form aria-label="Ask Luqi from the homepage" className="luqi-home-ask" onSubmit={openLocalGuide}>
              <label htmlFor="luqi-home-need" className="luqi-sr-only">Ask Luqi anything</label>
              <MessageCircle size={19} aria-hidden="true" />
              <input id="luqi-home-need" type="text" value={homeNeed} maxLength={500}
                onChange={event => setHomeNeed(event.target.value)}
                autoComplete="off" spellCheck autoCorrect="on" autoCapitalize="sentences"
                placeholder="Ask Luqi anything…" />
              <button type="submit" aria-label="Find my next step with Luqi" disabled={!homeNeed.trim()}>
                <ArrowRight size={21} aria-hidden="true" />
              </button>
            </form>
            <p className="luqi-home-ask-note">Opens a free local guide. No AI request is sent automatically.</p>
            <nav className="luqi-hero-chips" aria-label="Popular Luqi starting points">
              <Link to="/driver-rights">Driver rights</Link>
              <Link to="/pendulum-lab">Matric physics</Link>
              <Link to="/tenders">Small tenders &amp; RFQs</Link>
              <Link to="/business-desk">Start a business</Link>
              <Link to="/comparative-evidence">African history</Link>
            </nav>
            <div className="luqi-hero-actions">
              <Link className="luqi-primary" to="/try">Try Luqi free <ArrowUpRight size={17} aria-hidden="true" /></Link>
              <Link className="luqi-secondary" to="/join">Create account <ArrowUpRight size={17} aria-hidden="true" /></Link>
              <Link className="luqi-secondary" to="/chat">Already registered? Chat <ArrowUpRight size={17} aria-hidden="true" /></Link>
              <a className="luqi-secondary" href="#tools" onClick={event => {
                event.preventDefault(); document.getElementById("tools")?.scrollIntoView();
                document.getElementById("tools-heading")?.focus();
              }}>Explore tools <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <details className="luqi-hero-help">
              <summary>More ways to start · install, guidance and sources</summary>
              <p className="luqi-hero-app"><Smartphone size={20} aria-hidden="true" /><Link to="/install">Install Luqi on your phone</Link> Android or iPhone · No app store required</p>
              <p className="luqi-hero-onboarding">Not sure how to ask? <Link to="/ask">Tell Luqi what you need</Link> for free local guidance. No account or perfect prompt needed.</p>
              <p className="luqi-hero-onboarding">New to Luqi? <Link to="/start">Get started</Link> with a guided introduction.</p>
              <p className="luqi-hero-onboarding">Want to understand public records? <Link to="/chat?civic=1">Explore Luqi's Civic Evidence Desk</Link> with original source links.</p>
              <p className="luqi-hero-footnote"><ShieldCheck size={15} aria-hidden="true" /> Explore free tools without an account. Guest AI is a consent-based limited trial.</p>
            </details>
          </div>
          <div className="luqi-hero-moon"><MoonNowPanel /></div>
        </section>
        <section className="luqi-history-showcase" aria-labelledby="luqi-history-title">
          <div className="luqi-history-banner">
            <div className="luqi-history-intro">
              <p className="luqi-history-eyebrow"><BookOpen size={17} aria-hidden="true" /> AFRICAN HISTORY · EVIDENCE · EXPLORATION</p>
              <h2 id="luqi-history-title">African Peoples and Historical Evidence in Biblical Narratives</h2>
              <p>Explore named African peoples, individuals, ancient places and manuscript traditions. Compare texts and historical interpretations with actual evidence.</p>
              <div className="luqi-history-actions">
                <button type="button" onClick={() => setHistoryOpen(value => !value)}
                  aria-expanded={historyOpen} aria-controls="luqi-home-study">
                  {historyOpen ? "Close the study" : "Explore the topics"} <ArrowRight size={17} aria-hidden="true" />
                </button>
                <Link to="/comparative-evidence">Research &amp; sources <ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
            </div>
            <div className="luqi-history-figures" aria-label="Named figures in ancient sources; symbols are decorative, not historical portraits">
              {[
                ["Ebed-Melech", "Jeremiah 38–39"],
                ["Zipporah", "Numbers 12"],
                ["Tirhakah", "2 Kings 19"],
                ["Ethiopian official", "Acts 8"],
              ].map(([name, reference]) => <div className="luqi-history-figure" key={name}>
                <span className="luqi-history-figure-icon" aria-hidden="true"><BookOpen size={19} /></span>
                <strong>{name}</strong><small>{reference}</small>
              </div>)}
            </div>
          </div>
          <div className="luqi-history-tiles">
            <Link to="/comparative-evidence"><BookOpen size={23} aria-hidden="true" /><span><strong>Read the source</strong><small>Texts, provenance and scholarly context</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link to="/comparative-evidence"><Globe2 size={23} aria-hidden="true" /><span><strong>Peoples &amp; places</strong><small>What the evidence can and cannot establish</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link to="/space-science"><FlaskConical size={23} aria-hidden="true" /><span><strong>Explore knowledge</strong><small>Science, astronomy and learning</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <p className="luqi-history-caution">Illustrations are symbolic, not authentic portraits or proof of historical claims. Interpretations may be disputed; check original sources.</p>
          {historyOpen && <div id="luqi-home-study"><Suspense fallback={<p role="status">Opening the source-linked study…</p>}><AfricanBiblicalStudy /></Suspense></div>}
        </section>
        <nav className="luqi-quick-tools" aria-label="Quick access to Luqi's working tools">
          <div className="luqi-quick-tools-intro"><h2>Explore Luqi’s tools</h2><p>Useful starting points.</p></div>
          <Link to="/driver-rights"><ShieldCheck size={21} aria-hidden="true" /><span>Driver rights</span></Link>
          <Link to="/study-desk"><GraduationCap size={21} aria-hidden="true" /><span>Education</span></Link>
          <Link to="/tenders"><BriefcaseBusiness size={21} aria-hidden="true" /><span>Small tenders</span></Link>
          <Link to="/near-me"><Compass size={21} aria-hidden="true" /><span>Near me</span></Link>
          <Link to="/comparative-evidence"><BookOpen size={21} aria-hidden="true" /><span>African history</span></Link>
          <Link to="/content-studio"><Layers3 size={21} aria-hidden="true" /><span>Studio</span></Link>
          <a href="#tools" onClick={event => {
            event.preventDefault(); document.getElementById("tools")?.scrollIntoView();
            document.getElementById("tools-heading")?.focus();
          }}><ArrowRight size={21} aria-hidden="true" /><span>All tools</span></a>
        </nav>
        <aside className="luqi-guest-guide" aria-label="Guest trial and country guide"><HeroAiChatConsole /></aside>
        <HomeExtras />
        <div className="luqi-home-lower">
        <section
          id="tools"
          className="luqi-tools-section"
          aria-labelledby="tools-heading"
        >
          <div className="luqi-section-heading">
            <div>
              <p className="luqi-eyebrow">MAKE YOURSELF AT HOME</p>
              <h2 id="tools-heading" tabIndex={-1}>
                Choose where to start.
              </h2>
            </div>
            <p>
              A few useful tools today.
              <br />
              More possibilities in the making.
            </p>
          </div>
          <div className="luqi-tools-toolbar">
            <div
              className="luqi-filters"
              role="group"
              aria-label="Filter tools"
            >
              {(
                [
                  ["all", "All tools"],
                  ["ready", "Ready to use"],
                  ["preview", "In development"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="luqi-tool-search">
              <Search size={17} aria-hidden="true" />
              <span className="luqi-sr-only">Filter workspace tools</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a tool…"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear tool search"
                  onClick={() => setQuery("")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
          </div>
          <p className="luqi-tool-count" role="status" aria-live="polite" aria-atomic="true">
            {tools.length === 0 ? "No matching tools" : `${tools.length} matching ${tools.length === 1 ? "tool" : "tools"}`} · {readyCount} available to open
          </p>
          <div className="luqi-tool-grid">
            {tools.map((tool, index) => {
              const Icon = icons[tool.icon];
              return (
                <article
                  className={`luqi-tool-card ${tool.ready ? "" : "luqi-tool-preview"}`}
                  key={tool.id}
                >
                  <div className="luqi-tool-card-top">
                    <span className={`luqi-tool-icon luqi-icon-${tool.icon}`}>
                      <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span
                      className={`luqi-status-pill ${tool.ready ? "luqi-status-ready" : ""}`}
                    >
                      {tool.status}
                    </span>
                  </div>
                  <p className="luqi-card-kicker">{tool.category}</p>
                  <h3>{tool.title}</h3>
                  <p className="luqi-card-description">{tool.description}</p>
                  <div className="luqi-card-bottom">
                    <span className="luqi-card-number" aria-hidden="true">
                      0{index + 1}
                    </span>
                    {tool.path ? (
                      <Link to={tool.path}>
                        Open {tool.title.toLowerCase()}{" "}
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="luqi-preview-note">
                        Not available yet
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!tools.length && (
            <div className="luqi-tool-empty">
              <Search size={28} aria-hidden="true" />
              <h3>No tools match your search.</h3>
              <p>Try another term or reset the filters.</p>
              <button
                type="button"
                className="luqi-secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Show all tools
              </button>
            </div>
          )}
        </section>
        <section
          className="luqi-progress-panel"
          aria-labelledby="progress-heading"
        >
          <div>
            <p className="luqi-eyebrow">GROWING WITH PURPOSE</p>
            <h2 id="progress-heading">
              More voices.
              <br />
              The same care.
            </h2>
            <p>
              Africa speaks with many voices. Luqi lets you explore practical
              learning and source-linked guidance today while we test additional
              mother-tongue, translation and companion-voice experiences with
              regional language reviewers.
            </p>
          </div>
          <div
            className="luqi-language-plan"
            aria-label="Examples of languages planned for evaluation"
          >
            <span>isiZulu</span>
            <span>Sesotho</span>
            <span>Setswana</span>
            <span>Kiswahili</span>
            <span>Yorùbá</span>
            <span>English</span>
            <p>
              Languages being evaluated for future companion experiences.
            </p>
          </div>
        </section>
        <div className="luqi-home-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            <strong>Choose what you can do today.</strong> Explore free public
            guides, create local study and business work, and try Luqi Chat.
            Consent, costs and availability are shown where needed. Check current
            service status before relying on connected features.
          </p>
          <Link to="/service-status">
            Check service status <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        </div>
      </div>
    </main>
  );
}
