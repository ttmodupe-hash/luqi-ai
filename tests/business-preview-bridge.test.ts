import {it,expect} from 'vitest';
import {acceptPreviewStorage,previewDocument,validPreviewState} from '../src/lib/business-preview';
import {businessPreviewTemplate} from '../api/services/businessConnectPreview';
const nonce='synthetic-frame-nonce-12345678';
const state=JSON.stringify({profiles:[],saved:[],drafts:[],schemaVersion:2});
it('rejects stale-frame nonces, unbounded input and unexpected message fields',()=>{
 const message={type:'luqi.business-preview.storage',nonce,operation:'set',value:state};
 expect(acceptPreviewStorage(message,nonce)).toEqual({operation:'set',value:state});
 expect(acceptPreviewStorage(message,'different-frame')).toBeNull();
 expect(acceptPreviewStorage({...message,token:'anything'},nonce)).toBeNull();
 expect(acceptPreviewStorage({...message,value:'x'.repeat(256001)},nonce)).toBeNull();
 expect(acceptPreviewStorage({...message,value:'{}'},nonce)).toBeNull();
});
it('never injects closing script markup from saved draft data',()=>{
 const raw=JSON.stringify({profiles:[{name:'</script><script>untrusted()</script>'}],saved:[],drafts:[]});
 const doc=previewDocument('<script nonce="__LUQI_PREVIEW_NONCE__">const initial=__LUQI_PREVIEW_BRIDGE_STATE__;</script>',nonce,raw,true);
 expect(doc).not.toContain('<script>untrusted()');expect(doc).toContain('\\u003c');expect(doc).not.toContain('__LUQI_PREVIEW_');
 expect(()=>previewDocument('',"bad'nonce",null,true)).toThrow();
});
it('uses an in-memory empty state for malformed persisted content',()=>{expect(validPreviewState('[]')).toBe(false);expect(validPreviewState(state)).toBe(true);expect(previewDocument('__LUQI_PREVIEW_BRIDGE_STATE__',nonce,'broken',false)).toContain('"value":null');});
it('bundles the real private design without public assets or upstream script dependencies',async()=>{
 const html=await businessPreviewTemplate();
 expect(html).toContain('Request a website or app');expect(html).toContain('Simulate reviewer approval');
 expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+stylesheet/);
 expect(html).toContain("connect-src 'none'");expect(html).toContain('__LUQI_PREVIEW_BRIDGE_STATE__');
 expect(Buffer.byteLength(html)).toBeLessThan(350000);
});
it('keeps the vendored courier simulation gated by checks and confirmed receipt',async()=>{
 const {readFile}=await import('node:fs/promises');const {runInNewContext}=await import('node:vm');
 const source=await readFile('private/business-connect/domain.js','utf8');const scope:{module:{exports:any}}={module:{exports:{}}};runInNewContext(source,scope);const d=scope.module.exports;
 const draft={id:'test-job',courierId:'test-courier',simulation:true,status:'draft',receiptConfirmed:false};
 expect(()=>d.transition(draft,'accept')).toThrow('checksRequired');
 const collected=d.transition(d.transition(draft,'accept',false,true),'pickup',false,true);
 expect(()=>d.transition(collected,'complete',false,true)).toThrow('receiptRequired');
 const completed=d.transition(collected,'complete',true,true);const rated=d.rate(completed,[4,5,3]);
 expect(d.rating([rated],'test-courier')).toMatchObject({count:1,average:4});expect(()=>d.rate(rated,[5,5,5])).toThrow('alreadyRated');
 rated.rating.status='held-demo';expect(d.rating([rated],'test-courier').count).toBe(0);
});
it('preserves dollar-sign replacement tokens in both assets and saved drafts',async()=>{
 const raw=JSON.stringify({profiles:[{name:'Keep $& and $$ literally'}],saved:[],drafts:[]});
 expect(JSON.parse(previewDocument('__LUQI_PREVIEW_BRIDGE_STATE__',nonce,raw,true)).value).toBe(raw);
 const {JSDOM,VirtualConsole}=await import('jsdom');const errors:string[]=[];const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const html=previewDocument(await businessPreviewTemplate(),nonce,null,true);
 const document=new JSDOM(html,{runScripts:'dangerously',url:'https://example.invalid',virtualConsole:console,beforeParse:w=>Object.defineProperty(w,'TextEncoder',{value:TextEncoder})});
 try{expect(errors).toEqual([]);expect(document.window.document.querySelectorAll('.business-card').length).toBe(10);expect(html).toContain('const $=s=>document.querySelector(s), $$=s=>');}finally{document.window.close();}
});
