/** Honest customer-facing status of all six Luqi service areas.
 * No provider, account, storage or network operations. Source-gated features
 * are unavailable until accepted by a real operator.
 */
const areas = [
  { id: 'workflow', name: 'Workflow Engine', local: false,
    detail: 'Durable queue and guarded worker contracts exist, but production task intake and execution are disabled. No autonomous task runs.' },
  { id: 'weather', name: 'Weather Africa', local: false,
    detail: 'The timestamp-aware offline adapter needs independently verified weather observations and official alert feeds before use.' },
  { id: 'travel', name: 'Travel Africa', local: true,
    detail: 'Sum your own amounts in one currency now. Live visa rules, routes, prices and exchange rates are not connected.' },
  { id: 'university', name: 'Universities & scholarships', local: false,
    detail: 'Offline evidence-filtering logic exists; current programmes, applications, deadlines and verified eligibility are not connected.' },
  { id: 'vehicle', name: 'Vehicle service planner', local: true,
    detail: 'Calculate a due date and mileage from the manufacturer intervals you supply. No vehicle registry or mechanical diagnosis.' },
  { id: 'water', name: 'Water & sanitation', local: false,
    detail: 'Source-dependent screening code exists, but official standards and accredited lab sources are not connected. No potability claim.' },
] as const;

export default function OmegaDomainGuide() {
  return <details className="omega-six">
    <summary>Explore all six Luqi service areas and what is available</summary>
    <p className="omega-six-intro">Two local calculations are usable now. The other domains and production workers require verified source data and operational acceptance. A local result is not proof of live data or autonomous AI.</p>
    <ul className="omega-six-list" aria-label="Luqi capability availability">
      {areas.map(area => <li key={area.id}>
        <h3>{area.name}</h3>
        <p className="omega-six-state">{area.local ? 'Local calculation available' : 'Not available to customers'}</p>
        <p>{area.detail}</p>
      </li>)}
    </ul>
  </details>;
}
