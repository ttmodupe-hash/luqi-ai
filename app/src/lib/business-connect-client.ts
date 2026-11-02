import {z} from 'zod';
import {requestConversationJson} from './conversation-request';
import {businessOwned,businessPublic,businessReason,businessReviewItem,BUSINESS_CONSENT_VERSION,type BusinessDraft} from '../../contracts/business-connect';
export class BusinessClientError extends Error{constructor(message:string,readonly status?:number){super(message);}}
export const businessStatus=z.object({availability:z.enum(['ready','setup_required']),ownerLimit:z.literal(10)}).strict();
const mine=z.object({profiles:z.array(businessOwned).max(10),reviewer:z.boolean(),reviewAvailable:z.boolean()}).strict();
export function businessClient(token?:string,request:typeof fetch=fetch){
 async function call<T>(path:string,schema:z.ZodType<T>,body?:unknown,method='POST'):Promise<T>{
  let response;
  try{response=await requestConversationJson(request,'/api/v1/business-connect'+path,{method:body===undefined?'GET':method,credentials:'omit',redirect:'error',cache:'no-store',headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw new BusinessClientError('The result could not be confirmed. Refresh saved profiles before trying again; writes are never retried automatically.');}
  if(!response.ok)throw new BusinessClientError(response.status===401?'Sign in again to manage your business.':response.status===403?'This account cannot perform that action.':response.status===409?'This profile changed or may duplicate another listing. Refresh saved profiles and check the latest version.':response.status===429?'The daily profile-change limit was reached. Try again tomorrow.':response.status===404?'That business is not publicly available or is no longer accessible.':response.status===400?'Check required fields, contact visibility and publication consent.':'Business Connect is unavailable for this action. Refresh saved profiles before retrying; writes are never retried automatically.',response.status);
  const parsed=schema.safeParse(response.body);if(!parsed.success)throw new BusinessClientError('The server response could not be verified. Refresh before trying again.');return parsed.data;
 }
 return{
  status:()=>call('/status',businessStatus),mine:()=>call('/mine',mine),
  save:(id:string,expectedRevision:number,draft:BusinessDraft)=>call('/mine/'+encodeURIComponent(id),z.object({profile:businessOwned}).strict(),{expectedRevision,draft},'PUT'),
  submit:(id:string,expectedRevision:number)=>call('/mine/'+encodeURIComponent(id)+'/submit',z.object({profile:businessOwned}).strict(),{expectedRevision,consentVersion:BUSINESS_CONSENT_VERSION,ownerAuthorised:true,publicationConsent:true}),
  pause:(id:string,expectedRevision:number)=>call('/mine/'+encodeURIComponent(id)+'/pause',z.object({profile:businessOwned}).strict(),{expectedRevision}),
  remove:(id:string,expectedRevision:number)=>call('/mine/'+encodeURIComponent(id)+'/delete',z.object({removed:z.literal(true),id:z.literal(id)}).strict(),{expectedRevision,confirmDelete:true}),
  history:(id:string)=>call('/mine/'+encodeURIComponent(id)+'/history',z.object({events:z.array(z.object({action:z.string().max(32),reason:businessReason,at:z.string()})).max(100)})),
  list:(filter:Record<string,string>={})=>call('/public'+(Object.keys(filter).length?'?'+new URLSearchParams(filter):''),z.object({businesses:z.array(businessPublic).max(20),next:z.string().uuid().nullable()}).strict()),
  public:(id:string)=>call('/public/'+encodeURIComponent(id),z.object({business:businessPublic}).strict()),
  report:(id:string,reason:string,note:string)=>call('/public/'+encodeURIComponent(id)+'/report',z.object({received:z.literal(true)}).strict(),{reason,note}),
  review:()=>call('/review',z.object({items:z.array(businessReviewItem.extend({reports:z.array(z.object({reason:z.string().max(32),note:z.string().max(300)})).max(20)})).max(20)})),
  decide:(id:string,expectedRevision:number,action:'approve'|'reject'|'pause',reason:string,duplicatesChecked:boolean)=>call('/review/'+encodeURIComponent(id),z.object({reviewed:z.literal(true),id:z.literal(id),revision:z.literal(expectedRevision+1)}).strict(),{expectedRevision,action,reviewedAuthority:true,reason,duplicatesChecked}),
 };
}
export function blankBusinessDraft():BusinessDraft{return{name:'',category:'other',description:'',services:[],province:'GP',locality:'',kind:'service_area',serviceArea:'',publicAddress:'',phone:'',email:'',website:'',hours:'',pricing:'',languages:['English'],visibility:{phone:false,email:false,website:false,address:false,pricing:false}};}
