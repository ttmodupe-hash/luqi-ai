import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CIVIC_EDITION } from '../src/lib/civic-evidence';
import { askCivicEvidence, validateCivicReply } from '../src/lib/civic-evidence-client';
const reply = {format:'luqi.civic-explanation.v1',edition:CIVIC_EDITION,claimId:'clean-audit',reviewedOn:'2026-11-01',passageIds:['clean-meaning'],outOfScope:false,provider:'gemini',provider_model:'synthetic'};
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-02T10:00:00Z'));});
afterEach(()=>vi.useRealTimers());
describe('bounded civic browser request',()=>{
 it('sends one minimal same-origin POST without cookies, sources, preferences or private history',async()=>{
  const request=vi.fn(async()=>new Response(JSON.stringify(reply),{headers:{'Content-Type':'application/json'}}));
  const result=await askCivicEvidence('synthetic-token','clean-audit','What does it prove?',['clean-limit'],new AbortController().signal,request as typeof fetch);
  expect(result.passageIds).toEqual(['clean-meaning']);expect(request).toHaveBeenCalledTimes(1);
  const [url,init]=request.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe('/api/v1/luqi-core/civic-explain');
  expect(init).toMatchObject({method:'POST',credentials:'omit',cache:'no-store',redirect:'error'});
  expect(JSON.parse(init.body as string)).toEqual({claimId:'clean-audit',question:'What does it prove?',previousPassageIds:['clean-limit']});
 });
 it.each([{...reply,edition:'forged'},{...reply,claimId:'iec-check'},{...reply,passageIds:['iec-meaning']},{...reply,text:'Fake evidence'}, {...reply,sourceUrl:'javascript:evil'}])('rejects mismatched or fabricated response data',value=>{
  expect(()=>validateCivicReply(value,'clean-audit')).toThrow();
 });
 it('does not retry ambiguous transport failure',async()=>{
  const request=vi.fn(async()=>{throw new Error('private transport diagnostic');});
  await expect(askCivicEvidence('token','clean-audit','Explain',[],new AbortController().signal,request as typeof fetch)).rejects.toMatchObject({code:'RESPONSE_UNCONFIRMED'});
  expect(request).toHaveBeenCalledTimes(1);
 });
 it('rejects stale evidence and identifiers before a provider request',async()=>{
  const request=vi.fn();
  await expect(askCivicEvidence('token','clean-audit','My ID ０１２３４５６７８９０１２',[],new AbortController().signal,request)).rejects.toMatchObject({code:'CIVIC_PRIVATE_IDENTIFIER'});
  vi.setSystemTime(new Date('2026-11-10T10:00:00Z'));
  await expect(askCivicEvidence('token','clean-audit','Explain',[],new AbortController().signal,request)).rejects.toMatchObject({code:'CIVIC_SOURCES_STALE'});
  expect(request).not.toHaveBeenCalled();
 });
 it('honours cancelled requests and maps authentication denial without reading diagnostics',async()=>{
  const controller=new AbortController();controller.abort();const request=vi.fn();
  await expect(askCivicEvidence('token','clean-audit','Explain',[],controller.signal,request)).rejects.toMatchObject({code:'RESPONSE_UNCONFIRMED'});
  expect(request).not.toHaveBeenCalled();
  request.mockResolvedValue(new Response('private diagnostics',{status:401}));
  await expect(askCivicEvidence('token','clean-audit','Explain',[],new AbortController().signal,request)).rejects.toMatchObject({code:'AUTH_REQUIRED'});
 });
});
