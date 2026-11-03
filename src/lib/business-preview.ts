import {z} from 'zod';
import {requestConversationJson} from './conversation-request';
export const MAX_PREVIEW_STATE_BYTES=256000;
export const PREVIEW_STORAGE_PREFIX='luqi:private-business-preview:v2:';
export const previewPayload=z.object({html:z.string().min(1000).max(350000),scope:z.string().regex(/^[a-f0-9]{64}$/),version:z.literal('luqi-business-connect-private-v2-app1')}).strict();
export type PreviewPayload=z.infer<typeof previewPayload>;
export async function loadBusinessPreview(token:string,request:typeof fetch=fetch):Promise<PreviewPayload>{
 const response=await requestConversationJson(request,'/api/v1/business-connect-preview',{method:'GET',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
 if(!response.ok)throw Error(response.status===403?'This private Business Connect preview is available only to the configured Luqi owner.':response.status===401?'Sign in to Luqi to open this private preview.':'The private preview is unavailable. Your existing business profiles are unchanged.');
 const parsed=previewPayload.safeParse(response.body);if(!parsed.success)throw Error('The private preview response could not be verified.');return parsed.data;
}
export function validPreviewState(value:unknown):value is string{
 if(typeof value!=='string'||new TextEncoder().encode(value).length>MAX_PREVIEW_STATE_BYTES)return false;
 try{const v=JSON.parse(value);return !!v&&typeof v==='object'&&!Array.isArray(v)&&['profiles','saved','drafts'].every(k=>Array.isArray(v[k]));}catch{return false;}
}
export function previewDocument(html:string,nonce:string,value:string|null,available:boolean){
 if(!/^[a-zA-Z0-9-]{20,80}$/.test(nonce))throw Error('Invalid frame nonce');
 const initial=JSON.stringify({nonce,value:value&&validPreviewState(value)?value:null,available}).replace(/</g,'\\u003c');
 return html.replaceAll('__LUQI_PREVIEW_NONCE__',nonce).replace('__LUQI_PREVIEW_BRIDGE_STATE__',()=>initial);
}
export function acceptPreviewStorage(data:unknown,nonce:string):{operation:'remove'}|{operation:'set';value:string}|null{
 if(!data||typeof data!=='object')return null;
 const d=data as Record<string,unknown>;
 if(d.type!=='luqi.business-preview.storage'||d.nonce!==nonce)return null;
 if(d.operation==='remove'&&Object.keys(d).length===3)return {operation:'remove'};
 if(d.operation==='set'&&Object.keys(d).length===4&&validPreviewState(d.value))return {operation:'set',value:d.value};
 return null;
}
