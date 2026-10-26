import { Link } from "react-router";
import { ArrowUpRight, MessageCircle } from "lucide-react";

/** Availability panel only. No provider SDK, credentials, inference or canned answers. */
export function HeroAiChatConsole() {
  return (
    <section
      className="luqi-chat-card"
      aria-labelledby="chat-availability-heading"
    >
      <div className="luqi-chat-top">
        <span className="luqi-mini-label">LUQI ASSISTANT</span>
        <span className="luqi-paused">
          Text trial
        </span>
      </div>
      <div className="luqi-assistant-symbol" aria-hidden="true">
        <MessageCircle size={34} strokeWidth={1.4} />
      </div>
      <h2 id="chat-availability-heading">
        Tell LUQI what you need.<br />
        Find your next step.
      </h2>
      <p>
        Start with local guidance for travel, learning, creativity and everyday needs. For an actual AI reply, the signed-in text trial requires consent and has shared spending limits.
      </p>
      <div className="luqi-chat-bottom">
        <span>Open LUQI chat and guidance</span>
        <Link to="/chat" aria-label="Open LUQI chat and guidance">
          <ArrowUpRight size={21} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export default HeroAiChatConsole;
