import {TENDER_DOCUMENT_TIMEOUT_MS,type TenderDocumentRequest,type TenderDocumentResponse} from './tender-document-contract';
/** Each untrusted parse gets a fresh worker with a hard deadline, then termination. */
export function runTenderDocument(request:TenderDocumentRequest,signal?:AbortSignal):Promise<TenderDocumentResponse>{
  return new Promise(resolve=>{
    let worker:Worker;
    if(signal?.aborted){resolve({ok:false,code:'DOCUMENT_UNAVAILABLE'});return;}
    try{worker=new Worker(new URL('../workers/tender-document.worker.ts',import.meta.url),{type:'module'});}
    catch{resolve({ok:false,code:'DOCUMENT_UNAVAILABLE'});return;}
    let done=false;
    const finish=(result:TenderDocumentResponse)=>{
      if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
      worker.terminate();resolve(result);
    };
    const abort=()=>finish({ok:false,code:'DOCUMENT_UNAVAILABLE'});
    const timer=setTimeout(()=>finish({ok:false,code:'DOCUMENT_TIMEOUT'}),TENDER_DOCUMENT_TIMEOUT_MS);
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=e=>finish(e.data as TenderDocumentResponse);
    worker.onerror=()=>finish({ok:false,code:'DOCUMENT_INVALID'});
    worker.postMessage(request); // Clone: retain the immutable original in this tab.
  });
}
