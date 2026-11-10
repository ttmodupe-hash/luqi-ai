import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export const BUSINESS_PREVIEW_VERSION='luqi-business-connect-private-v2-app1';
export const PREVIEW_NONCE_MARKER='__LUQI_PREVIEW_NONCE__';
export const PREVIEW_STATE_MARKER='__LUQI_PREVIEW_BRIDGE_STATE__';
let template:Promise<string>|undefined;
const bridge=`
const __previewBoot = ${PREVIEW_STATE_MARKER};
let __previewStored = __previewBoot.value;
const __previewNonce = __previewBoot.nonce;
const localStorage = {
 getItem(key){ return key === 'luqi-business-connect-v1' ? __previewStored : null; },
 setItem(key,value){
  if(key!=='luqi-business-connect-v1'||!__previewBoot.available||new TextEncoder().encode(value).length>256000)throw Error('storage unavailable');
  __previewStored=String(value);parent.postMessage({type:'luqi.business-preview.storage',nonce:__previewNonce,operation:'set',value:__previewStored},'*');
 },
 removeItem(key){if(key==='luqi-business-connect-v1'){__previewStored=null;parent.postMessage({type:'luqi.business-preview.storage',nonce:__previewNonce,operation:'remove'},'*');}}
};
window.addEventListener('message',event=>{
 if(event.source!==parent||event.data?.nonce!==__previewNonce||event.data.type!=='luqi.business-preview.storage-error')return;
 __previewBoot.available=false;
 if(typeof storageReady!=='undefined')storageReady=false;
 if(typeof toast==='function'&&typeof t==='function')toast(t('storageUnavailable'));
});
document.addEventListener('click',event=>{
 const link=event.target.closest?.('a[href^="#"]');if(!link)return;
 event.preventDefault();const id=link.getAttribute('href').slice(1);
 if(!id)window.scrollTo({top:0});else document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
});
`;
export async function businessPreviewTemplate():Promise<string>{
 if(!template)template=(async()=>{
  const root=join(process.cwd(),'private','business-connect');
  const names=['index.html','styles.css','translations.js','service-translations.js','domain.js','app.js','services.js'];
  const parts=await Promise.all(names.map(n=>readFile(join(root,n),'utf8')));
  if(parts.some(p=>Buffer.byteLength(p)>150000)||parts.reduce((n,p)=>n+Buffer.byteLength(p),0)>240000)throw Error('PREVIEW_ASSET_LIMIT');
  let html=parts[0].replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${parts[1]}</style>`);
  const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${PREVIEW_NONCE_MARKER}'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">`;
  html=html.replace('<meta charset="utf-8">',()=>`<meta charset="utf-8">${csp}`);
  const script=(s:string)=>`<script nonce="${PREVIEW_NONCE_MARKER}">${s.replace(/<\/script/gi,'<\\/script')}</script>`;
  html=html.replace('<script src="translations.js"></script>',()=>script(bridge)+script(parts[2]));
  names.slice(3).forEach((n,i)=>{html=html.replace(`<script src="${n}"></script>`,()=>script(parts[i+3]));});
  if(/<script[^>]+src=|<link[^>]+stylesheet/.test(html))throw Error('PREVIEW_UNBUNDLED_ASSET');
  return html;
 })().catch(e=>{template=undefined;throw e;});
 return template;
}
