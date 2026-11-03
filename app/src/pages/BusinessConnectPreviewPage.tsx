import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router';
import {useOptionalCustomerSession} from '../providers/customer-session';
import {acceptPreviewStorage,loadBusinessPreview,previewDocument,PREVIEW_STORAGE_PREFIX} from '../lib/business-preview';
export default function BusinessConnectPreviewPage(){
 const account=useOptionalCustomerSession();const token=account?.session?.token;
 return <PreviewInstance key={token??'guest'} token={token}/>;
}
function PreviewInstance({token}:{token?:string}){
 const [html,setHtml]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(!!token);
 const frame=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{
  if(!token)return;let active=true;let storageKey='';let nonce='';
  const onMessage=(event:MessageEvent)=>{
   // Opaque-origin sandbox: require both this precise frame and a per-mount nonce.
   if(!active||!storageKey||event.source!==frame.current?.contentWindow||event.origin!=='null')return;
   const action=acceptPreviewStorage(event.data,nonce);if(!action)return;
   try{if(action.operation==='remove')localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,action.value);}
   catch{frame.current?.contentWindow?.postMessage({type:'luqi.business-preview.storage-error',nonce},'*');}
  };
  window.addEventListener('message',onMessage);
  void loadBusinessPreview(token).then(payload=>{
   if(!active)return;storageKey=PREVIEW_STORAGE_PREFIX+payload.scope;nonce=crypto.randomUUID();
   let value:string|null=null,available=true;
   try{value=localStorage.getItem(storageKey);const test=storageKey+':probe';localStorage.setItem(test,'1');localStorage.removeItem(test);}catch{available=false;}
   setHtml(previewDocument(payload.html,nonce,value,available));setLoading(false);
  }).catch(e=>{if(active){setError(e instanceof Error?e.message:'The private preview could not be opened.');setLoading(false);}});
  return()=>{active=false;window.removeEventListener('message',onMessage);};
 },[token]);
 return <main className="mx-auto w-full min-w-0 max-w-[1600px] px-2 py-5 text-slate-100 sm:px-5" aria-labelledby="business-preview-title">
  <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 id="business-preview-title" className="text-xl font-semibold">Business Connect · private owner preview</h1><p className="mt-1 max-w-4xl text-xs text-slate-300">Uses your Luqi login. Sample listings, courier checks, delivery actions and ratings are demonstrations. Drafts stay on this device; nothing here publishes a real business or contacts a courier.</p></div><nav className="flex flex-wrap gap-4 text-sm text-cyan-200"><Link to="/business-connect">Manage real business profiles</Link><Link to="/businesses">Published directory</Link></nav></header>
  {!token?<section className="rounded-xl border border-slate-600 bg-slate-900 p-6"><p>Sign in with your existing Luqi owner account to open the private preview.</p><Link className="mt-4 inline-block rounded-lg border border-cyan-500 px-4 py-3 text-cyan-200" to="/login">Use my Luqi login</Link></section>:<>
   {loading&&<p role="status">Opening your private Business Connect preview…</p>}
   {error&&<p role="alert" className="rounded-lg border border-amber-600 bg-slate-900 p-4">{error}</p>}
   {html&&<iframe ref={frame} title="Private Luqi Business Connect interactive preview" srcDoc={html} sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox" allow="geolocation 'none'; camera 'none'; microphone 'none'; payment 'none'" className="h-[max(760px,85dvh)] w-full rounded-xl border border-slate-600 bg-[#faf9f5]"/>}
  </>}
 </main>;
}
