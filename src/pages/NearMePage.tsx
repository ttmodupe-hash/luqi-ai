import {useState} from 'react';
import {Link,useSearchParams} from 'react-router';
import {ArrowUpRight,Compass,MapPin,ShieldCheck} from 'lucide-react';
import LocationProvinceButton from '../components/LocationProvinceButton';
import {PROVINCES,type ProvinceCode} from '../lib/opportunity-sources';
import {filterMunicipalities,MUNICIPAL_DIRECTORY_URL,MUNICIPAL_REVIEWED_ON,isMunicipalReviewFresh} from '../lib/municipal-economy';
import {mapDiscoveryLink,NEARBY_CATEGORIES,parseProvince,provincePath,type MapProvider,type NearbyCategory} from '../lib/nearby-discovery';
const field='mt-2 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
export default function NearMePage(){
 const [params]=useSearchParams();
 const [province,setProvince]=useState<ProvinceCode|null>(()=>parseProvince(params.get('province')));
 const [locality,setLocality]=useState('');const [category,setCategory]=useState<NearbyCategory>('business');
 const [provider,setProvider]=useState<MapProvider>('google');const [councilQuery,setCouncilQuery]=useState('');
 const [limit,setLimit]=useState(8);
 const name=PROVINCES.find(p=>p.id===province)?.name;
 const councils=province?filterMunicipalities(province,councilQuery,270):[];
 const mapLink=mapDiscoveryLink(provider,category,locality,province);
 const choose=(value:ProvinceCode|null)=>{setProvince(value);setCouncilQuery('');setLimit(8);};
 return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="nearby-heading">
  <header className="space-y-3 rounded-2xl border border-cyan-800 bg-slate-900 p-5 sm:p-8">
   <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-300"><Compass size={18} aria-hidden="true"/> Explore your corner of South Africa</p>
   <h1 id="nearby-heading" className="text-3xl font-bold sm:text-4xl">Near me — find your next stop</h1>
   <p>Find useful public-service information, opportunities and places to explore. Start with a province, then choose the town, township or village you want to search.</p>
   <p className="text-sm text-slate-300">No account needed. Province discovery stays on your device. Luqi does not infer your municipality, track your movements or show your location to contacts.</p>
  </header>
  <section aria-label="Choose discovery area" className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">Where shall we explore?</h2>
   <label className="block max-w-lg text-sm">Province<select className={field} aria-label="Discovery province" value={province??''} onChange={e=>choose(parseProvince(e.target.value))}>
    <option value="">Choose a province</option>{PROVINCES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
   </select></label>
   <LocationProvinceButton onSelect={choose}/>
   <p role="status" aria-label="Discovery area" className="text-sm text-cyan-200">{name?'Exploring '+name+'. This is a province filter, not a precise location.':'Choose manually or request an optional one-time location suggestion.'}</p>
   {province&&<button type="button" className="min-h-11 underline" onClick={()=>{choose(null);setLocality('');}}>Clear discovery area</button>}
  </section>
  <section aria-label="Local Luqi guides" className="grid gap-3 sm:grid-cols-3">
   {[{path:'/opportunities' as const,title:'Jobs & opportunities',text:'Reviewed adverts filtered by published province. Confirm the actual workplace with the publisher.'},
    {path:'/municipalities' as const,title:'Municipal services',text:'Council contacts and practical steps for water, billing, permits and public participation.'},
    {path:'/local-pulse' as const,title:'Local news & radio',text:'Original newsroom and broadcaster links. Some provinces currently have national coverage only.'}].map(card=><Link key={card.path} to={provincePath(card.path,province)} className="min-w-0 space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-5 hover:border-cyan-400">
    <h2 className="text-lg font-semibold">{card.title}</h2><p className="text-sm text-slate-300">{card.text}</p><span className="inline-flex items-center gap-1 text-sm text-cyan-200">{name?'Explore '+name:'Open guide'}<ArrowUpRight size={16} aria-hidden="true"/></span>
   </Link>)}
  </section>
  <section aria-label="Councils in your selected province" className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">Public support, closer to home</h2>
   <p className="text-sm text-slate-300">Search reviewed council names in your province. This does not identify the council responsible for a particular address or the nearest office.</p>
   {province?<><label className="block max-w-lg text-sm">Find a council<input className={field} value={councilQuery} onChange={e=>{setCouncilQuery(e.target.value);setLimit(8);}} maxLength={80} placeholder="Tshwane, Madibeng, Polokwane…" autoComplete="off"/></label>
    <p aria-live="polite" className="text-sm">{councils.length} council names in this view.</p>
    <div className="grid gap-3 sm:grid-cols-2">{councils.slice(0,limit).map(c=><article key={c.name} className="min-w-0 space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-4"><h3 className="font-semibold">{c.name}</h3><p className="text-xs text-slate-300">{c.type} municipality · {name}</p><a href={MUNICIPAL_DIRECTORY_URL} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-sm text-cyan-200 underline">Verify contact in government directory</a></article>)}</div>
    {!councils.length&&<p>No matching council name. Try another spelling or open the official directory.</p>}
    {councils.length>limit&&<button type="button" className="min-h-11 rounded-lg border border-cyan-400 px-4 py-2" onClick={()=>setLimit(n=>Math.min(n+16,270))}>Show more council names</button>}
   </>:<p className="text-sm text-slate-300">Select a province to see council names.</p>}
   <a href={MUNICIPAL_DIRECTORY_URL} target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 py-2 text-sm text-cyan-200 underline">Open official municipality directory</a>
   <p className="text-xs text-slate-400">Names reviewed {MUNICIPAL_REVIEWED_ON}. {isMunicipalReviewFresh(new Date())?'Check current contacts and responsibilities with the council.':'This collection is due for review; confirm details directly.'}</p>
  </section>
  <section aria-label="Search places with your chosen map" className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
   <h2 className="inline-flex items-center gap-2 text-xl font-semibold"><MapPin size={21} aria-hidden="true"/> Find places and get directions</h2>
   <p className="text-sm text-slate-300">Search a town, township or village on your preferred map. The provider supplies its own results and directions; Luqi has not verified individual businesses, routes, opening hours or availability.</p>
   <div className="grid gap-3 sm:grid-cols-3">
    <label className="text-sm">Town, township or village<input className={field} aria-label="Map search locality" autoComplete="off" maxLength={80} value={locality} onChange={e=>setLocality(e.target.value)} placeholder="Mabopane, Mthatha, Sandton…"/></label>
    <label className="text-sm">What are you looking for?<select className={field} aria-label="Nearby place category" disabled={provider==='osm'} value={category} onChange={e=>setCategory(e.target.value as NearbyCategory)}>{NEARBY_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label className="text-sm">Choose your map<select className={field} aria-label="Map provider" value={provider} onChange={e=>setProvider(e.target.value as MapProvider)}><option value="google">Google Maps</option><option value="apple">Apple Maps</option><option value="osm">OpenStreetMap</option></select></label>
   </div>
   <p className="text-xs text-slate-300">Opening a map sends your typed area and selected province to that provider; Google and Apple also receive your chosen category. OpenStreetMap opens the area for you to explore. Luqi adds no device GPS coordinates, account details or precise starting point. Avoid typing private home addresses. The provider may request location under its own settings.</p>
   {mapLink?<a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-400 px-4 py-2 font-semibold text-cyan-100" href={mapLink} target="_blank" rel="noopener noreferrer">Open search in {provider==='google'?'Google Maps':provider==='apple'?'Apple Maps':'OpenStreetMap'}<ArrowUpRight size={17} aria-hidden="true"/></a>:<p className="text-sm text-amber-200">Enter a town, township or village to prepare a map search.</p>}
  </section>
  <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-5" aria-label="Business owners and visitors">
   <h2 className="inline-flex items-center gap-2 text-xl font-semibold"><ShieldCheck size={20} aria-hidden="true"/> Build local confidence</h2>
   <p className="text-sm text-slate-300">Business owners can prepare private Luqi profiles and request publication review. Published contacts and trading addresses require owner consent. Home-based and mobile businesses use service areas. Publication review is not independent location verification; external map results are separate.</p>
   <div className="flex flex-wrap gap-4"><Link className="min-h-11 py-2 text-cyan-200 underline" to={'/businesses'+(province?'?province='+province:'')}>Browse Luqi business profiles</Link><Link className="min-h-11 py-2 text-cyan-200 underline" to="/business-connect">Create my business profile</Link><Link className="min-h-11 py-2 text-cyan-200 underline" to="/township-economy">Small-business support</Link><Link className="min-h-11 py-2 text-cyan-200 underline" to="/visa-entry">Visitor entry guidance</Link><Link className="min-h-11 py-2 text-cyan-200 underline" to="/consumer-rights">Consumer support</Link></div>
  </section>
 </main>;
}
