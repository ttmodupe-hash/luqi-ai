import { Link } from "react-router";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import SovereignRegionBar from "./SovereignRegionBar";
import { PAN_AFRICAN_STUDY_PATHWAYS } from "../services/panAfricanSovereignEngine";
import "./sovereign-starters.css";

/** Availability panel only. No provider SDK, credentials, inference or canned answers. */
export function HeroAiChatConsole() {
  return (
    <section
      className="luqi-chat-card"
      aria-labelledby="chat-availability-heading"
    >
      <div className="luqi-chat-top">
        <span className="luqi-mini-label">Luqi assistant</span>
        <span className="luqi-paused">
          Text trial
        </span>
      </div>
      <div className="luqi-assistant-symbol" aria-hidden="true">
        <MessageCircle size={34} strokeWidth={1.4} />
      </div>
      <h2 id="chat-availability-heading">
        Tell Luqi what you need.<br />
        Find your next step.
      </h2>
      <p>
        Ask Luqi to explain a topic, shape an idea or help draft a message. Create one account, open Chat and choose when to send your question. AI text requires consent and has shared spending limits.
      </p>
      <SovereignRegionBar compact />
      <div className="luqi-scholar-starters" aria-label="Explore African thinkers">
        <h3>Explore African ideas critically</h3>
        <p>Choose a reading question. Luqi will prepare a draft in Chat, not send it automatically.</p>
        <div className="luqi-scholar-starters-grid">
          {PAN_AFRICAN_STUDY_PATHWAYS.map(path => <Link key={path.id}
            to={`/chat?study=${path.id}`} aria-label={`Explore ${path.title} in Luqi Chat`}>
            <strong>{path.title}</strong><span>{path.description}</span>
          </Link>)}
        </div>
      </div>
      <div className="luqi-chat-bottom">
        <span>Open Luqi chat and guidance</span>
        <Link to="/chat" aria-label="Open Luqi chat and guidance">
          <ArrowUpRight size={21} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export default HeroAiChatConsole;
