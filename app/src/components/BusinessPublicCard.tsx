import {Link} from 'react-router';
import type {PublicBusiness} from '../../contracts/business-connect';
export default function BusinessPublicCard({business:b,detail=false,preview=false}:{business:PublicBusiness;detail?:boolean;preview?:boolean}){
 const address=b.kind==='public_storefront'?b.publicAddress:undefined;
 const directions=address?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address+', '+b.locality+', South Africa'):null;
 return <article className="min-w-0 space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-5">
  <h2 className="text-xl font-semibold">{detail?b.name:<Link className="text-cyan-200 underline" to={'/businesses/'+b.id}>{b.name}</Link>}</h2>
  <p className="text-sm text-cyan-100">{b.locality} · {b.province} · {b.kind==='public_storefront'?'Public storefront':b.kind==='mobile'?'Mobile trader':'Service-area business'}</p>
  <p className="whitespace-pre-wrap break-words text-sm">{b.description}</p>
  <p className="text-sm">Services: {b.services.join(' · ')}</p>
  <p className="text-sm">Service area: {b.serviceArea}</p>
  {b.hours&&<p className="text-sm">Advertised hours: {b.hours}. Confirm availability directly.</p>}
  {b.pricing&&<p className="whitespace-pre-wrap text-sm">Indicative pricing: {b.pricing}. Request a current quote.</p>}
  <p className="text-sm">Languages offered by the business: {b.languages.join(', ')}</p>
  <div className="flex flex-wrap gap-4 text-sm">
   {b.phone&&<a className="min-h-11 py-2 text-cyan-200 underline" href={'tel:'+b.phone.replace(/[ ()-]/g,'')}>Call {b.phone}</a>}
   {b.email&&<a className="min-h-11 break-all py-2 text-cyan-200 underline" href={'mailto:'+encodeURIComponent(b.email)}>Email business</a>}
   {b.website&&<a className="min-h-11 py-2 text-cyan-200 underline" href={b.website} target="_blank" rel="noopener noreferrer">Business website (external)</a>}
  </div>
  {address&&<p className="text-sm">Owner-approved public trading address: {address}</p>}
  {directions&&<><p className="text-xs text-slate-400">Opening the map sends this public business address to Google. No customer starting point is included. The business address is owner-provided and not independently location-verified.</p><a className="inline-block min-h-11 py-2 text-cyan-200 underline" href={directions} target="_blank" rel="noopener noreferrer">Open public trading address in Google Maps</a></>}
  <p className="text-xs text-slate-400">{preview?'Proposed public fields — not published or approved.':'Publication reviewed '+new Date(b.reviewedAt).toLocaleDateString('en-ZA')+'.'} Contact and location are owner-provided, not independently verified. Luqi has not submitted this profile to external maps. This is not proof of CIPC registration, a trading licence, quality or endorsement.</p>
 </article>;
}
