import { Link } from "react-router";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import SovereignRegionBar from "./SovereignRegionBar";

/** Availability panel only. No provider SDK, credentials, inference or canned answers. */
export function HeroAiChatConsole() {
  return (
    <section
      className="luqi-chat-card"
      aria-labelledby="chat-availability-heading"
    >
      <div className="luqi-chat-top">
        <span className="luqi-mini-label">Luqi ASSISTANT</span>
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
