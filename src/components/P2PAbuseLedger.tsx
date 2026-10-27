import {useState} from 'react';
import {CustomerSessionProvider,useCustomerSession} from '../providers/customer-session';
import AccountAccessForm from './AccountAccessForm';
import {p2pClient} from '../lib/p2p-client';
export default function P2PAbuseLedger(){return <CustomerSessionProvider><Ledger/></CustomerSessionProvider>}
function Ledger(){const {session,acceptSession,signOut}=useCustomerSession();
  if(!session)return <section className="mt-6 rounded-xl border border-slate-600 p-5"><h2 className="text-xl font-semibold">Private P2P moderation ledger</h2><p>A stored server-side P2P moderator role is required. Signing in does not grant that role.</p><AccountAccessForm purpose="account" onAuthenticated={acceptSession}/></section>;
  return <Reports key={session.user.email} token={session.token} signOut={signOut}/>;
}
function Reports({token,signOut}:{token:string;signOut:()=>void}){
  const [reports,setReports]=useState<Awaited<ReturnType<ReturnType<typeof p2pClient>['reports']>>['reports']>([]);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  return <section className="mt-6 space-y-4 rounded-xl border border-slate-600 p-5" aria-label="Private P2P moderation ledger">
    <h2 className="text-xl font-semibold">Private P2P moderation ledger</h2><p>Only explicitly reported excerpts are available here. A report is an allegation, not a verified finding. Audit seals detect changes within the recorded window; this is not an immutable external ledger.</p>
    <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded border p-3" onClick={()=>{setBusy(true);setReports([]);setNotice('');
      void p2pClient(token).reports().then(value=>setReports(value.reports)).catch(()=>setNotice('Reports are unavailable or this account is not an authorised P2P moderator.')).finally(()=>setBusy(false));}}>Load authorised reports</button>
      <button className="rounded border p-3" onClick={()=>{setReports([]);signOut();}}>Sign out of moderation</button></div>
    {notice&&<p role="status">{notice}</p>}
    {reports.map(r=><article className="space-y-2 rounded border border-slate-600 p-4" key={r.reportId}><h3>{r.reason}</h3>
      <p>Reporter account {r.reporterId} · Reported account {r.offenderId} · {new Date(r.timestamp).toLocaleString()}</p>
      <blockquote className="whitespace-pre-wrap break-words">{r.evidence}</blockquote>
      <p className="break-all text-xs">Report {r.reportId} · Seal {r.sha256AuditSeal} · Previous {r.previousSeal}</p></article>)}
  </section>;
}
