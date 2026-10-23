import { Link } from "react-router";
import { ArrowUpRight, MessageCircle, Pause } from "lucide-react";

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
          <Pause size={12} aria-hidden="true" /> Paused
        </span>
      </div>
      <div className="luqi-assistant-symbol" aria-hidden="true">
        <MessageCircle size={34} strokeWidth={1.4} />
      </div>
      <h2 id="chat-availability-heading">
        A space for your <br />
        next good question.
      </h2>
      <p>
        AI chat is not available yet. In the meantime, keep your ideas in
        private notes or explore the physics lab.
      </p>
      <div className="luqi-chat-bottom">
        <span>AI replies & voice are unavailable</span>
        <Link to="/companion" aria-label="Open private notes">
          <ArrowUpRight size={21} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export default HeroAiChatConsole;
