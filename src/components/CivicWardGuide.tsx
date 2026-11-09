import React, { useId, useState } from 'react';
import { ArrowRight, ArrowUpRight, Compass, Fingerprint, Landmark, MapPinned, Scale, ShieldCheck, Users } from 'lucide-react';
import './civic-manager.css';

/** The reviewed guide's content and destinations are preserved; no current civic facts are inferred. */
export const CIVIC_CHANNELS = [
  { id: 'parties', title: 'Party directory and official party websites', short: 'Party statements', url: 'https://www.gov.za/links/political-parties-organisations-0', publisher: 'GOV.ZA', note: 'Read each party’s own manifesto as its stated position, rather than independent proof of an outcome. This directory is not a complete Luqi encyclopedia.' },
  { id: 'results', title: 'IEC election and by-election results', short: 'Election results', url: 'https://results.elections.org.za/', publisher: 'IEC', note: 'Compare the correct election, ballot, ward and declaration date. A seat result does not establish today’s mayor or governing coalition.' },
  { id: 'boundary', title: 'Municipal Demarcation Board', short: 'Official boundaries', url: 'https://www.demarcation.org.za/', publisher: 'MDB', note: 'Check the applicable boundary edition and effective date. A highway or township can cross several wards and municipalities.' },
  { id: 'council', title: 'Tshwane official ward councillor directory', short: 'Tshwane councillors', url: 'https://www.tshwane.gov.za/?page_id=17228', publisher: 'TSHWANE', note: 'For a Tshwane location, confirm the ward and current representative with the municipality. This is a Tshwane-specific channel, not national coverage.' },
  { id: 'rights', title: 'Constitution: political rights', short: 'Political rights', url: 'https://www.gov.za/documents/constitution/chapter-2-bill-rights', publisher: 'GOV.ZA', note: 'Section 19 protects political choice and participation. Luqi does not recommend a party or collect voting preferences.' },
  { id: 'roles', title: 'Municipal Structures Act', short: 'Council responsibilities', url: 'https://www.gov.za/documents/local-government-municipal-structures-act', publisher: 'GOV.ZA', note: 'Use the applicable amended legislation and municipal procedures to check responsibilities; a councillor is not a personal guarantee of service delivery.' },
  { id: 'audit', title: 'Auditor-General records', short: 'Audit records', url: 'https://www.agsa.co.za/', publisher: 'AGSA', note: 'Use a dated audit for its municipality and financial year. An audit outcome alone does not prove a party caused a particular service-delivery result.' },
] as const;
const TASKS = [
  { id: 'place', icon: MapPinned, title: 'Find your ward', subtitle: 'Start with the right boundary', heading: 'The right place. The right records.', description: 'Establish the municipality and boundary edition before checking a ward. A nearby landmark is not a ward lookup.', channels: ['boundary', 'council'], steps: ['Identify the municipality', 'Check the boundary edition', 'Confirm the ward with the municipality'], caution: 'Tshwane’s directory covers Tshwane only. Other municipalities need their own official records.' },
  { id: 'people', icon: Landmark, title: 'Know your representatives', subtitle: 'Separate results from current roles', heading: 'An election result is a starting point.', description: 'Compare the right election and ward, then confirm current representation and leadership with the municipality.', channels: ['results', 'council', 'roles'], steps: ['Choose the election and ballot', 'Check the ward result', 'Confirm current council appointments'], caution: 'Use council notices and minutes for changes after an election. Do not infer today’s mayor or coalition from a seat result.' },
  { id: 'positions', icon: Users, title: 'Explore party positions', subtitle: 'Compare statements with evidence', heading: 'Understand the claim. Check the evidence.', description: 'Use the same standard for every party, smaller party and independent. Keep stated positions separate from documented outcomes.', channels: ['parties', 'rights'], steps: ['Read the original statement', 'Separate promises from outcomes', 'Check dated evidence and attribution'], caution: 'A constructive contribution needs a dated record, clear attribution and any joint participants or limitations. Luqi does not recommend a party.' },
  { id: 'money', icon: Scale, title: 'Follow public money', subtitle: 'Read the audit in its context', heading: 'Look beyond the headline.', description: 'Start with the municipality, financial year and original audit. Then check the relevant responsibilities and supporting records.', channels: ['audit', 'roles'], steps: ['Match the municipality and year', 'Read the original audit record', 'Check responsibilities and context'], caution: 'An audit outcome alone does not establish that a party caused a particular service-delivery result.' },
] as const;

