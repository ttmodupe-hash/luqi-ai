// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {runTenderDocument} from '../src/lib/tender-document-client';
import {TENDER_DOCUMENT_TIMEOUT_MS} from '../src/lib/tender-document-contract';
const instances:FakeWorker[]=[];
class FakeWorker {
 onmessage:((e:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;
 terminate=vi.fn();postMessage=vi.fn();constructor(){instances.push(this)}
}
afterEach(()=>{instances.length=0;vi.useRealTimers();vi.unstubAllGlobals()});
const request={action:'inspect' as const,name:'original.docx',mime:'',bytes:new Uint8Array([1])};
it('terminates a hung worker at the deadline and ignores its late response',async()=>{
 vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker);
 const pending=runTenderDocument(request);
 await vi.advanceTimersByTimeAsync(TENDER_DOCUMENT_TIMEOUT_MS);
 expect(await pending).toEqual({ok:false,code:'DOCUMENT_TIMEOUT'});expect(instances[0].terminate).toHaveBeenCalledOnce();
 instances[0].onmessage?.({data:{ok:true,inspection:{templateId:'attacker'}}});
 expect(await pending).toEqual({ok:false,code:'DOCUMENT_TIMEOUT'});
});
it('aborting a document operation terminates its worker immediately',async()=>{
 vi.stubGlobal('Worker',FakeWorker);const controller=new AbortController();
 const pending=runTenderDocument(request,controller.signal);controller.abort();
 expect(await pending).toEqual({ok:false,code:'DOCUMENT_UNAVAILABLE'});expect(instances[0].terminate).toHaveBeenCalledOnce();
});
