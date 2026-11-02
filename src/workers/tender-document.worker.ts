import {processTenderDocument} from '../lib/tender-document-engine';
import type {TenderDocumentRequest} from '../lib/tender-document-contract';
// No imported document can make a network request from this worker.
const scope=self as unknown as {onmessage:((event:MessageEvent<TenderDocumentRequest>)=>void)|null;
  postMessage:(message:unknown,transfer?:Transferable[])=>void; fetch:typeof fetch};
scope.fetch=()=>Promise.reject(new Error('DOCUMENT_NETWORK_DISABLED'));
scope.onmessage=async event=>{
  const result=await processTenderDocument(event.data);
  scope.postMessage(result,result.ok&&result.filled?[result.filled.buffer as ArrayBuffer]:[]);
};
