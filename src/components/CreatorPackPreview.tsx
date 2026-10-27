import { Link } from 'react-router';
import '../creator-pack.css';

type CreatorPackPreviewProps = { compact?: boolean };

// Public product preview only. Actual checkout availability is determined by
// the fail-closed /api/v1/commerce/offer contract, never by this display.
export default function CreatorPackPreview({ compact = false }: CreatorPackPreviewProps) {
  return <section className={`luqi-creator-offer${compact ? ' luqi-creator-offer-compact' : ''}`} aria-labelledby="luqi-creator-offer-heading">
    <div className="luqi-creator-top">
      <div className="luqi-creator-copy">
        <p className="luqi-creator-kicker">ONE-TIME HUMAN-ASSISTED SERVICE · PREVIEW</p>
        <h2 id="luqi-creator-offer-heading">Luqi Assisted Creator Pack</h2>
        <p>Turn up to six short messages into an approximately 90-second, six-scene <strong>silent</strong> video using Luqi's existing creative templates.</p>
      </div>
      <div className="luqi-creator-price" aria-label="Not currently for sale"><span>Pricing under review</span><strong>Not on sale</strong><span>No approved purchase price</span></div>
    </div>
    {!compact && <ul className="luqi-creator-includes" aria-label="Planned Creator Pack contents">
      <li>One silent video in one agreed format</li>
      <li>A storyboard or script and subtitle file</li>
      <li>One minor text or caption correction</li>
      <li>Human preparation and review using existing templates</li>
    </ul>}
    <p className="luqi-creator-limit">Price and availability are proposals, not a checkout offer. Seller details, delivery capacity, private support and refunds must be verified before orders open. No AI-generated voice, custom filming or automatic social publishing is included.</p>
    <div className="luqi-creator-actions">
      <Link className="luqi-primary" to="/content-studio">Try the free Content Studio</Link>
      {compact && <Link className="luqi-creator-detail-link" to="/pricing">Explore the proposed pack</Link>}
    </div>
  </section>;
}
