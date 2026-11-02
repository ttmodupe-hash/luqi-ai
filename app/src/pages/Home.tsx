import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Landmark,
  MessageCircle,
  BriefcaseBusiness,
  GraduationCap,
  FlaskConical,
  Globe2,
  Layers3,
  NotebookPen,
  Search,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import HomeExtras from "../components/HomeExtras";
import HeroAiChatConsole from "../components/HeroAiChatConsole";
import MoonNowPanel from "../components/MoonNowPanel";
import { findWorkspaceTools, workspaceTools } from "../components/workspace-catalog";
import "../home-panorama.css";
import "../workspace.css";
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

const strip = [
  {id:"spatial-vision",label:"Vision & 3D"}, {id:"visual-tutor",label:"Exam tutor"}, {id:"ai-trial",label:"AI Chat"},
  {id:"driver-rights",label:"Driver rights"}, {id:"consumer-rights",label:"Rights"}, {id:"comparative-evidence",label:"African history"},
  {id:"opportunity-compass",label:"Opportunities"}, {id:"notes",label:"Private notes"}, {id:"physics",label:"STEM lab"},
  {id:"near-me",label:"Near me"}, {id:"languages",label:"Languages"}, {id:"academy",label:"Content studio"},
  {id:"business",label:"Business desk"}
] as const;

