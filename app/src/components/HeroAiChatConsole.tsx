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
        A space for your <br />
        next good question.
      </h2>
      <p>
        Sign in to check the limited AI text trial. Questions use shared
        spending limits and separate provider processing.
      </p>
      <div className="luqi-chat-bottom">
        <span>Check AI trial availability</span>
        <Link to="/ai-trial" aria-label="Open AI text trial">
          <ArrowUpRight size={21} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export default HeroAiChatConsole;
