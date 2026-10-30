import {useEffect,useRef,useState} from 'react';
import {MapPin} from 'lucide-react';
import {PROVINCES,type ProvinceCode} from '../lib/opportunity-sources';
import {suggestProvince} from '../lib/location-province';
export default function LocationProvinceButton({onSelect}:{onSelect:(province:ProvinceCode)=>void}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('Optional: use a one-time device location to suggest your province. Coordinates stay on this device; your browser or location provider may process them.');
  const [suggestion,setSuggestion]=useState<ProvinceCode|null>(null);
  const request=useRef(0),pending=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>()=>{request.current++;clearTimeout(timer.current);},[]);
  const cancel=()=>{request.current++;pending.current=false;clearTimeout(timer.current);setBusy(false);setSuggestion(null);setMessage('Location suggestion cleared. You can choose a province manually.');};
  const locate=()=>{
    if(pending.current)return;
    setSuggestion(null);
    if(!window.isSecureContext||!navigator.geolocation){setMessage('Device location is unavailable here. Open Luqi over HTTPS or choose your province manually.');return;}
    const id=++request.current; pending.current=true;setBusy(true);setMessage('Waiting for device location permission…');
    const finish=()=>{if(id!==request.current)return false;request.current++;pending.current=false;clearTimeout(timer.current);setBusy(false);return true;};
    timer.current=setTimeout(()=>{if(finish())setMessage('Location request timed out. Choose your province manually or try again.');},12_000);
    try{navigator.geolocation.getCurrentPosition(position=>{
      if(!finish())return;
      if(document.visibilityState!=='visible'){setMessage('Location result ignored while Luqi was hidden. Choose manually or try again.');return;}
      const province=suggestProvince(position.coords.latitude,position.coords.longitude,position.coords.accuracy);
      setSuggestion(province);
      setMessage(province?'Suggested '+PROVINCES.find(p=>p.id===province)!.name+'. Confirm below or choose another province.':'Could not confidently identify a South African province. You may be near a boundary, outside coverage or have low accuracy. Choose manually.');
    },error=>{if(finish())setMessage(error.code===1?'Location permission was denied. You can choose a province manually; change site permission in your browser to try again.':error.code===3?'Location request timed out. Choose your province manually or try again.':'Device location is unavailable. Choose your province manually or try again.');},
    {enableHighAccuracy:false,maximumAge:0,timeout:10_000});}
    catch{if(finish())setMessage('Device location is unavailable. Choose your province manually.');}
  };
  return <section aria-label="Optional device location" className="my-4 rounded-xl border border-slate-600 bg-slate-950 p-4 text-sm text-slate-200">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-400 px-4 py-2 text-cyan-100 disabled:opacity-60" disabled={busy} onClick={locate}><MapPin size={17} aria-hidden="true"/>{busy?'Finding your province…':'Use my location'}</button>
      {(busy||suggestion)&&<button type="button" className="min-h-11 underline" onClick={cancel}>{busy?'Cancel location request':'Clear location suggestion'}</button>}
      {suggestion&&<button type="button" className="min-h-11 rounded-lg bg-cyan-800 px-4 py-2 text-white" onClick={()=>{onSelect(suggestion);setSuggestion(null);setMessage('Province selected. No coordinates were saved. Change it using the map at any time.');}}>Use {PROVINCES.find(p=>p.id===suggestion)!.name}</button>}
    </div>
    <p aria-live="polite" aria-atomic="true" className="mt-2">{message}</p>
    <p className="mt-2 text-xs text-slate-400">No background tracking, location history or sharing with contacts. This suggests a province; it does not locate jobs or provide navigation.</p>
  </section>;
}
