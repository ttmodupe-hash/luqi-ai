/** Shared truthful operation states: an attempt is never proof of success. */
export type OperationStatus = "idle"|"pending"|"confirmed"|"failed"|"unknown";
export interface OperationEvidence { operationId:string; status:OperationStatus; verifiedAt?:string; source?:string; errorCode?:string; }
export function confirmed(e:OperationEvidence):boolean {
 return e.status==="confirmed" && Boolean(e.source?.trim()) && Boolean(e.verifiedAt && Number.isFinite(Date.parse(e.verifiedAt)));
}
export function userFacingStatus(e:OperationEvidence):string {
 if(confirmed(e)) return "Confirmed";
 switch(e.status){
  case "idle":return "Not started";
  case "pending":return "In progress — not yet confirmed";
  case "failed":return "Failed";
  case "unknown":return "Status unknown — verification required";
  case "confirmed":return "Confirmation unverified";
 }
}
export interface HealthSample { timestamp:string; success:boolean; latencyMs:number; }
export function availability(samples:HealthSample[]):number|null {
 if(!samples.length) return null;
 if(samples.some(s=>!Number.isFinite(Date.parse(s.timestamp))||!Number.isFinite(s.latencyMs)||s.latencyMs<0)) return null;
 return samples.filter(s=>s.success).length/samples.length;
}
export function latencyPercentile(samples:HealthSample[],percentile:number):number|null {
 if(!samples.length||!Number.isFinite(percentile)||percentile<0||percentile>100) return null;
 const latencies=samples.map(s=>s.latencyMs);
 if(latencies.some(n=>!Number.isFinite(n)||n<0))return null;
 latencies.sort((a,b)=>a-b);
 return latencies[Math.ceil(percentile/100*latencies.length)-1<0?0:Math.ceil(percentile/100*latencies.length)-1];
}
