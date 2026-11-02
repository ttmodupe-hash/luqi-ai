import { useEffect, useState } from 'react';
type Connection='checking'|'online'|'offline';
/** Real HTTP health probe, not model availability, message delivery or peer presence. */
export default function ConnectionStatusBadge(){
 const [connection,setConnection]=useState<Connection>('checking');
 useEffect(()=>{
   let disposed=false;let pending:AbortController|null=null;
   async function refresh(){
     if(!navigator.onLine){setConnection('offline');return;}
     pending?.abort();const controller=new AbortController();pending=controller;
     const timer=setTimeout(()=>controller.abort(),4500);
     try{
       const res=await fetch('/v1/health',{method:'GET',cache:'no-store',
         credentials:'omit',redirect:'error',signal:controller.signal});
       if(!disposed&&pending===controller)setConnection(res.ok?'online':'offline');
     }catch{if(!disposed&&pending===controller)setConnection('offline')}
     finally{clearTimeout(timer);if(pending===controller)pending=null;}
   }
   const offline=()=>{pending?.abort();setConnection('offline')};
   const online=()=>{void refresh()};
   const visible=()=>{if(!document.hidden)void refresh()};
   void refresh();
   const poll=setInterval(()=>{if(!document.hidden)void refresh()},45_000);
   window.addEventListener('online',online);window.addEventListener('offline',offline);
   document.addEventListener('visibilitychange',visible);
   return()=>{disposed=true;pending?.abort();clearInterval(poll);
     window.removeEventListener('online',online);window.removeEventListener('offline',offline);
     document.removeEventListener('visibilitychange',visible)};
 },[]);
 const color=connection==='online'?'bg-emerald-400':connection==='offline'?'bg-red-500':'bg-slate-400';
 return <p role="status" aria-label="Luqi connection status" className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100">
  <span aria-hidden="true" className={'inline-block h-3 w-3 rounded-full '+color}/>
  <strong>Luqi connection: {connection==='checking'?'Checking':connection==='online'?'Online':'Offline'}</strong>
  <span className="text-slate-300">Website connection only · not peer presence or a successful AI answer</span>
 </p>;
}