export default function CivicWardGuide() {
  const instance = useId();
  const [selected, setSelected] = useState(0);
  const task = TASKS[selected];
  const Icon = task.icon;
  const channelIds: readonly string[] = task.channels;
  const channels = channelIds.map(id => CIVIC_CHANNELS.find(source => source.id === id)!);
  return <section className="civicManager" aria-labelledby={`${instance}-title`}>
    <header className="cm-header">
      <div className="cm-intro">
        <div className="cm-eyebrow"><span className="cm-brandmark"><Compass size={19} aria-hidden="true" /></span> KHORO / CIVIC MANAGER</div>
        <h2 id={`${instance}-title`}>Your civic <em>compass.</em></h2>
        <p>Less searching. A clearer path to the original records.</p>
      </div>
      <div className="cm-headerAside">
        <div className="cm-orbit" aria-hidden="true"><span className="cm-orbitRing"/><span className="cm-orbitCore"><Landmark size={28}/></span><i/><b/></div>
        <span className="cm-status">SOURCE GUIDE <span aria-hidden="true">/</span> NOT LIVE</span>
      </div>
    </header>
    <div className="cm-meta"><span><strong>{CIVIC_CHANNELS.length}</strong> official source channels</span><span>Guide reviewed <time dateTime="2026-11-09">09 Nov 2026</time></span><span>Choose a task to begin <ArrowRight size={14} aria-hidden="true"/></span></div>
    <div className="cm-workspace">
      <div className="cm-taskRail" role="group" aria-label="Civic research tasks">
        {TASKS.map((item,index) => { const TaskIcon = item.icon; return <button type="button" key={item.id} className="cm-task" aria-pressed={selected===index} aria-controls={`${instance}-focus`} onClick={()=>setSelected(index)}>
          <span className="cm-taskIcon"><TaskIcon size={21} aria-hidden="true"/></span><span className="cm-taskCopy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><ArrowRight className="cm-taskArrow" size={18} aria-hidden="true"/>
        </button>; })}
        <p className="cm-railNote"><Fingerprint size={17} aria-hidden="true"/>No political profile. No location request.</p>
      </div>
      <section className="cm-focus" id={`${instance}-focus`} aria-labelledby={`${instance}-focus-title`} key={task.id}>
        <div className="cm-focusTop"><span><Icon size={17} aria-hidden="true"/> YOUR NEXT STEP</span><span>{String(selected+1).padStart(2,'0')} / 04</span></div>
        <h3 id={`${instance}-focus-title`}>{task.heading}</h3><p>{task.description}</p>
        <ol className="cm-checklist">{task.steps.map((step,index)=><li key={step}><span aria-hidden="true">{index+1}</span>{step}</li>)}</ol>
        <div className="cm-sourceActions">{channels.map((source,index)=><a key={source.id} className={index===0?'cm-sourceAction cm-sourceActionPrimary':'cm-sourceAction'} href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.title} (opens in a new tab)`}><span><small>{source.publisher}</small>{source.short}</span><ArrowUpRight size={19} aria-hidden="true"/></a>)}</div>
        <details className="cm-context"><summary>What these records can—and cannot—tell you</summary><p>{task.caution}</p>{channels.map(source=><p key={source.id}><strong>{source.short}:</strong> {source.note}</p>)}</details>
      </section>
    </div>
    <details className="cm-library">
      <summary><span><ShieldCheck size={18} aria-hidden="true"/><strong>Open the evidence library</strong></span><span>{CIVIC_CHANNELS.length} channels + verification guidance</span></summary>
      <div className="cm-libraryBody">
        <h3>Party and ward verification guide</h3>
        <p>Official-source guide reviewed 9 November 2026. Links are not continuously monitored. Current ward, councillor and governing coalition are not inferred from a route preview or device location.</p>
        <div className="cm-sourceGrid">{CIVIC_CHANNELS.map(source=><article key={source.id}><span className="cm-publisher">{source.publisher}</span><h4><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={16} aria-hidden="true"/></a></h4><p>{source.note}</p></article>)}</div>
        <p>Use the same evidence standard for every party, including smaller parties and independents. Separate manifesto promises, independently documented contributions, election results and current office-holders. A constructive contribution needs a dated record, a clear attribution and any relevant joint participants or limitations.</p>
        <p>To verify a place: establish the municipality and boundary edition, identify the ward from official boundaries, check the IEC result and then confirm current representation and leadership with the municipality. Use council notices and minutes for changes after an election. Luqi does not request your identity number, store a political profile or transmit location from this guide.</p>
      </div>
    </details>
    <footer className="cm-footer"><span><ShieldCheck size={15} aria-hidden="true"/>Independent choice. The same evidence standard for everyone.</span><span>Guide only. Current office-holders are not verified here.</span></footer>
  </section>;
}
