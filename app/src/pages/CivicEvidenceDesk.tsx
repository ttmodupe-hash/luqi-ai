import CivicWardGuide from '../components/CivicWardGuide';
import { useState } from 'react';
import { Link } from 'react-router';
import CivicEvidencePanel from '../components/CivicEvidencePanel';
import { CIVIC_CLAIMS, CIVIC_SCOPE_NOTICE } from '../lib/civic-evidence';
export default function CivicEvidenceDesk() {
  const [topic, setTopic] = useState('All topics');
  const claims = CIVIC_CLAIMS.filter(claim => topic === 'All topics' || claim.topic === topic);
  return <section aria-labelledby="civic-desk-title" className="mx-auto w-full min-w-0 max-w-6xl space-y-5 p-3 text-slate-100 sm:p-6">
    <header className="space-y-3 rounded-2xl border border-cyan-800 bg-slate-950 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Luqi · independent civic learning</p>
      <h1 id="civic-desk-title" className="text-3xl font-bold">Civic Evidence Desk</h1>
      <p className="max-w-3xl text-sm leading-relaxed">Understand public records, question claims and participate in democracy with evidence. Luqi is independent of political parties and is not an IEC or government service. Your voting decision remains yours.</p>
      <p className="max-w-3xl text-sm text-amber-200">{CIVIC_SCOPE_NOTICE}</p>
      <p className="text-xs text-slate-300">Read without an account. The optional AI supporter selects reviewed explanations inside Luqi Chat; it does not search live or generate new factual claims. This initial reference set is in English; other-language explanations need separate review.</p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/chat" className="min-h-11 rounded-lg border border-slate-500 px-3 py-3">Return to general Chat</Link>
        <a href="https://www.elections.org.za/pw/voter/voter-information" target="_blank" rel="noopener noreferrer" className="min-h-11 rounded-lg bg-cyan-900 px-3 py-3">Open official IEC voter information</a>
      </div>
      <p className="text-xs text-slate-300">Check current voting requirements and dates with the IEC. No personal registration check takes place in Luqi.</p>
    </header>
    <CivicWardGuide />
    <label className="block max-w-sm text-sm">Evidence topic
      <select value={topic} onChange={event => setTopic(event.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-slate-500 bg-slate-900 p-3">
        {['All topics', 'Audits', 'Public money', 'Accountability', 'Voting'].map(value => <option key={value}>{value}</option>)}
      </select>
    </label>
    <p role="status" className="text-sm text-slate-300">{claims.length} dated evidence record{claims.length === 1 ? '' : 's'}. No political profile or vote preference is saved.</p>
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">{claims.map(claim => <CivicEvidencePanel key={claim.id} claim={claim} />)}</div>
  </section>;
}
