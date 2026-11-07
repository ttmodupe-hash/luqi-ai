import React, { useState } from 'react';
import { useInRouterContext, useSearchParams } from 'react-router';
import { useOptionalCustomerSession } from '../../providers/customer-session';
import { trails, type Trail } from './drive-navigation';
import { corridorId, directoryState, evidenceAnswer, makeJourneyPack, planJourney, sourcesForCorridor, type JourneyInputs, type JourneyResult, type TripQuestion } from './drive-intelligence';
import './drive-intelligence.css';
const fields:readonly [keyof JourneyInputs,string,string][]=[
 ['roadKm','Total journey road distance (km)','Include return travel and detours yourself; never use the straight-line map distance.'],
 ['litresPer100Km','Vehicle consumption (L/100 km)','Your vehicle estimate, not a manufacturer guarantee.'],
 ['priceRandPerLitre','Assumed pump price (R/L)','Enter the relevant fuel grade and local price. No live price is loaded.'],
 ['travellers','People sharing the cost','Whole number, including the driver where applicable.'],
 ['tollsRand','Total toll allowance (R)','Check plazas, direction, vehicle class and effective date; enter zero explicitly if none.'],
 ['feesRand','All traveller entrance fees (R)','Total for the group, not per person. Confirm with venues.'],
 ['otherRand','Other journey costs (R)','Include food, parking and accommodation as needed.'],
 ['contingencyPercent','Contingency allowance (%)','An editable planning buffer, not a guarantee.'],
 ['budgetRand','Total available budget (R)','For the whole journey and group.'],
 ['drivingMinutes','Planned road-travel time (minutes)','Use a separately checked navigation estimate. No live traffic is read here.'],
 ['breakMinutes','Planned rest time (minutes)','Plan suitable safe breaks; do not remove needed rest to fit a deadline.'],
 ['availableMinutes','Total time available (minutes)','Include travel, rest and all selected visits.'],
];
const empty:Record<keyof JourneyInputs,string>={roadKm:'',litresPer100Km:'',priceRandPerLitre:'',travellers:'1',tollsRand:'',feesRand:'',otherRand:'',contingencyPercent:'10',budgetRand:'',drivingMinutes:'',breakMinutes:'',availableMinutes:''};
const rand=(n:number)=>'R'+(n/100).toFixed(2);
export function DriveIntelligencePanel({trail}:{trail:Trail}){
 const corridor=corridorId(trail.id),sources=sourcesForCorridor(corridor);
 const [parked,setParked]=useState(false),[values,setValues]=useState({...empty}),[chosen,setChosen]=useState<string[]>([]),[dwell,setDwell]=useState<Record<string,string>>({});
 const [result,setResult]=useState<JourneyResult|null>(null),[error,setError]=useState(''),[note,setNote]=useState('');
 const [question,setQuestion]=useState<TripQuestion>('road');
 const answer=evidenceAnswer(question,corridor);
 function resetResult(){setResult(null);setError('');}
 function readInputs(){
  if(fields.some(([key])=>!values[key].trim()))throw new Error('Complete each input; enter zero explicitly for costs that do not apply.');
  return Object.fromEntries(fields.map(([key])=>[key,Number(values[key])])) as JourneyInputs;
 }
 function readStops(){return chosen.map(id=>{const stop=trail.stops.find(s=>s.id===id);if(!stop)throw new Error('Unknown stop.');if(!(dwell[id]||'').trim())throw new Error('Enter a visit duration for every selected stop.');return {id,name:stop.name,minutes:Number(dwell[id])};});}
 function download(){try{
  const text=makeJourneyPack(corridor,readInputs(),readStops(),note);
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='luqi-drive-journey.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){setError(e instanceof Error?e.message:'Download unavailable.');}}
 return <details className="driveIntel" onToggle={e=>{if(!e.currentTarget.open)setParked(false);}}>
  <summary>Smart journey planner and evidence desk</summary>
  <header><p className="driveIntelKicker">LUQI-DRIVE / VERIFIED PLANNING BOUNDARIES</p><h2>Plan, check, explore and learn</h2><p>{trail.name}. Four local planning checks, not four autonomous AI agents. No bookings, metered AI requests or new GPS permissions.</p></header>
  <label className="driveIntelParked"><input type="checkbox" checked={parked} onChange={e=>setParked(e.target.checked)}/>I am safely parked or planning before travel.</label>
  <p>Do not operate this planner while driving. This checkbox does not detect vehicle motion. Existing GPS and narration controls are unchanged.</p>
  {parked&&<>
   <form onSubmit={e=>{e.preventDefault();try{setResult(planJourney(readInputs(),readStops()));setError('');}catch(e){setResult(null);setError(e instanceof Error?e.message:'Check your inputs.');}}}>
    <fieldset><legend>1. Your whole-journey assumptions</legend><div className="driveIntelFields">{fields.map(([key,label,hint])=><label key={key}>{label}<input type="number" min={key==='travellers'?'1':'0'} step="any" value={values[key]} onChange={e=>{setValues(v=>({...v,[key]:e.target.value}));resetResult();}} required/><small>{hint}</small></label>)}</div></fieldset>
    <fieldset><legend>2. Choose learning stops in your preferred order</legend><p>Selection order becomes the visit order; this is not a road-routing optimizer. Regions and province points may not be actual visitor entrances.</p>
     {trail.stops.map(stop=><div className="driveIntelStop" key={stop.id}><label><input type="checkbox" checked={chosen.includes(stop.id)} onChange={e=>{const selected=e.target.checked;setChosen(old=>selected?[...old,stop.id]:old.filter(id=>id!==stop.id));resetResult();}}/>{stop.name}</label>{chosen.includes(stop.id)&&<label>Visit minutes at {stop.name}<input type="number" min="0" max="1440" step="1" value={dwell[stop.id]||''} onChange={e=>{setDwell(d=>({...d,[stop.id]:e.target.value}));resetResult();}} required/></label>}</div>)}
     {chosen.length>0&&<p>Visit order: {chosen.map(id=>trail.stops.find(s=>s.id===id)?.name).join(' / ')}</p>}
    </fieldset><button type="submit">Create journey brief</button>
   </form>
   {error&&<p role="alert">{error}</p>}
   {result&&<section className="driveIntelResult" aria-label="Journey planning result" aria-live="polite"><h3>Four-part journey brief</h3><div className="driveIntelChecks">
    <article><h4>Budget check</h4><p>{rand(result.totalCents)} planned total, including {rand(result.contingencyCents)} contingency.</p><p>Fuel: {result.litres.toFixed(2)} L / {rand(result.fuelCents)}.</p><p>{result.fitsBudget?rand(result.remainingCents)+' remaining in your budget.':rand(-result.remainingCents)+' over budget. Revise costs or scope before committing.'}</p><details><summary>Exact cent-balanced cost split</summary><p>{result.perPersonCents.map((n,i)=>'Person '+(i+1)+': '+rand(n)).join('; ')}</p></details></article>
    <article><h4>Time check</h4><p>{result.totalMinutes} minutes total; {result.visitMinutes} minutes for selected visits.</p><p>{result.fitsTime?result.spareMinutes+' minutes remain in your allowance.':(-result.spareMinutes)+' minutes beyond your allowance. Reduce optional visits or allow more time, not faster driving or less necessary rest.'}</p><p>Not an ETA; closures, traffic and gate times remain unverified.</p></article>
    <article><h4>Evidence check</h4><p>Current road and weather conditions: not verified. Publisher links are not incident feeds or safety clearance.</p><p>Check current tariffs, venue access and warnings before departure.</p></article>
    <article><h4>Learning check</h4><p>{chosen.length} selected learning stops. Predict what you will learn, compare with the original source and explain it in your own words.</p><p>Use the existing multilingual guide and field notebook. English notes here are not certified translations.</p></article>
   </div><label>My optional learning reflection (do not enter sensitive details)<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label><p>A downloaded plan reveals the stops you choose and any notes you add. It excludes device GPS and account fields. Keep the file private.</p><button type="button" onClick={download}>Download compact journey pack</button><p>JSON reference copy, limited to 40,000 bytes; not offline navigation, guaranteed connectivity or CRDT synchronization.</p></section>}
   {chosen.length>0&&<section><h3>Source-linked learning stops</h3>{chosen.map(id=>{const stop=trail.stops.find(s=>s.id===id)!;return <details key={id}><summary>{stop.name}: learn and teach back</summary><p>{stop.descriptions.english}</p><a href={stop.source.url} target="_blank" rel="noopener noreferrer">{stop.source.label} (original guide source)</a><p>What surprised you? What is evidence, and what remains a question? Observe only from authorized visitor areas.</p></details>;})}</section>}
   <section><h3>Ask the trip evidence desk</h3><label>Question topic<select value={question} onChange={e=>setQuestion(e.target.value as TripQuestion)}><option value="road">Is my route open and safe?</option><option value="weather">What about weather warnings?</option><option value="fuel">What fuel price should I use?</option><option value="tolls">How much are the tolls?</option><option value="visits">Are attractions open and accessible?</option></select></label><p role="status" aria-label="Trip evidence answer">{answer.text}</p><p>Local rule-based guidance, not a live AI or operator response.</p>{answer.sources.map(s=><p key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></p>)}</section>
  </>}
  <section><h3>Original-source watchlist</h3><p>Source discovery dates are shown below, not the time of a live traffic/weather check. Automated source monitoring is implemented separately as an operator tool and is not active in this page. Links load externally only when opened.</p>
   {sources.map(s=><details key={s.id}><summary>{s.title} / {directoryState(s.directoryReviewedOn)}</summary><p>{s.note}</p><p>Directory reviewed: {s.directoryReviewedOn}. Proposed metadata check cadence: {s.cadenceHours} hours, unsuitable for real-time driving decisions.</p><a href={s.url} target="_blank" rel="noopener noreferrer">Open {s.title}</a></details>)}
  </section>
  <footer>Planning stays in this page's memory. Navigation, reload or account changes discard it; explicitly download to retain a copy. No new tracking, analytics, provider calls or background uploads are performed by this planner.</footer>
 </details>;
}
function ConnectedDriveIntelligence(){
 const [params]=useSearchParams();const customer=useOptionalCustomerSession();const trail=trails.find(t=>t.id===corridorId(params.get('trail')))||trails[0];
 return <DriveIntelligencePanel key={(customer?.session?.user.email||'anonymous')+':'+trail.id} trail={trail}/>;
}
/** Standalone fuel-calculator consumers need no router or session provider. */
export default function DriveIntelligenceEntry(){return useInRouterContext()?<ConnectedDriveIntelligence/>:null;}
