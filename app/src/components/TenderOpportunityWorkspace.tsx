import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,Bookmark,Check,ClipboardList,Clock,Download,FileText,HardHat,MapPin,Monitor,Package,Search,ShieldCheck,Wrench,X} from 'lucide-react';
import {PROVINCES} from '../lib/opportunity-sources';
import {WORK_CATEGORIES,workspaceMatches,workspaceState,workspaceDate,workspaceChecklist,parseWorkspaceSaved,type WorkspaceNotice,type RequirementAnswer} from '../lib/tender-opportunity-workspace';
import './tender-opportunity-workspace.css';
export type TenderDeskView='discover'|'saved'|'prepare'|'sources';
const STORE='luqi:tender-shortlist:v1';
const categoryIcons={supplies:Package,repairs:Wrench,ict:Monitor,roadworks:HardHat};
const stateLabel={ 'review-needed':'Recheck original', 'original-reviewed':'Original reviewed',closed:'Deadline passed','briefing-passed':'Compulsory briefing passed',unverified:'Not verified'};
function downloadText(name:string,text:string){
 const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function OriginalLink({notice,compact=false}:{notice:WorkspaceNotice;compact?:boolean}){
 return <a className="tw-original" href={notice.originalUrl} target="_blank" rel="noopener noreferrer"><FileText size={16} aria-hidden="true"/>{compact?'Original PDF':`Read original · ${notice.originalPages} pages`}<ArrowUpRight size={15} aria-hidden="true"/></a>;
}
/** Local public-notice discovery. No account, bid, price, private profile or inference. */
export function TenderOpportunityWorkspace({now,view,onViewChange}:{now:Date;view:TenderDeskView;onViewChange:(view:TenderDeskView)=>void}){
 const [query,setQuery]=useState(''),[province,setProvince]=useState('all'),[category,setCategory]=useState('all');
 const [small,setSmall]=useState(false),[history,setHistory]=useState(false);
 const [saved,setSaved]=useState<string[]>(()=>{try{return parseWorkspaceSaved(localStorage.getItem(STORE))}catch{return []}});
 const [storageMessage,setStorageMessage]=useState('Only saved public notice IDs stay on this device. No business records are stored.');
 const [selectedId,setSelectedId]=useState<string|null>(null),[detailTab,setDetailTab]=useState<'overview'|'requirements'|'next'>('overview');
 const [answers,setAnswers]=useState<Record<string,RequirementAnswer>>({});
 const [question,setQuestion]=useState(false),[copyMessage,setCopyMessage]=useState('');
 const detailHeading=useRef<HTMLHeadingElement|null>(null),focusDetail=useRef(false);
 const records=workspaceMatches({now,query,province,category,smallCeiling:small,history,savedOnly:view==='saved',savedIds:saved});
 const selected=records.find(n=>n.id===selectedId)||null;
 const checked=selected?selected.requirements.filter((_,i)=>answers[String(i)]==='checked').length:0;
 const missing=selected?selected.requirements.filter((_,i)=>answers[String(i)]==='missing').length:0;
 useEffect(()=>{if(focusDetail.current&&selected){detailHeading.current?.focus();focusDetail.current=false}},[selected]);
 useEffect(()=>{if(selectedId&&!records.some(n=>n.id===selectedId)){setSelectedId(null);setAnswers({});setQuestion(false)}},[query,province,category,small,history,view,selectedId,records.map(n=>n.id).join('|')]);
 function choose(n:WorkspaceNotice){focusDetail.current=true;setSelectedId(n.id);setAnswers({});setQuestion(false);setCopyMessage('');setDetailTab('overview')}
 function save(id:string){
  const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id].slice(0,50);setSaved(next);
  try{localStorage.setItem(STORE,JSON.stringify(next));setStorageMessage('Shortlist updated on this device. Only public notice IDs were saved.')}
  catch{setStorageMessage('Device storage is unavailable. Your shortlist works for this visit only.')}
 }
 function clearSaved(){setSaved([]);try{localStorage.removeItem(STORE)}catch{}setStorageMessage('Shortlist cleared. No business records were stored.')}
 function reset(){setQuery('');setProvince('all');setCategory('all');setSmall(false);setHistory(false)}
 function changeView(next:TenderDeskView){onViewChange(next);setSelectedId(null);setAnswers({});setQuestion(false)}
 async function copyQuestion(){if(!selected)return;try{await navigator.clipboard.writeText(selected.clarification);setCopyMessage('Question copied. Nothing was sent.')}catch{setCopyMessage('Copy the question from the text box below. Nothing was sent.')}}
 return <div className="tw-workspace">
  <header className="tw-hero">
   <div className="tw-orbit" aria-hidden="true"><span/><i/></div>
   <div className="tw-eyebrow"><span className="tw-brand-mark" aria-hidden="true">L</span> LUQI / BUSINESS OPPORTUNITIES</div>
   <div className="tw-hero-grid"><div>
    <p className="tw-kicker">Your skills. Your area. Your next opportunity.</p>
    <h1 id="tender-desk-heading">Find work your business<br className="tw-wide-break"/> can <em>deliver.</em></h1>
    <p className="tw-intro">Find a suitable quotation, understand the requirements and leave with a clear next step. Start here—no account needed.</p>
    <button type="button" className="tw-hero-action" onClick={()=>changeView('prepare')}>I already have a tender <ArrowRight size={18} aria-hidden="true"/></button>
   </div><aside className="tw-hero-note" aria-label="How this desk helps">
    <span className="tw-note-number">01 — 03</span>
    <p>From opportunity<br/>to a clear plan.</p>
    <div><Search size={16} aria-hidden="true"/> Find relevant work</div><div><ClipboardList size={16} aria-hidden="true"/> Check the real requirements</div><div><ArrowUpRight size={16} aria-hidden="true"/> Prepare your next step</div>
   </aside></div>
   <div className="tw-trust-row"><span><ShieldCheck size={15} aria-hidden="true"/> Original-source links</span><span>Small quotations included</span><span>Your decision. Your submission.</span></div>
  </header>
  <nav className="tw-nav" aria-label="Tender Desk sections">
   {([{id:'discover',text:'Find work'},{id:'saved',text:`My shortlist (${saved.length})`},{id:'prepare',text:'Prepare a response'},{id:'sources',text:'Sources & history'}] as const).map(tab=><button key={tab.id} type="button" aria-current={view===tab.id?'page':undefined} className={view===tab.id?'tw-nav-active':''} onClick={()=>changeView(tab.id)}>{tab.text}</button>)}
  </nav>
  {(view==='discover'||view==='saved')&&<section className="tw-discovery" aria-labelledby="tw-results-heading">
   <div className="tw-discovery-title"><div><p className="tw-eyebrow tw-ink-eyebrow">{view==='saved'?'YOUR WORKSPACE':'START WITH WHAT YOU DO'}</p><h2 id="tw-results-heading">{view==='saved'?'Your opportunity shortlist':'Find a fit. See what comes next.'}</h2></div><span className="tw-selection-label">A reviewed selection, not every tender</span></div>
   <div className="tw-search-row">
    <label className="tw-search"><span>What work or supplies?</span><div><Search size={18} aria-hidden="true"/><input type="search" aria-label="Find work by service, area or reference" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} placeholder="Try uniforms, Motherwell or a reference"/></div></label>
    <label className="tw-province"><span>Where can you deliver?</span><div><MapPin size={18} aria-hidden="true"/><select aria-label="Delivery province" value={province} onChange={e=>setProvince(e.target.value)}><option value="all">All provinces</option>{PROVINCES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></label>
   </div>
   <div className="tw-category-row" role="group" aria-label="Type of work">{WORK_CATEGORIES.map(c=><button type="button" key={c.id} aria-pressed={category===c.id} onClick={()=>setCategory(c.id)}>{c.label}</button>)}</div>
   <div className="tw-options"><label><input type="checkbox" checked={small} onChange={e=>setSmall(e.target.checked)}/> Published ceiling up to R200,000</label><label><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)}/> Include closed / past briefings</label><button type="button" onClick={reset}>Reset filters</button></div>
   {small&&<p className="tw-small-note">Only notices with a published ceiling are shown here. Unknown values are still included in All work; a ceiling is not the exact contract value.</p>}
   <div className="tw-results-toolbar"><p role="status" aria-label="Opportunity result count"><strong>{records.length}</strong> source-linked {records.length===1?'notice':'notices'}{view==='saved'?' in your shortlist':''}</p><span>Sorted by advertised closing date</span></div>
   <div className="tw-source-note"><ShieldCheck size={17} aria-hidden="true"/><p>Original reviews are dated <strong>9 November 2026</strong>. Release-time downloads could not be rechecked. These are research and preparation leads, <strong>not confirmed open bids</strong>. Check the issuer before spending.</p></div>
   {view==='saved'&&<div className="tw-shortlist-note"><p role="status">{storageMessage}</p>{saved.length>0&&<button type="button" onClick={clearSaved}>Clear shortlist</button>}</div>}
   <div className={selected?'tw-results-layout tw-with-detail':'tw-results-layout'}>
    <div className="tw-cards">
     {records.map(n=>{
      const Icon=categoryIcons[n.category],state=workspaceState(n,now),past=state==='closed'||state==='briefing-passed';
      return <article key={n.id} className={'tw-card'+(selected?.id===n.id?' tw-card-selected':'')} aria-label={n.reference}>
       <div className="tw-card-top"><span className="tw-service-icon"><Icon size={22} aria-hidden="true"/></span><span className="tw-kind">{n.type}</span><button type="button" className="tw-bookmark" aria-label={(saved.includes(n.id)?'Remove saved ':'Save ')+n.reference} aria-pressed={saved.includes(n.id)} onClick={()=>save(n.id)}><Bookmark size={19} aria-hidden="true" fill={saved.includes(n.id)?'currentColor':'none'}/></button></div>
       <p className="tw-issuer">{n.issuer}</p><h3>{n.title}</h3><p className="tw-location"><MapPin size={14} aria-hidden="true"/>{n.area}</p>
       <p className="tw-summary">{n.summary}</p>
       <div className="tw-deadline"><Clock size={16} aria-hidden="true"/><span><strong>{past?'Advertised closing':'Closes'} {workspaceDate(n.closesAt)}</strong></span></div>
       {n.briefingAt&&<p className="tw-briefing">Compulsory briefing · {workspaceDate(n.briefingAt)}</p>}
       <div className="tw-card-meta"><span className={'tw-state'+(past?' tw-state-past':'')}>{stateLabel[state]}</span>{n.ceilingZar!==null&&<span className="tw-ceiling">Ceiling R{n.ceilingZar.toLocaleString('en-ZA')}</span>}</div>
       <p className="tw-reference">{n.reference}</p>
       <div className="tw-card-actions"><button type="button" className="tw-primary" onClick={()=>choose(n)} aria-label={'Understand '+n.reference}>Understand & check <ArrowRight size={16} aria-hidden="true"/></button><OriginalLink notice={n} compact/></div>
      </article>;
     })}
     {!records.length&&<div className="tw-empty"><Search size={32} aria-hidden="true"/><h3>{view==='saved'?'No saved notices match these filters':'No reviewed notice matches yet'}</h3><p>{view==='saved'?'Save an opportunity from Find work. Closed notices remain available using the history option.':'This selection does not cover every issuer or province. No result here does not mean no opportunities exist.'}</p><div><button type="button" className="tw-primary" onClick={()=>{reset();if(view==='saved')changeView('discover')}}>{view==='saved'?'Find opportunities':'Show all reviewed notices'}</button><button type="button" className="tw-secondary" onClick={()=>changeView('sources')}>Explore official sources</button></div></div>}
    </div>
    {selected&&<section className="tw-detail" aria-label="Selected opportunity guide">
     <div className="tw-detail-heading"><span className="tw-eyebrow tw-ink-eyebrow">LUQI / OPPORTUNITY GUIDE</span><button type="button" className="tw-bookmark" aria-label="Close opportunity guide" onClick={()=>setSelectedId(null)}><X size={20} aria-hidden="true"/></button></div>
     <h3 tabIndex={-1} ref={detailHeading}>{selected.title}</h3><p className="tw-issuer">{selected.issuer} · {selected.reference}</p>
     <p className="tw-detail-status">{stateLabel[workspaceState(selected,now)]} · review recorded {selected.reviewedOn}</p>
     <div className="tw-detail-tabs" role="group" aria-label="Opportunity guide views">{([{id:'overview',text:'Understand'},{id:'requirements',text:'Check requirements'},{id:'next',text:'Next step'}] as const).map(t=><button type="button" key={t.id} aria-pressed={detailTab===t.id} onClick={()=>setDetailTab(t.id)}>{t.text}</button>)}</div>
     {detailTab==='overview'&&<div className="tw-guide-content"><h4>What they need</h4><p>{selected.summary}</p><h4>Can you deliver here?</h4><p>{selected.delivery}</p><dl><div><dt>Published</dt><dd>{selected.publishedOn}</dd></div><div><dt>Closing time</dt><dd>{workspaceDate(selected.closesAt)}</dd></div><div><dt>Estimated contract value</dt><dd>not stated</dd></div><div><dt>Document fee</dt><dd>{selected.fee}</dd></div></dl>{selected.ceilingZar!==null&&<p className="tw-callout">Published ceiling: R{selected.ceilingZar.toLocaleString('en-ZA')} including taxes. This is not the exact value or a price to quote.</p>}
      <h4>Briefing / site visit</h4><p>{selected.briefingAt?`${workspaceDate(selected.briefingAt)} — ${selected.briefingVenue}`:'No compulsory briefing was identified in the reviewed original. Check for later addenda.'}</p>
      <button type="button" className="tw-primary" onClick={()=>setDetailTab('requirements')}>Check what you need <ArrowRight size={16} aria-hidden="true"/></button>
     </div>}
     {detailTab==='requirements'&&<div className="tw-guide-content"><h4>Your requirement check</h4><p>Compare these points with your own evidence. You are not uploading documents or making a legal declaration.</p>
      {selected.requirements.map((requirement,i)=><label key={selected.id+'-'+i} className="tw-requirement"><span><span className="tw-step-number">{i+1}</span>{requirement}</span><select aria-label={`Requirement ${i+1} status`} value={answers[String(i)]||'unknown'} onChange={e=>setAnswers(a=>({...a,[String(i)]:e.target.value as RequirementAnswer}))}><option value="unknown">Still to check</option><option value="checked">I have checked this</option><option value="missing">I am missing this</option></select></label>)}
      <p className="tw-progress" role="status">{checked} of {selected.requirements.length} self-marked checked · {missing} missing. This is not eligibility approval.</p>
      <p className="tw-small-note">Checks stay in this tab only and reset when you choose another notice. Supplier registration and preference points do not guarantee an award.</p>
      <button type="button" className="tw-primary" onClick={()=>setDetailTab('next')}>See my next step <ArrowRight size={16} aria-hidden="true"/></button>
     </div>}
     {detailTab==='next'&&<div className="tw-guide-content"><div className="tw-next-step"><Check size={20} aria-hidden="true"/><div><h4>Your next useful action</h4><p>{selected.nextStep}</p></div></div>
      <h4>How to apply</h4><p>{selected.submission}</p><h4>Clarify before you spend</h4><ul>{selected.cautions.map(c=><li key={c}>{c}</li>)}</ul><p className="tw-contact">{selected.enquiry}</p>
      <button type="button" className="tw-secondary" onClick={()=>setQuestion(v=>!v)}>{question?'Hide clarification question':'Help me ask the issuer'}</button>
      {question&&<div className="tw-question"><label>Question to send yourself<textarea readOnly value={selected.clarification} rows={5}/></label><button type="button" className="tw-secondary" onClick={()=>{void copyQuestion()}}>Copy question</button><p role="status">{copyMessage||'Luqi will not contact the issuer or send a bid.'}</p></div>}
      <button type="button" className="tw-primary" onClick={()=>downloadText('luqi-opportunity-checklist-'+selected.id+'.txt',workspaceChecklist(selected,answers,new Date()))}><Download size={17} aria-hidden="true"/> Download my checklist</button>
      <button type="button" className="tw-secondary" onClick={()=>changeView('prepare')}>Open original-form assistance</button>
     </div>}
     <div className="tw-detail-sources"><OriginalLink notice={selected}/><a href={selected.listingUrl} target="_blank" rel="noopener noreferrer">Issuer listing & amendments <ArrowUpRight size={14} aria-hidden="true"/></a><a href={selected.evidenceUrl} target="_blank" rel="noopener noreferrer">Dated source-review record <ArrowUpRight size={14} aria-hidden="true"/></a><p>Guidance comes from the recorded original-document review, not an AI eligibility decision. Full official instructions and later addenda control.</p></div>
    </section>}
   </div>
   <footer className="tw-discovery-footer"><p><strong>Built for businesses of every size.</strong> No minimum contract value. Requirements come from each issuer—not assumptions about who you are.</p><button type="button" onClick={()=>changeView('sources')}>Need a different area? Explore official sources <ArrowRight size={16} aria-hidden="true"/></button></footer>
  </section>}
  {view==='prepare'&&<div className="tw-view-intro"><p className="tw-eyebrow tw-ink-eyebrow">TURN REQUIREMENTS INTO A PLAN</p><h2>Prepare with the original documents.</h2><p>Start with the issuer’s own pack. The supported Treasury SBD 1 fills contact fields locally; other originals have inspection limits. You control prices, declarations, signatures and submission.</p><p>No government affiliation or automatic tender submission. No private data is sent by the local form tools.</p></div>}
  {view==='sources'&&<div className="tw-view-intro"><p className="tw-eyebrow tw-ink-eyebrow">EVIDENCE & COVERAGE</p><h2>Go straight to the source.</h2><p>Search official publishers, inspect older records and see advertisements awaiting full documents. These are supporting sources—not a complete list of open tenders.</p></div>}
 </div>;
}
