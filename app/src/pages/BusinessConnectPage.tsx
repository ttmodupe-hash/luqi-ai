import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useCustomerSession } from '../providers/customer-session';
import { getStoredLanguage } from '../lib/languages';
import { MUNICIPALITIES, PROVINCE_NAMES } from '../lib/municipal-economy';
import { BUSINESS_CATEGORIES, BUSINESS_DAYS, BUSINESS_LANGUAGES, BUSINESS_PROVINCES, businessProfile, publicBusiness,
  type BusinessProfile } from '../../contracts/businessConnect';
import { businessCopy, businessNavigationLink, businessRequest, businessResponses, businessSharePath, newBusinessDraft,
  BUSINESS_LANGUAGE_NAMES, initialBusinessVerification, type BusinessDraft, type BusinessSummary, type OwnedBusiness, type PublicBusiness } from '../lib/business-connect';
import '../business-connect.css';

function Verification({value}:{value:PublicBusiness['verification']}) {
  return <ul className="bc-badges" aria-label="Listing checks">
    <li>{value.ownerApproved?'Owner approved public details':'Owner approval pending'}</li>
    <li>{value.contactConfirmed?'Business contact confirmed by Luqi':'Business contact unverified'}</li>
    <li>{value.locationReview==='point_reviewed'?'Storefront point reviewed by Luqi':value.locationReview==='service_area_reviewed'?'Service area reviewed by Luqi':'Location unverified'}</li>
    <li>External map listing not checked</li>
  </ul>;
}
function BusinessCard({b}:{b:BusinessSummary}) {
  return <article className="bc-card"><p className="bc-kicker">{b.categories.join(' · ')}</p>
    <h2><Link to={businessSharePath(b.id)}>{b.tradingName}</Link></h2><p>{b.description}</p>
    <p>{b.locality} · {b.municipality}</p><p>{b.kind.replaceAll('_',' ')} · {b.languages.map(l=>BUSINESS_LANGUAGE_NAMES[l]).join(', ')}</p>
    <Verification value={b.verification}/><Link className="bc-link" to={businessSharePath(b.id)}>View services and contact choices</Link></article>;
}
function PublicDetails({b,language}:{b:PublicBusiness;language:string}) {
  const description=language===b.descriptionLanguage?b.description:b.translations.find(t=>t.language===language)?.description??b.description;
  const navigation=businessNavigationLink(b);
  return <article className="bc-card bc-detail"><p className="bc-kicker">{b.categories.join(' · ')}</p><h2>{b.tradingName}</h2>
    <p lang={b.translations.some(t=>t.language===language)||language===b.descriptionLanguage?language:b.descriptionLanguage}>{description}</p>
    <p className="bc-muted">Business descriptions and translations are supplied by the owner.</p>
    <Verification value={b.verification}/><h3>Services and products</h3><ul>{b.services.map((s,i)=><li key={i}>{s.name}{s.price?' · '+s.price:''}</li>)}</ul>
    <h3>Where we trade</h3><p>{b.locality} · {b.municipality} · {PROVINCE_NAMES[b.province]}</p>
    {b.serviceArea&&<p>Service area: {b.serviceArea}{b.deliveryRadiusKm!==null?' · up to '+b.deliveryRadiusKm+' km':''}</p>}
    {b.publicAddress&&<p>{b.publicAddress}</p>}{b.landmark&&<p>Landmark: {b.landmark}</p>}
    {navigation?<a href={navigation} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open directions to the owner-approved pin</a>:<p>No precise address or pin is public. Arrange service directly with the business.</p>}
    {navigation&&<p className="bc-muted">Opening directions does not mean Google has verified or listed this business.</p>}
    <h3>Contact preferences</h3><div className="bc-actions">
      {b.contacts.phone&&<a href={'tel:'+b.contacts.phone.replace(/[^\d+]/g,'')}>Call business</a>}
      {b.contacts.whatsapp&&<a href={'https://wa.me/'+b.contacts.whatsapp.replace(/\D/g,'')} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">WhatsApp business</a>}
      {b.contacts.email&&<a href={'mailto:'+b.contacts.email}>Email business</a>}
      {b.contacts.website&&<a href={b.contacts.website} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Business website</a>}
    </div>{!Object.keys(b.contacts).length&&<p>The owner has not made any contact channel public.</p>}
    {b.preferredContact!=='none'&&<p>Preferred channel: {b.preferredContact}</p>}
    <h3>Operating hours · South Africa time</h3><dl className="bc-hours-list">{b.hours.map(h=><div key={h.day}><dt>{h.day}</dt><dd>{h.closed?'Closed':h.opens+'–'+h.closes+(h.overnight?' (next day)':'')}</dd></div>)}</dl>
    <p>Languages: {b.languages.map(l=>BUSINESS_LANGUAGE_NAMES[l]).join(', ')}</p>
    {!!b.accessibility.length&&<p>Owner-described access: {b.accessibility.map(a=>a.replaceAll('_',' ')).join(', ')}</p>}
    <p className="bc-muted">Luqi listing and review do not confirm company registration, licences or external map approval.</p>
  </article>;
}

function BusinessEditor({business,busy,onSave,onCancel,language}:{business:OwnedBusiness|null;busy:boolean;
  onSave:(id:string,revision:number,p:BusinessProfile)=>Promise<void>;onCancel:()=>void;language:string}) {
  const [draft,setDraft]=useState<BusinessDraft>(()=>business?structuredClone(business.profile):newBusinessDraft());
  const [latitude,setLatitude]=useState(business?.profile.publicPoint?.latitude.toString()??'');
  const [longitude,setLongitude]=useState(business?.profile.publicPoint?.longitude.toString()??'');
  const [translationLanguage,setTranslationLanguage]=useState('zu');
  const [errors,setErrors]=useState<string[]>([]);
  const [id]=useState(()=>business?.id??crypto.randomUUID());
  const copy=businessCopy(language);
  const update=<K extends keyof BusinessDraft>(key:K,value:BusinessDraft[K])=>setDraft(p=>({...p,[key]:value}));
  function locationOff(kind:BusinessProfile['kind']) {
    setDraft(p=>({...p,kind,publicAddress:'',landmark:'',publicPoint:null,consent:{...p.consent,exactLocation:false}}));setLatitude('');setLongitude('');
  }
  async function save(e:FormEvent) {
    e.preventDefault();if(busy)return;
    const proposed={...draft,publicPoint:draft.consent.exactLocation&&(latitude!==''||longitude!=='')?
      {latitude:latitude===''?NaN:Number(latitude),longitude:longitude===''?NaN:Number(longitude)}:null};
    const parsed=businessProfile.safeParse(proposed);
    if(!parsed.success){setErrors(parsed.error.issues.slice(0,5).map(i=>(i.path.join('.')||'Listing')+': '+i.message));return;}
    setErrors([]);await onSave(id,business?.revision??0,parsed.data);
  }
  const contact=(key:'phone'|'whatsapp'|'email'|'website',value:string,publish:boolean)=>update('contacts',{
    ...draft.contacts,[key]:{value,public:publish},preferred:!publish&&draft.contacts.preferred===key?'none':draft.contacts.preferred});
  return <form className="bc-card bc-editor" onSubmit={save} aria-label="Business registration">
    <h2>{business?'Edit your business':'Add your business'}</h2><p>Save a private draft first. Sending it for review requires separate permission to publish.</p>
    <p className="bc-muted">Do not add an ID number, bank details, customer data, private home address or third-party passwords. Text and contact choices only; photo/evidence uploads are not available in this phase.</p>
    <fieldset disabled={busy}><legend>1 · Your business and services</legend><div className="bc-grid">
      <label>Owner-confirmed business name<input required maxLength={120} value={draft.ownerConfirmedName} onChange={e=>update('ownerConfirmedName',e.target.value)}/><small>Private to you and authorised reviewers.</small></label>
      <label>Public trading name<input required maxLength={120} value={draft.tradingName} onChange={e=>update('tradingName',e.target.value)}/></label>
    </div><label>Business description<textarea required minLength={10} maxLength={1200} value={draft.description} onChange={e=>update('description',e.target.value)}/></label>
    <label>Description language<select value={draft.descriptionLanguage} onChange={e=>{
      const code=e.target.value as BusinessProfile['descriptionLanguage'];setDraft(p=>({...p,descriptionLanguage:code,translations:p.translations.filter(t=>t.language!==code)}));
    }}>{BUSINESS_LANGUAGES.map(l=><option value={l} key={l}>{BUSINESS_LANGUAGE_NAMES[l]}</option>)}</select></label>
    <div><p>Categories · choose up to three</p><div className="bc-choices">{BUSINESS_CATEGORIES.map(category=><label className="bc-check" key={category}><input type="checkbox" checked={draft.categories.includes(category)}
      onChange={e=>update('categories',e.target.checked?[...draft.categories,category].slice(0,3):draft.categories.filter(c=>c!==category))}/>{category}</label>)}</div></div>
    <label>Services and optional prices · one per line, e.g. Haircut | R80<textarea required value={draft.services.map(s=>s.name+(s.price?' | '+s.price:'')).join('\n')} maxLength={2700}
      onChange={e=>update('services',e.target.value.split('\n').slice(0,15).map(line=>{const [name,...price]=line.split('|');return {name,price:price.join('|')};}))}/></label>
    </fieldset>
    <fieldset disabled={busy}><legend>2 · Local area, without a private home pin</legend><div className="bc-grid">
      <label>Business province<select value={draft.province} onChange={e=>{const province=e.target.value as BusinessProfile['province'];setDraft(p=>({...p,province,municipality:MUNICIPALITIES.find(m=>m.province===province)!.name}));}}>
        {BUSINESS_PROVINCES.map(p=><option value={p} key={p}>{PROVINCE_NAMES[p]}</option>)}</select></label>
      <label>Business municipality<select value={draft.municipality} onChange={e=>update('municipality',e.target.value)}>{MUNICIPALITIES.filter(m=>m.province===draft.province).map(m=><option key={m.name}>{m.name}</option>)}</select></label>
      <label>Township, town or village<input required maxLength={100} value={draft.locality} onChange={e=>update('locality',e.target.value)}/></label>
      <label>How you trade<select aria-label="How you trade" value={draft.kind} onChange={e=>locationOff(e.target.value as BusinessProfile['kind'])}><option value="service_area">Service area · travel to customers</option><option value="mobile">Mobile trader</option><option value="home_based">Home-based business</option><option value="storefront">Public storefront</option></select></label>
    </div><label>Public service area<input maxLength={250} required={draft.kind!=='storefront'} value={draft.serviceArea} placeholder="e.g. Soshanguve, Mabopane and nearby areas" onChange={e=>update('serviceArea',e.target.value)}/></label>
    <label>Optional delivery radius in km<input type="number" min="0" max="200" value={draft.deliveryRadiusKm??''} onChange={e=>update('deliveryRadiusKm',e.target.value===''?null:Number(e.target.value))}/></label>
    {draft.kind==='storefront'&&<label className="bc-check"><input type="checkbox" checked={draft.consent.exactLocation} onChange={e=>{
      if(!e.target.checked)locationOff('storefront');else update('consent',{...draft.consent,exactLocation:true});}}/>I choose to make this storefront address, landmark and optional exact pin public.</label>}
    {draft.kind==='storefront'&&draft.consent.exactLocation&&<div className="bc-grid">
      <label>Public storefront address<input maxLength={250} value={draft.publicAddress} onChange={e=>update('publicAddress',e.target.value)}/></label>
      <label>Public landmark or entrance<input maxLength={150} value={draft.landmark} onChange={e=>update('landmark',e.target.value)}/></label>
      <label>Optional public latitude<input inputMode="decimal" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label>
      <label>Optional public longitude<input inputMode="decimal" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label>
      <p className="bc-muted">Manual coordinates are proposed by the owner. GPS, mapping and boundary checks are not performed here.</p>
    </div>}</fieldset>
    <fieldset disabled={busy}><legend>3 · Contact choices</legend>
      <label className="bc-check"><input type="checkbox" checked={draft.consent.contacts} onChange={e=>setDraft(p=>({...p,consent:{...p.consent,contacts:e.target.checked},contacts:{...p.contacts,preferred:e.target.checked?p.contacts.preferred:'none'}}))}/>I allow the contact channels I select below to be public.</label>
      <div className="bc-grid">{(['phone','whatsapp','email','website'] as const).map(key=><div key={key}>
        <label>{key==='website'?'Website · https://':key==='whatsapp'?'WhatsApp · international number':key==='phone'?'Business phone':'Business email'}<input type={key==='email'?'email':key==='website'?'url':'tel'} maxLength={key==='website'?400:key==='email'?200:25} value={draft.contacts[key].value}
          onChange={e=>contact(key,e.target.value,draft.contacts[key].public)}/></label>
        <label className="bc-check"><input type="checkbox" disabled={!draft.consent.contacts} checked={draft.contacts[key].public} onChange={e=>contact(key,draft.contacts[key].value,e.target.checked)}/>Show {key} publicly</label>
      </div>)}</div>
      <label>Preferred public contact<select value={draft.contacts.preferred} onChange={e=>update('contacts',{...draft.contacts,preferred:e.target.value as BusinessProfile['contacts']['preferred']})}>
        <option value="none">No preference</option>{(['phone','whatsapp','email','website'] as const).filter(k=>draft.consent.contacts&&draft.contacts[k].public&&draft.contacts[k].value).map(k=><option value={k} key={k}>{k}</option>)}</select></label>
    </fieldset>
    <fieldset disabled={busy}><legend>4 · Hours, languages and access</legend>
      {BUSINESS_DAYS.map((day,i)=><div className="bc-hour" key={day}><strong>{day}</strong>
        <label className="bc-check"><input type="checkbox" checked={draft.hours[i].closed} aria-label={day+' closed'} onChange={e=>update('hours',draft.hours.map(h=>h.day===day?{...h,closed:e.target.checked}:h))}/>Closed</label>
        <label className="bc-time">Opens<input type="time" aria-label={day+' opens'} disabled={draft.hours[i].closed} value={draft.hours[i].opens} onChange={e=>update('hours',draft.hours.map(h=>h.day===day?{...h,opens:e.target.value}:h))}/></label>
        <label className="bc-time">Closes<input type="time" aria-label={day+' closes'} disabled={draft.hours[i].closed} value={draft.hours[i].closes} onChange={e=>update('hours',draft.hours.map(h=>h.day===day?{...h,closes:e.target.value}:h))}/></label>
        <label className="bc-check"><input type="checkbox" checked={draft.hours[i].overnight} disabled={draft.hours[i].closed} onChange={e=>update('hours',draft.hours.map(h=>h.day===day?{...h,overnight:e.target.checked}:h))}/>Next day</label>
      </div>)}
      <p>Languages customers can use</p><div className="bc-choices">{BUSINESS_LANGUAGES.map(l=><label className="bc-check" key={l}><input type="checkbox" checked={draft.languages.includes(l)} onChange={e=>update('languages',e.target.checked?[...draft.languages,l]:draft.languages.filter(v=>v!==l))}/>{BUSINESS_LANGUAGE_NAMES[l]}</label>)}</div>
      <label>Optional description translation<select value={translationLanguage} onChange={e=>setTranslationLanguage(e.target.value)}>{BUSINESS_LANGUAGES.filter(l=>l!==draft.descriptionLanguage).map(l=><option key={l} value={l}>{BUSINESS_LANGUAGE_NAMES[l]}</option>)}</select></label>
      {translationLanguage!==draft.descriptionLanguage&&<label>Owner-written translation<textarea maxLength={1200} value={draft.translations.find(t=>t.language===translationLanguage)?.description??''} onChange={e=>update('translations',[
        ...draft.translations.filter(t=>t.language!==translationLanguage),...(e.target.value?[{language:translationLanguage as BusinessProfile['descriptionLanguage'],description:e.target.value}]:[])])}/></label>}
      <div className="bc-choices">{(['step_free','wheelchair_access','sign_language','delivery','by_appointment'] as const).map(a=><label className="bc-check" key={a}><input type="checkbox" checked={draft.accessibility.includes(a)} onChange={e=>update('accessibility',e.target.checked?[...draft.accessibility,a]:draft.accessibility.filter(v=>v!==a))}/>{a.replaceAll('_',' ')}</label>)}</div>
    </fieldset>
    <fieldset disabled={busy}><legend>5 · Your permission</legend>
      <label className="bc-check"><input type="checkbox" required checked={draft.consent.ownerAuthority} onChange={e=>update('consent',{...draft.consent,ownerAuthority:e.target.checked})}/>I own this business or have authority to represent it.</label>
      <label className="bc-check"><input type="checkbox" required checked={draft.consent.storage} onChange={e=>update('consent',{...draft.consent,storage:e.target.checked})}/>I consent to Luqi storing these details to run and review my listing under the Business Connect privacy notice.</label>
      <label className="bc-check"><input type="checkbox" checked={draft.consent.publicListing} onChange={e=>update('consent',{...draft.consent,publicListing:e.target.checked})}/>I approve public display of my trading name, services, hours, languages and selected location/contact details after review.</label>
      <p>Saving does not publish your business. No marketing or external map submission is authorised. You can pause, change visibility or delete your listing.</p>
      <p className="bc-muted">Inactive drafts, paused and review-held listings expire after 180 days without an update. Operational audit events expire after 90 days; resolved reports after 30 days. Live profile details are removed when you delete. See <Link to="/business-connect/privacy">Business Connect privacy and retention</Link>.</p>
    </fieldset>
    {!!errors.length&&<ul role="alert">{errors.map((error,i)=><li key={i}>{error}</li>)}</ul>}
    <div className="bc-actions"><button className="bc-primary" type="submit" disabled={busy}>{copy.save}</button><button type="button" disabled={busy} onClick={onCancel}>Close editor</button></div>
  </form>;
}

function ReviewCard({b,busy,onReview}:{b:OwnedBusiness;busy:boolean;onReview:(b:OwnedBusiness,body:unknown)=>Promise<void>}) {
  const [decision,setDecision]=useState(b.state==='suspended'?'release':b.state==='published'?'suspend':'approve'),[reason,setReason]=useState('checked'),[method,setMethod]=useState('content_only');
  const [contactConfirmed,setContact]=useState(false),[locationReview,setLocation]=useState('unreviewed'),[attested,setAttested]=useState(false);
  return <form className="bc-card" onSubmit={e=>{e.preventDefault();if(!busy)void onReview(b,{decision,reason,method,contactConfirmed,locationReview,attested});}}>
    <h3>{b.profile.tradingName} · {b.state}</h3><p>Owner-confirmed name: {b.profile.ownerConfirmedName}</p>
    <PublicDetails b={publicBusiness(b)} language="en"/>
    <p>Private reviewer contact: {Object.values(b.profile.contacts).filter((v):v is {value:string;public:boolean}=>typeof v==='object').map(v=>v.value).filter(Boolean).join(' · ')||'No contact supplied'}</p>
    <p className="bc-muted">Check the full owner submission, duplicates, impersonation and public permissions. A content review alone does not confirm a contact or location.</p>
    <fieldset disabled={busy}><legend>Reviewer decision</legend>
      <label>Decision<select value={decision} onChange={e=>setDecision(e.target.value)}>{(b.state==='suspended'?['release']:b.state==='published'?['suspend']:['approve','reject','suspend']).map(d=><option key={d}>{d}</option>)}</select></label>
      <label>Review reason<select value={reason} onChange={e=>setReason(e.target.value)}>{['checked','duplicate','misleading','privacy','impersonation','other'].map(r=><option key={r}>{r}</option>)}</select></label>
      <label>Review method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="content_only">Content review only</option><option value="business_contact">Direct business contact</option><option value="site_visit">Site visit</option></select></label>
      <label className="bc-check"><input type="checkbox" checked={contactConfirmed} onChange={e=>setContact(e.target.checked)}/>I independently confirmed this business contact.</label>
      <label>Location evidence<select value={locationReview} onChange={e=>setLocation(e.target.value)}><option value="unreviewed">Unreviewed</option><option value="service_area_reviewed">Service area reviewed by direct business contact</option><option value="point_reviewed">Storefront point reviewed by site visit</option></select></label>
      <label className="bc-check"><input type="checkbox" required checked={attested} onChange={e=>setAttested(e.target.checked)}/>I performed the checks selected above and approve this decision for this exact revision.</label>
    </fieldset><button type="submit" disabled={busy}>Record review</button>
  </form>;
}

function PrivacyNotice() {
  return <section className="bc-card"><h2>Business Connect privacy and retention</h2>
    <p>Luqi uses your account ID, owner-confirmed business details and consent record to store your draft, review ownership claims and operate the directory. Your account email is never copied into a public listing. Only contacts you explicitly select are shown.</p>
    <p>Home-based, mobile and service-area listings do not collect precise residential coordinates. A public storefront pin is optional. No GPS permission, private photographs, national IDs, banking details or third-party login details are collected here.</p>
    <p>Authorised reviewers can see your current draft and any private business contact you supplied. Public profile consent is separate from contact and precise-location choices. Neither marketing nor disclosure to mapping providers is part of this consent.</p>
    <p>Deleting immediately removes the current profile, its contacts and location and associated reports. A minimal audit event with account reference may remain for 90 days for abuse handling. It contains no past description, contact value or address. Draft, paused, pending, rejected and suspended records without updates expire after 180 days. Reports expire 30 days after resolution or 90 days after creation; daily abuse counters expire after two days.</p>
    <p>Retention runs require an authorised operator. Scheduling, deletion monitoring, backup expiry and the Information Officer/contact process must be confirmed before public rollout. This review prototype does not certify POPIA compliance. Information intentionally placed in free text is visible to its intended readers; review it before consenting.</p>
    <p>To withdraw publication immediately, pause your listing; to withdraw storage consent, delete it. Use the correction/privacy report form or <Link to="/contact">Luqi support</Link> for an access, correction or removal request. Luqi cannot retract copies someone already made or independently published external listings.</p>
  </section>;
}

function Workspace({token,id}:{token?:string;id?:string}) {
  const [status,setStatus]=useState<{enabled:boolean;publicDirectory:boolean;mode:string}|null>(null),[language,setLanguage]=useState(()=>getStoredLanguage().code);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[tab,setTab]=useState<'find'|'mine'|'review'>('find');
  const [businesses,setBusinesses]=useState<BusinessSummary[]>([]),[owned,setOwned]=useState<OwnedBusiness[]>([]),[canReview,setCanReview]=useState(false);
  const [detail,setDetail]=useState<PublicBusiness|null>(null),[editing,setEditing]=useState<OwnedBusiness|null|undefined>(undefined),[preview,setPreview]=useState<PublicBusiness|null>(null);
  const [query,setQuery]=useState(''),[province,setProvince]=useState(''),[municipality,setMunicipality]=useState(''),[category,setCategory]=useState(''),[serviceLanguage,setServiceLanguage]=useState('');
  const [page,setPage]=useState(0),[nextPage,setNextPage]=useState<number|null>(null),[queue,setQueue]=useState<OwnedBusiness[]>([]),[reports,setReports]=useState<Array<{id:string;businessId:string|null;kind:string;details:string}>>([]);
  const [reportKind,setReportKind]=useState('correction'),[reportText,setReportText]=useState(''),[history,setHistory]=useState<Array<{action:string;revision:number}>>([]);
  const alive=useRef(true),searchEpoch=useRef(0);const copy=businessCopy(language);
  useEffect(()=>{alive.current=true;void businessRequest('/status',undefined,businessResponses.status).then(s=>{if(alive.current)setStatus(s);}).catch(()=>{if(alive.current)setError('Business Connect status is unavailable.');});return()=>{alive.current=false;searchEpoch.current++;};},[]);
  useEffect(()=>{setDetail(null);if(!status?.enabled||!id||id==='privacy'||(!token&&!status.publicDirectory))return;
    let current=true;void businessRequest('/directory/'+id,token,businessResponses.page).then(r=>{if(current&&alive.current)setDetail(r.business);}).catch(e=>{if(current&&alive.current)setError(e instanceof Error?e.message:'Listing unavailable.');});return()=>{current=false;};},[id,status,token]);
  useEffect(()=>{if(!status?.enabled||!token)return;void businessRequest('/mine',token,businessResponses.mine).then(r=>{if(alive.current){setOwned(r.businesses);setCanReview(r.canReview);}}).catch(e=>{if(alive.current)setError(e.message);});},[status,token]);
  async function action(task:()=>Promise<void>) {if(busy)return;setBusy(true);setError('');setNotice('');try{await task();}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Request failed. Refresh before retrying.');}finally{if(alive.current)setBusy(false);}}
  async function search(target=0) {const epoch=++searchEpoch.current;await action(async()=>{
    const params=new URLSearchParams({q:query,page:String(target),...(province?{province}:{}),...(municipality?{municipality}:{}),...(category?{category}:{}),...(serviceLanguage?{language:serviceLanguage}:{})});
    const r=await businessRequest('/directory?'+params,token,businessResponses.directory);
    if(alive.current&&epoch===searchEpoch.current){setBusinesses(r.businesses);setNextPage(r.nextPage);setPage(target);}
  });}
  async function reloadOwned(){const r=await businessRequest('/mine',token,businessResponses.mine);if(alive.current){setOwned(r.businesses);setCanReview(r.canReview);}}
  async function reviewQueue(){await action(async()=>{const r=await businessRequest('/moderation/queue',token,businessResponses.queue);if(alive.current){setQueue(r.businesses);setReports(r.reports);setTab('review');}});}
  const ownerAction=async(b:OwnedBusiness,kind:'submit'|'pause'|'delete')=>action(async()=>{
    const payload={expectedRevision:b.revision,confirm:true};
    if(kind==='delete')await businessRequest('/mine/'+b.id+'/'+kind,token,businessResponses.removed,payload);
    else await businessRequest('/mine/'+b.id+'/'+kind,token,businessResponses.saved,payload);
    if(alive.current){setPreview(null);setEditing(undefined);setHistory([]);setNotice(kind==='submit'?'Sent for human review. The listing is not yet public.':kind==='pause'?'Listing paused and removed from discovery.':'Listing deleted.');}await reloadOwned();
  });
  return <main className="business-connect" aria-labelledby="bc-title"><header className="bc-header"><p className="bc-kicker">LUQI BUSINESS CONNECT · SOUTH AFRICA</p><h1 id="bc-title">{copy.heading}</h1>
    <p>Help people find your skills, shop or service — in a township, village, town or on the move.</p><p lang={language}>{copy.privacy}</p>
    <label>Business Connect language<select value={BUSINESS_LANGUAGES.includes(language as typeof BUSINESS_LANGUAGES[number])?language:'en'} onChange={e=>setLanguage(e.target.value)}>{BUSINESS_LANGUAGES.map(l=><option key={l} value={l}>{BUSINESS_LANGUAGE_NAMES[l]}</option>)}</select></label>
    <p className="bc-muted">Local-language navigation and owner-written descriptions. Detailed field labels and review instructions are currently in English.</p>
  </header>
  {error&&<p role="alert" className="bc-alert">{error}</p>}{notice&&<p role="status" className="bc-notice">{notice}</p>}
  {!status?<p role="status">Checking preview availability…</p>:!status.enabled?<section className="bc-card"><h2>Business Connect is being prepared for review</h2><p>Business registration and directory access are not enabled here yet.</p><Link to="/township-economy">Explore small-business guidance</Link></section>:<>
    <p className="bc-notice">{status.publicDirectory?'Directory access is enabled.':'Private review preview · sign in with your existing Luqi account. No public directory rollout.'} A Luqi listing does not register a company with CIPC or verify it with a mapping provider.</p>
    {id==='privacy'?<PrivacyNotice/>:!token&&!status.publicDirectory?<section className="bc-card"><h2>Use your Luqi account</h2><Link to="/login">Sign in</Link> · <Link to="/join">Create an account</Link></section>:id?<>
      <Link to="/business-connect">Back to Business Connect</Link>{detail&&<><PublicDetails b={detail} language={language}/><a className="bc-link" href={'/#'+businessSharePath(detail.id)}>Shareable business page</a>
        <p className="bc-muted">This link works for signed-in preview reviewers until a public rollout is approved.</p></>}
    </>:<>
      <nav className="bc-actions" aria-label="Business Connect sections"><button aria-pressed={tab==='find'} onClick={()=>{setTab('find');setPreview(null);}}>{copy.find}</button><button aria-pressed={tab==='mine'} onClick={()=>{setTab('mine');setPreview(null);}}>{copy.mine}</button>{canReview&&<button disabled={busy} onClick={()=>void reviewQueue()}>Review queue</button>}</nav>
      {tab==='find'&&<><form className="bc-card" onSubmit={e=>{e.preventDefault();void search();}}><div className="bc-grid">
        <label>Search business name, service or locality<input value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/></label>
        <label>Directory province<select value={province} onChange={e=>{setProvince(e.target.value);setMunicipality('');}}><option value="">All provinces</option>{BUSINESS_PROVINCES.map(p=><option key={p} value={p}>{PROVINCE_NAMES[p]}</option>)}</select></label>
        <label>Directory municipality<select value={municipality} onChange={e=>setMunicipality(e.target.value)}><option value="">All municipalities</option>{MUNICIPALITIES.filter(m=>!province||m.province===province).map(m=><option key={m.name} value={m.name}>{m.name}</option>)}</select></label>
        <label>Directory category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All services</option>{BUSINESS_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Service language<select value={serviceLanguage} onChange={e=>setServiceLanguage(e.target.value)}><option value="">Any language</option>{BUSINESS_LANGUAGES.map(l=><option key={l} value={l}>{BUSINESS_LANGUAGE_NAMES[l]}</option>)}</select></label>
      </div><button className="bc-primary" type="submit" disabled={busy}>Search directory</button><p className="bc-muted">Low-data view: text only, 20 results per page, no automatic maps, images or location tracking.</p></form>
      <div className="bc-grid">{businesses.map(b=><BusinessCard key={b.id} b={b}/>)}</div>{!businesses.length&&<p>No results loaded. Search to find reviewed listings; an empty result is not evidence that no businesses operate in the area.</p>}
      <div className="bc-actions">{page>0&&<button disabled={busy} onClick={()=>void search(page-1)}>Previous page</button>}{nextPage!==null&&<button disabled={busy} onClick={()=>void search(nextPage)}>Next page</button>}</div></>}
      {tab==='mine'&&(!token?<p><Link to="/login">Sign in to manage your business</Link></p>:<>
        <div className="bc-actions"><button className="bc-primary" disabled={busy} onClick={()=>{setEditing(null);setPreview(null);setHistory([]);}}>Add your business</button><button disabled={busy} onClick={()=>void action(reloadOwned)}>Refresh my listings</button></div>
        {editing!==undefined&&<BusinessEditor key={editing?.id??'new'} business={editing} busy={busy} language={language} onCancel={()=>setEditing(undefined)} onSave={async(id,revision,profile)=>action(async()=>{
          const r=await businessRequest('/mine/'+id,token,businessResponses.saved,{expectedRevision:revision,profile},'PUT');
          if(alive.current){setEditing(undefined);setPreview(publicBusiness(r.business));setNotice('Private draft saved. Preview the public details before sending for review.');}await reloadOwned();
        })}/>}
        {owned.map(b=><article className="bc-card" key={b.id}><h2>{b.profile.tradingName}</h2><p>Status: {b.state} · revision {b.revision}</p><Verification value={b.verification}/>
          <div className="bc-actions"><button disabled={busy} onClick={()=>{setEditing(b);setPreview(null);setHistory([]);}}>Edit and change visibility</button><button disabled={busy} onClick={()=>setPreview(publicBusiness(b))}>Preview public details</button>
          {['draft','paused','rejected'].includes(b.state)&&<button disabled={busy||!b.profile.consent.publicListing} onClick={()=>void ownerAction(b,'submit')}>{copy.submit}</button>}
          {!['paused','suspended'].includes(b.state)&&<button disabled={busy} onClick={()=>void ownerAction(b,'pause')}>Pause listing</button>}
          <button disabled={busy} onClick={()=>void action(async()=>{const r=await businessRequest('/mine/'+b.id+'/history',token,businessResponses.history);if(alive.current)setHistory(r.events);})}>View audit history</button>
          </div><details><summary>Delete this listing</summary><p>Remove its current profile, contacts, location and reports. Minimal audit events expire within 90 days.</p><button disabled={busy} onClick={()=>void ownerAction(b,'delete')}>Permanently delete this listing</button></details>
        </article>)}{!!history.length&&<section className="bc-card"><h2>Recent audit history</h2><ol>{history.map((h,i)=><li key={i}>{h.action.replaceAll('_',' ')} · revision {h.revision}</li>)}</ol></section>}
        {preview&&<section aria-label="Public details preview"><h2>These are the proposed public details</h2><PublicDetails b={preview} language={language}/></section>}
      </>)}
      {tab==='review'&&canReview&&<><p>Pending submissions, suspended cases and published listings with open reports appear here. Resolve reports after recording the required listing decision.</p>{queue.map(b=><ReviewCard key={b.id+':'+b.revision} b={b} busy={busy} onReview={async(b,body)=>action(async()=>{
        await businessRequest('/moderation/profiles/'+b.id,token,businessResponses.saved,{...(body as object),expectedRevision:b.revision,confirm:true});
        const r=await businessRequest('/moderation/queue',token,businessResponses.queue);if(alive.current){setQueue(r.businesses);setReports(r.reports);setNotice('Review decision recorded.');}
      })}/>)}{reports.map(r=><article key={r.id} className="bc-card"><h3>{r.kind.replaceAll('_',' ')} report</h3><p>{r.details}</p>{r.businessId&&<Link to={businessSharePath(r.businessId)}>Business page</Link>}<button disabled={busy} onClick={()=>void action(async()=>{
        await businessRequest('/moderation/reports/'+r.id+'/resolve',token,businessResponses.resolved,{confirm:true});if(alive.current)setReports(p=>p.filter(x=>x.id!==r.id));
      })}>Mark report resolved</button></article>)}</>}
    </>}
    {token&&((id&&id!=='privacy')||tab==='mine')&&<form className="bc-card" onSubmit={e=>{e.preventDefault();void action(async()=>{
      await businessRequest('/reports',token,businessResponses.received,{businessId:id??null,kind:id?reportKind:'duplicate_claim',details:reportText});
      if(alive.current){setReportText('');setNotice('Report received for human review. No listing was automatically verified or transferred.');}
    });}}><h2>{id?'Request a correction or report a concern':'Request duplicate or ownership review'}</h2>
      {id&&<label>Report type<select value={reportKind} onChange={e=>setReportKind(e.target.value)}>{['correction','impersonation','privacy','spam','duplicate_claim'].map(k=><option key={k}>{k}</option>)}</select></label>}
      <label>Details for the reviewer<textarea required minLength={10} maxLength={1000} value={reportText} onChange={e=>setReportText(e.target.value)}/></label><p className="bc-muted">Describe the correction without identity documents, bank details or passwords. Reports are private to reviewers.</p><button type="submit" disabled={busy}>Send for human review</button>
    </form>}
    {!token&&id&&id!=='privacy'&&<p><Link to="/login">Sign in to report a correction, privacy or ownership concern</Link></p>}
    <footer className="bc-card"><Link to="/business-connect/privacy">Privacy and retention</Link> · <Link to="/municipalities">Municipal services</Link> · <Link to="/township-economy">Business support</Link><p>Business profiles on Luqi are separate from CIPC registration and from independent Google, Apple or Bing approvals.</p></footer>
  </>}
  </main>;
}
export default function BusinessConnectPage() {
  const {session,restoring}=useCustomerSession();const {id}=useParams();
  if(restoring)return <main className="business-connect"><p role="status">Restoring your Luqi account…</p></main>;
  // Account switching unmounts all private forms, results and pending UI updates.
  return <Workspace key={session?.token??'signed-out'} token={session?.token} id={id}/>;
}
