import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Compass, Shuffle, Sparkles } from 'lucide-react';
import { workspaceTools } from './workspace-catalog';

const journeys = [
  { name: 'Explore', hint: 'A little closer to your world.', ids: ['near-me', 'local-pulse', 'visa-entry'] },
  { name: 'Learn & play', hint: 'Try something. See what changes.', ids: ['physics', 'study', 'spatial-vision'] },
  { name: 'Create', hint: 'Give your next idea some room.', ids: ['academy', 'business', 'notes'] },
  { name: 'Grow a business', hint: 'Small steps. Real possibilities.', ids: ['township-economy', 'tenders', 'business'] },
  { name: 'Find support', hint: 'Useful guidance, within reach.', ids: ['social-support', 'consumer-rights', 'driver-rights'] },
] as const;

export default function DiscoveryDeck({ compact = false }: { compact?: boolean }) {
  const [journey, setJourney] = useState(0);
  const [offset, setOffset] = useState(0);
  const chosen = journeys[journey];
  const tools = chosen.ids.map(id => workspaceTools.find(tool => tool.id === id)!);
  const mix = () => { setJourney(n => (n + 1) % journeys.length); setOffset(n => n + 1); };
  return <section className={'luqi-discovery' + (compact ? ' is-compact' : '')} aria-label="Discover Luqi">
    <div className="luqi-discovery-heading"><div><p><Sparkles size={15} aria-hidden="true" /> FOLLOW YOUR CURIOSITY</p>
      <h2>What feels like you today?</h2></div>
      <button type="button" onClick={mix}><Shuffle size={16} aria-hidden="true" /> Mix it up</button></div>
    <div className="luqi-discovery-tabs" role="group" aria-label="Discovery interests">
      {journeys.map((item, index) => <button type="button" key={item.name} aria-pressed={index === journey}
        onClick={() => { setJourney(index); setOffset(0); }}>{item.name}</button>)}
    </div>
    <p className="luqi-discovery-hint" role="status">{chosen.hint}</p>
    <div className="luqi-discovery-grid">
      {tools.map((_, index) => {
        const tool = tools[(index + offset) % tools.length];
        return <Link key={tool.id} to={tool.path!} className={'luqi-discovery-card tone-' + index}>
          <span className="luqi-discovery-orbit" aria-hidden="true"><Compass size={27} /></span>
          <span className="luqi-discovery-card-copy"><small>{tool.status}</small><strong>{tool.title}</strong><span>{tool.category}</span></span>
          <ArrowUpRight size={20} aria-hidden="true" />
        </Link>;
      })}
    </div>
    <p className="luqi-discovery-note">Pick a path. Your choice stays on this screen until you open a tool.</p>
  </section>;
}
