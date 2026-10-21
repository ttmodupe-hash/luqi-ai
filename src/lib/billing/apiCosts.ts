/** Planning-only provider catalogue. Prices are intentionally NOT invented.
 * Vendor invoices and metered usage must be reconciled server-side before being called actuals.
 */
export type ApiCategory="AI"|"Voice"|"Video"|"Infrastructure"|"Communications"|"Payments"|"Storage";
export interface ApiService {id:string;name:string;category:ApiCategory;purpose:string;billingModel:string;officialUrl:string;required:boolean;}
export const API_SERVICES:ApiService[]=[
{id:"openai",name:"OpenAI API",category:"AI",purpose:"AI companion, tutoring and evaluations",billingModel:"Usage-based tokens / tools",officialUrl:"https://openai.com/api/pricing/",required:true},
{id:"google-ai",name:"Google Gemini API",category:"AI",purpose:"Optional model routing and multimodal workloads",billingModel:"Usage-based; tier-dependent",officialUrl:"https://ai.google.dev/gemini-api/docs/pricing",required:false},
{id:"anthropic",name:"Anthropic API",category:"AI",purpose:"Optional model redundancy",billingModel:"Usage-based tokens",officialUrl:"https://www.anthropic.com/pricing",required:false},
{id:"gcp",name:"Google Cloud Run",category:"Infrastructure",purpose:"Application hosting",billingModel:"CPU, memory and requests",officialUrl:"https://cloud.google.com/run/pricing",required:true},
{id:"db",name:"Managed database",category:"Infrastructure",purpose:"Persistent users, messages and progress",billingModel:"Compute, storage, backups",officialUrl:"https://cloud.google.com/sql/pricing",required:true},
{id:"storage",name:"Object storage",category:"Storage",purpose:"Private attachments and media",billingModel:"Storage, operations and egress",officialUrl:"https://cloud.google.com/storage/pricing",required:true},
{id:"turn",name:"WebRTC TURN / media relay",category:"Communications",purpose:"Reliable voice/video calls",billingModel:"Relay traffic / sessions",officialUrl:"https://webrtc.org/getting-started/turn-server",required:false},
{id:"elevenlabs",name:"ElevenLabs",category:"Voice",purpose:"Optional premium voices",billingModel:"Subscription / usage",officialUrl:"https://elevenlabs.io/pricing",required:false},
{id:"video",name:"Video rendering provider",category:"Video",purpose:"LUQIToons rendering and compute",billingModel:"GPU/render minutes",officialUrl:"https://cloud.google.com/compute/gpus-pricing",required:false},
{id:"payments",name:"Payment processor",category:"Payments",purpose:"Collect LUQI customer payments (not third-party vendor invoices)",billingModel:"Transaction fees",officialUrl:"https://stripe.com/pricing",required:false},
];
export interface CostEntry {serviceId:string;estimatedMonthlyZar:number|null;actualMonthlyZar:number|null;actualSource?:string;actualVerifiedAt?:string;}
export function validCost(value:number|null):boolean{return value===null||(Number.isFinite(value)&&value>=0);}
export function costTotals(entries:CostEntry[]):{estimatedZar:number;actualVerifiedZar:number;unverifiedActuals:number;unpriced:number}{
 let estimatedZar=0,actualVerifiedZar=0,unverifiedActuals=0,unpriced=0;
 for(const e of entries){
  if(!validCost(e.estimatedMonthlyZar)||!validCost(e.actualMonthlyZar))throw new Error("Invalid cost input");
  if(e.estimatedMonthlyZar===null)unpriced++;else estimatedZar+=e.estimatedMonthlyZar;
  if(e.actualMonthlyZar!==null){
   if(e.actualSource?.trim()&&e.actualVerifiedAt&&Number.isFinite(Date.parse(e.actualVerifiedAt)))actualVerifiedZar+=e.actualMonthlyZar;
   else unverifiedActuals++;
  }
 }
 return {estimatedZar,actualVerifiedZar,unverifiedActuals,unpriced};
}
export function budgetStatus(estimate:number,limit:number):"within"|"over"|"invalid" {
 if(!Number.isFinite(estimate)||!Number.isFinite(limit)||estimate<0||limit<=0)return "invalid";
 return estimate>limit?"over":"within";
}
