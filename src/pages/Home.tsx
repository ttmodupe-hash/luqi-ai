import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  Globe2,
  Layers3,
  NotebookPen,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import HeroAiChatConsole from "../components/HeroAiChatConsole";
import { findWorkspaceTools } from "../components/workspace-catalog";
import "../workspace.css";
const icons = {
  notes: NotebookPen,
  physics: FlaskConical,
  status: ShieldCheck,
  languages: Globe2,
  academy: BookOpen,
  agents: Layers3,
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "preview">("all");
  const tools = findWorkspaceTools(query, filter);
  const readyCount = tools.filter((tool) => tool.ready).length;
  return (
    <main className="luqi-home">
      <div className="luqi-home-inner">
        <section className="luqi-hero" aria-labelledby="workspace-title">
          <div className="luqi-hero-copy">
            <p className="luqi-eyebrow">
              <span /> YOUR EVERYDAY WORKSPACE
            </p>
            <h1 id="workspace-title">
              A little curiosity.
              <br />
              <em>A lot of possibility.</em>
            </h1>
            <p className="luqi-hero-description">
              Keep your ideas together. Explore hands-on science.
              <br className="luqi-desktop-break" /> Make room for what you’ll
              learn next.
            </p>
            <div className="luqi-hero-actions">
              <Link className="luqi-primary" to="/start">
                Get started <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
              <a
                className="luqi-secondary"
                href="#tools"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById("tools")?.scrollIntoView();
                  document.getElementById("tools-heading")?.focus();
                }}
              >
                Explore tools <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
            <p className="luqi-hero-footnote">
              <ShieldCheck size={15} aria-hidden="true" /> Your notes require
              sign-in. No AI reply is generated.
            </p>
          </div>
          <HeroAiChatConsole />
        </section>
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
          <p className="luqi-tool-count" role="status" aria-live="polite" aria-atomic="true">
            {tools.length === 0 ? "No matching tools" : `${tools.length} matching ${tools.length === 1 ? "tool" : "tools"}`} · {readyCount} available to open
          </p>
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
                aria-label="Find workspace tools"
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
              We’re developing African-language evaluations and knowledge
              grounded in sources. Language quality still needs review before we
              promise reliable AI answers.
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
              Evaluation plans, not a list of verified language capabilities.
            </p>
          </div>
        </section>
        <div className="luqi-home-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            <strong>Clear about what’s ready.</strong> AI text has a separate,
            limited trial. Voice, payments and autonomous agents remain unavailable.
            Service health alone does not verify these features.
          </p>
          <Link to="/service-status">
            Check service status <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
