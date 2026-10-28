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
        <span className="luqi-mini-label">Luqi assistant</span>
        <span className="luqi-paused">
          Guest preview
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
        Try up to three real replies from Luqi without registering. Ask a useful question, see how Luqi can help, and create one account when you want more. AI text requires consent and is subject to a shared guest limit.
      </p>
      <SovereignRegionBar compact />
      <div className="luqi-chat-bottom">
        <span>Try Luqi free without registering</span>
        <Link to="/try" aria-label="Try Luqi free without registering">
          <ArrowUpRight size={21} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export default HeroAiChatConsole;