export default function Home() {
  const navigate = useNavigate();
  const [heroNeed, setHeroNeed] = useState("");
  const [heroError, setHeroError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "preview">("all");
  const tools = findWorkspaceTools(query, filter);
  const readyCount = tools.filter(tool => tool.ready && !!tool.path).length;
  return (
    <main className="luqi-home luqi-home-screenshot">
      <div className="luqi-home-inner">
        <div className="luqi-panorama-top">
          <section className="luqi-hero" aria-labelledby="workspace-title">
            <div className="luqi-hero-art" aria-hidden="true" />
            <div className="luqi-hero-copy">
              <p className="luqi-pano-eyebrow">LUQI · YOUR EVERYDAY WORKSPACE</p>
              <h1 id="workspace-title">Knowledge. People.<br />A Stronger Africa.</h1>
              <p className="luqi-hero-description">AI, tools and source-linked information for everyday life, learning, business and opportunities across Africa.</p>
              <form className="luqi-pano-ask" onSubmit={event => {
                event.preventDefault();
                const goal = heroNeed.trim();
                if (!goal || goal.length > 500) { setHeroError("Enter a question or goal in 500 characters or fewer."); return; }
                setHeroError("");
                navigate("/ask", { state: { luqiHomeGoal: goal } });
              }}>
                <MessageCircle size={23} aria-hidden="true" />
                <label htmlFor="luqi-hero-need" className="luqi-sr-only">Ask Luqi anything</label>
                <input id="luqi-hero-need" type="text" inputMode="text" autoComplete="off" maxLength={500}
                  value={heroNeed} onChange={event => { setHeroNeed(event.target.value); if (heroError) setHeroError(""); }}
                  placeholder="Ask Luqi anything…" />
                <button type="submit" aria-label="Explore my question with Luqi"><ArrowRight size={24} aria-hidden="true" /></button>
              </form>
              {heroError && <p className="luqi-pano-error" role="alert">{heroError}</p>}
              <nav className="luqi-pano-chips" aria-label="Start with a topic">
                <Link to="/try">Try Luqi free</Link>
                <Link to="/driver-rights">Try: Driver rights</Link>
                <Link to="/study-desk">Matric Physics</Link>
                <Link to="/tenders">Tender opportunities</Link>
                <Link to="/business-desk">Start a business</Link>
                <Link to="/comparative-evidence" state={{openAfricanStudy:true,africanTopic:"geography"}}>African history</Link>
              </nav>
              <div className="luqi-hero-actions luqi-pano-entry-actions" aria-label="Account and tool access">
                <Link className="luqi-primary" to="/join">Create account <ArrowUpRight size={18} aria-hidden="true" /></Link>
                <Link className="luqi-secondary" to="/chat">Already registered? Chat <ArrowUpRight size={18} aria-hidden="true" /></Link>
                <a className="luqi-secondary" href="#tools" onClick={event => {
                  event.preventDefault();
                  document.getElementById("tools")?.scrollIntoView();
                  document.getElementById("tools-heading")?.focus();
                }}>Explore tools <ArrowRight size={18} aria-hidden="true" /></a>
              </div>
              <p className="luqi-hero-app"><Smartphone size={20} aria-hidden="true" /><Link to="/install">Install Luqi on your phone</Link><span>Android or iPhone · No app store required</span></p>
              <p className="luqi-hero-onboarding">Not sure how to ask? <Link to="/ask">Tell Luqi what you need</Link> for free local guidance. No account or perfect prompt needed.</p>
              <p className="luqi-hero-onboarding">New to Luqi? <Link to="/start">Get started</Link> with a guided introduction.</p>
              <p className="luqi-hero-onboarding">Want to understand public records? <Link to="/chat?civic=1">Explore Luqi's Civic Evidence Desk</Link> with original source links.</p>
              <p className="luqi-pano-trust"><ShieldCheck size={15} aria-hidden="true"/> Questions open Luqi’s free local guidance first. AI calls still require separate consent and are subject to availability.</p>
            </div>
          </section>
          <div className="luqi-pano-moon"><MoonNowPanel /></div>
        </div>

        <section className="luqi-history-showcase" aria-labelledby="luqi-history-heading">
          <div className="luqi-history-art" aria-hidden="true" />
          <div className="luqi-history-intro">
            <p className="luqi-pano-overline"><BookOpen size={23} aria-hidden="true" /> AFRICA · HISTORY · SOURCES</p>
            <h2 id="luqi-history-heading">African Peoples and Historical Evidence in Biblical Narratives</h2>
            <p>From the Table of Nations to Ebed-Melech and an African official in Acts, explore African places and people through ancient texts, material records and scholarly interpretation.</p>
            <div className="luqi-history-actions">
              <Link to="/comparative-evidence" state={{openAfricanStudy:true,africanTopic:"geography"}}>Explore the topics <ArrowRight size={17} aria-hidden="true"/></Link>
              <Link to="/comparative-evidence" state={{openAfricanStudy:true,africanTopic:"ebed"}}>Key figures <ArrowUpRight size={17} aria-hidden="true"/></Link>
              <Link to="/comparative-evidence" state={{openAfricanStudy:true,africanPractice:true}}>Study questions <ArrowUpRight size={17} aria-hidden="true"/></Link>
            </div>
            <p className="luqi-history-note">Illustrated design, not historical portraits. Sources distinguish texts, artifacts and interpretations.</p>
          </div>
          <div className="luqi-history-cards">
            <article className="luqi-history-card">
              <div className="luqi-history-card-title"><Globe2 size={22} aria-hidden="true"/><h3>1. The Table of Nations</h3></div>
              <p>Genesis 10 names Cush, Mizraim, Put and Canaan. Explore the ancient geography and why it cannot establish modern racial ancestry.</p>
              <Link to="/comparative-evidence" state={{openAfricanStudy:true,africanTopic:"geography"}}>Explore the geography <ArrowRight size={16} aria-hidden="true"/></Link>
            </article>
            <article className="luqi-history-card">
              <div className="luqi-history-card-title"><BookOpen size={22} aria-hidden="true"/><h3>2. African figures in the texts</h3></div>
              <ul>
                <li><strong>Ebed-Melech</strong><span>Jeremiah 38–39 · a Cushite rescuer</span></li>
                <li><strong>Simon of Cyrene</strong><span>Mark 15 · North African hometown</span></li>
                <li><strong>Taharqa</strong><span>Evidence from Kushite kingship; chronology matters</span></li>
              </ul>
              <Link to="/comparative-evidence" state={{openAfricanStudy:true,africanTopic:"ebed"}}>Compare text and evidence <ArrowRight size={16} aria-hidden="true"/></Link>
            </article>
            <article className="luqi-history-card">
              <div className="luqi-history-card-title"><Landmark size={22} aria-hidden="true"/><h3>3. Early African Christianity</h3></div>
              <p>Explore the African official in Acts 8, the Nubian royal title Candace and separately evidenced Christian history in Aksum.</p>
              <Link to="/comparative-evidence" state={{openAfricanStudy:true,africanTopic:"acts"}}>Study the sources <ArrowRight size={16} aria-hidden="true"/></Link>
            </article>
          </div>
          <div className="luqi-pano-toolstrip">
            <div className="luqi-pano-toolstrip-heading">
              <p className="luqi-pano-overline"><Layers3 size={17} aria-hidden="true"/> AVAILABLE IN LUQI</p>
              <h2>Explore Luqi’s tools</h2><p>Tap a service to open its real workspace.</p>
            </div>
            <nav className="luqi-pano-tools" aria-label="Quick links to working Luqi tools">
              {strip.map(({ id, label }, index) => {
                const tool = workspaceTools.find(value => value.id === id && value.ready && value.path);
                if (!tool?.path) return null;
                const Icon = icons[tool.icon];
                return <Link key={id} to={tool.path} title={tool.title}>
                  <Icon size={23} aria-hidden="true"/>
                  <span className="luqi-pano-toolnum">{String(index + 1).padStart(2, "0")}</span>
                  <span className="luqi-pano-toolname">{label}</span>
                </Link>;
              })}
            </nav>
            <a className="luqi-pano-more" href="#tools">More tools <ArrowRight size={16} aria-hidden="true"/></a>
          </div>
        </section>
        <div className="luqi-pano-discover"><HomeExtras /></div>
        <details className="luqi-pano-guest-info">
          <summary>How does Luqi’s AI trial work?</summary>
          <HeroAiChatConsole />
        </details>
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
    </main>
  );
}
