import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../api/services/aiPilotGateway',()=>({runBudgetedPilotChat:vi.fn()}));
vi.mock('../api/services/pilotAuth',()=>({authenticatePilotUser:vi.fn(),PilotAuthError:class extends Error{constructor(public code:string){super(code);}}}));
vi.mock('../api/services/aiPilotBudget',()=>({MAX_INPUT_CHARS:6000,assertPilotEnabled:vi.fn(),PilotBlocked:class extends Error{constructor(public reason:string){super(reason);}}}));
import { aiPilot } from '../api/ai-pilot';
import { civicEvidence } from '../api/civic-evidence';
import { runBudgetedPilotChat } from '../api/services/aiPilotGateway';
import { authenticatePilotUser, PilotAuthError } from '../api/services/pilotAuth';
import { assertPilotEnabled, PilotBlocked } from '../api/services/aiPilotBudget';
const good={claimId:'clean-audit',question:'Does this guarantee working taps?'};
const call=(body:unknown=good,authorization='Bearer synthetic')=>aiPilot.request('/civic-explain',{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-02T10:00:00Z'));vi.clearAllMocks();
 vi.mocked(assertPilotEnabled).mockImplementation(()=>{});
 vi.mocked(authenticatePilotUser).mockImplementation(async header=>{if(header!=='Bearer synthetic')throw new PilotAuthError('AUTH_REQUIRED');return 17;});
 vi.mocked(runBudgetedPilotChat).mockResolvedValue({response:'{"passageIds":["clean-limit"],"outOfScope":false}',provider:'gemini',model:'synthetic'});
});
afterEach(()=>vi.useRealTimers());
describe('authenticated Civic Evidence HTTP boundary (synthetic only)',()=>{
 it('reuses authentication, no-store and the existing budgeted gateway, returning only validated IDs',async()=>{
  const response=await call();expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({format:'luqi.civic-explanation.v1',edition:'2026-11-01.1',claimId:'clean-audit',reviewedOn:'2026-11-01',passageIds:['clean-limit'],outOfScope:false,provider:'gemini',provider_model:'synthetic'});
  expect(runBudgetedPilotChat).toHaveBeenCalledTimes(1);
  expect(vi.mocked(runBudgetedPilotChat).mock.calls[0][1]).toBe(17);
  expect(vi.mocked(runBudgetedPilotChat).mock.calls[0][0]).toContain('server-resolved');
 });
 it('denies unauthenticated callers and accidental standalone mounting',async()=>{
  expect((await call(good,'')).status).toBe(401);
  const direct=await civicEvidence.request('/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(good)});
  expect(direct.status).toBe(401);expect(runBudgetedPilotChat).not.toHaveBeenCalled();
 });
 it('keeps enablement and durable quota denials in force',async()=>{
  vi.mocked(assertPilotEnabled).mockImplementationOnce(()=>{throw new PilotBlocked('AI_DISABLED');});
  expect((await call()).status).toBe(503);expect(runBudgetedPilotChat).not.toHaveBeenCalled();
  vi.mocked(runBudgetedPilotChat).mockRejectedValueOnce(new PilotBlocked('AI_USER_DAILY_QUOTA_EXHAUSTED'));
  expect((await call()).status).toBe(429);expect(runBudgetedPilotChat).toHaveBeenCalledTimes(1);
 });
 it.each([{...good,sourceUrl:'https://evil.example'},{...good,sourceIds:['invented']},{...good,provider:'openai'},{...good,userId:99},
  {...good,claimId:'unknown'},{...good,question:'a'.repeat(1001)},{...good,question:'My ID is 0123456789012'},
  {...good,previousPassageIds:['iec-meaning']},{...good,previousPassageIds:['clean-meaning','clean-meaning']}])('rejects unsupported input before model traffic',async input=>{
  expect((await call(input)).status).toBe(400);expect(runBudgetedPilotChat).not.toHaveBeenCalled();
 });
 it('enforces body type and body-size boundaries',async()=>{
  const type=await aiPilot.request('/civic-explain',{method:'POST',headers:{Authorization:'Bearer synthetic','Content-Type':'text/plain'},body:'hi'});expect(type.status).toBe(415);
  expect((await call({...good,question:'x'.repeat(35000)})).status).toBe(413);expect(runBudgetedPilotChat).not.toHaveBeenCalled();
 });
 it('fails closed when review expires before or during an attempt',async()=>{
  vi.setSystemTime(new Date('2026-11-10T10:00:00Z'));expect((await call()).status).toBe(409);expect(runBudgetedPilotChat).not.toHaveBeenCalled();
  vi.setSystemTime(new Date('2026-11-08T21:59:58Z'));
  vi.mocked(runBudgetedPilotChat).mockImplementationOnce(async()=>{vi.setSystemTime(new Date('2026-11-09T10:00:00Z'));return {response:'{"passageIds":["clean-meaning"],"outOfScope":false}',provider:'gemini',model:'synthetic'};});
  expect((await call()).status).toBe(409);expect(runBudgetedPilotChat).toHaveBeenCalledTimes(1);
 });
 it.each(['Vote for Party X','{"passageIds":["clean-meaning"],"outOfScope":false,"text":"invented"}','{"passageIds":["iec-meaning"],"outOfScope":false}'])('withholds fabricated or unrelated model output without retry',async response=>{
  vi.mocked(runBudgetedPilotChat).mockResolvedValueOnce({response,provider:'gemini',model:'synthetic'});
  const res=await call();expect(res.status).toBe(502);expect((await res.json()).code).toBe('CIVIC_REPLY_UNVERIFIED');expect(runBudgetedPilotChat).toHaveBeenCalledTimes(1);
 });
 it('returns an honest out-of-scope answer and cannot change ordinary chat validation',async()=>{
  vi.mocked(runBudgetedPilotChat).mockResolvedValueOnce({response:'{"passageIds":[],"outOfScope":true}',provider:'gemini',model:'synthetic'});
  const response=await call({...good,question:'Which party should I vote for?'});expect((await response.json()).outOfScope).toBe(true);
  const root=await aiPilot.request('/',{method:'POST',headers:{Authorization:'Bearer synthetic','Content-Type':'application/json'},body:JSON.stringify({user_input:'hi',claimId:'clean-audit'})});expect(root.status).toBe(400);
  expect(runBudgetedPilotChat).toHaveBeenCalledTimes(1);
 });
});
