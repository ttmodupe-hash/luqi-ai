import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { clearInteractionHandoffs, stageGuide, readGuide, readChatReturn, syncInteractionOwner,
  clearGuideHandoff, stageCivicSignIn, civicReturnPath, completeCivicSignIn, readCivicResume } from '../src/lib/interaction-handoff';
import { evaluatePracticeCommand, parsePracticeReply } from '../src/lib/certification-client';
import { CIVIC_RECORD_IDS } from '../src/lib/civic-record-ids';
import { CIVIC_CLAIMS } from '../src/lib/civic-evidence';
import { findWorkspaceTools } from '../src/components/workspace-catalog';

afterEach(() => { clearInteractionHandoffs(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('ephemeral selected-context handoff', () => {
  it('retains the Chat draft but copies no narrative to a guide without a separate choice', () => {
    expect(stageGuide('account-a', '/consumer-rights', 'My bank debit order is disputed', 'UNAUTHORIZED_DEBIT_ORDER', false, 1000)).toBe(true);
    expect(readGuide('account-a', '/consumer-rights', 2000)).toEqual({ selection: 'UNAUTHORIZED_DEBIT_ORDER', question: '', hasDraft: true });
    expect(readChatReturn('account-a', 2000)).toBe('My bank debit order is disputed');
    expect(readGuide('account-b', '/consumer-rights', 2000)).toBeNull();
    expect(readGuide('account-a', '/driver-rights', 2000)).toBeNull();
    expect(readChatReturn('account-b', 2000)).toBeNull();
  });
  it('copies only an explicitly approved local narrative and expires it', () => {
    stageGuide('a', '/consumer-rights', 'approved synthetic concern', 'UNSURE', true, 1000);
    expect(readGuide('a','/consumer-rights',2000)?.question).toBe('approved synthetic concern');
    expect(readGuide('a','/consumer-rights',1201001)).toBeNull();
    expect(readChatReturn('a',1201001)).toBeNull();
    expect(readChatReturn('a',999)).toBeNull();
    clearGuideHandoff(); expect(readChatReturn('a',2000)).toBeNull();
  });
  it('clears on account changes and sign-out, never restores a previous identity', () => {
    stageGuide('a','/tenders','Draft from A',null,true,1000); syncInteractionOwner('b');
    expect(readChatReturn('a',2000)).toBeNull();
    stageGuide('b','/tenders','Draft from B',null,true,1000); syncInteractionOwner(null);
    expect(readChatReturn('b',2000)).toBeNull();
  });
  it.each(['https://evil.example', '//evil.example', '/login?next=x', '/consumer-rights?story=x','/admin'])('rejects unapproved destinations %s', path => {
    expect(stageGuide('a',path,'draft',null)).toBe(false);
  });
  it('validates category shape, length, time and owner before retaining a draft', () => {
    expect(stageGuide(null,'/consumer-rights','draft',null)).toBe(false);
    expect(stageGuide('a','/consumer-rights','x'.repeat(6001),null)).toBe(false);
    expect(stageGuide('a','/consumer-rights','draft','<script>')).toBe(false);
    expect(stageGuide('a','/consumer-rights','draft',null,true,NaN)).toBe(false);
  });
  it('returns login only to a known Civic record, with an explicitly staged question', () => {
    expect(stageCivicSignIn('https://evil.example','x',1000)).toBe(false);
    expect(stageCivicSignIn('clean-audit','Approved local question',1000)).toBe(true);
    expect(civicReturnPath(2000)).toBe('/chat?evidence=clean-audit');
    expect(completeCivicSignIn('a',2000)).toBe('/chat?evidence=clean-audit');
    expect(civicReturnPath(2000)).toBeNull();
    syncInteractionOwner('a');
    expect(readCivicResume('a','clean-audit',2000)).toBe('Approved local question');
    expect(readCivicResume('b','clean-audit',2000)).toBe('');
    expect(readCivicResume('a','other',2000)).toBe('');
    syncInteractionOwner('b'); expect(readCivicResume('a','clean-audit',2000)).toBe('');
  });
  it('does not carry an expired login route or question', () => {
    stageCivicSignIn('clean-audit','Old draft',1000);
    expect(completeCivicSignIn('a',1201001)).toBeNull();
    expect(readCivicResume('a','clean-audit',1201001)).toBe('');
  });
});

describe('truthful practice CLI response boundary', () => {
  const good = { output: '', nextMode: 'privileged', prompt: 'Router#', executedCommand: 'enable' };
  it('accepts a matching practice transition, not an assertion of real router access', async () => {
    const net = vi.fn(async () => new Response(JSON.stringify(good)));
    expect(await evaluatePracticeCommand(' enable ','user',undefined,net)).toEqual({output:'',nextMode:'privileged',prompt:'Router#'});
    expect(net).toHaveBeenCalledTimes(1);
    expect(JSON.parse(net.mock.calls[0][1]!.body as string)).toEqual({command:'enable',mode:'user',prompt:'Router>'});
  });
  it.each([401,404,429,503])('rejects HTTP %s rather than overwriting the prompt with undefined', async status => {
    const net = vi.fn(async () => new Response('{"code":"unavailable"}',{status}));
    await expect(evaluatePracticeCommand('enable','user',undefined,net)).rejects.toThrow('HTTP '+status);
    expect(net).toHaveBeenCalledTimes(1);
  });
  it.each([null, [], {}, {...good,nextMode:'unknown'}, {...good,prompt:'undefined'}, {...good,executedCommand:'something else'}, {...good,output:'x'.repeat(16001)}])('rejects malformed or mismatched payload %#', value => {
    expect(parsePracticeReply(value,'enable')).toBeNull();
  });
  it('rejects invalid JSON, never substitutes unrelated offline prose', async () => {
    await expect(evaluatePracticeCommand('enable','user',undefined,vi.fn(async()=>new Response('<html>Unavailable</html>')))).rejects.toThrow();
    const net = vi.fn(async()=>{throw new Error('offline');});
    await expect(evaluatePracticeCommand('definitely-not-a-command','user',undefined,net)).rejects.toThrow('offline');
    expect(net).toHaveBeenCalledTimes(1);
  });
  it('has a bounded timeout and no automatic retry', async () => {
    vi.useFakeTimers();
    const net = vi.fn((_url:any, init:any) => new Promise<Response>((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('aborted')))));
    const outcome = evaluatePracticeCommand('enable','user',undefined,net).catch(error=>error);
    await vi.advanceTimersByTimeAsync(10001);
    expect((await outcome).message).toBe('aborted'); expect(net).toHaveBeenCalledTimes(1);
  });
  it('propagates caller cancellation without retry', async () => {
    const controller=new AbortController();
    const net=vi.fn((_url:any,init:any)=>new Promise<Response>((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('cancelled')))));
    const pending=evaluatePracticeCommand('enable','user',controller.signal,net).catch(error=>error);
    controller.abort(); expect((await pending).message).toBe('cancelled'); expect(net).toHaveBeenCalledTimes(1);
  });
});

it('public search finds Civic and balloon tools without claiming reviewed translation coverage', () => {
  for (const q of ['civic','voting','politics']) expect(findWorkspaceTools(q).some(t=>t.path==='/chat?civic=1')).toBe(true);
  expect(findWorkspaceTools('balloon').some(t=>t.path==='/consumer-rights')).toBe(true);
  expect(findWorkspaceTools('african languages','ready')).toEqual([]);
});
it.each(['lib/interaction-handoff.ts','lib/certification-client.ts','components/GuideHandoffNotice.tsx','components/ChatSidebar.tsx','pages/CertMasterPage.tsx','pages/ContentStudioPage.tsx','pages/CustomerEntryPage.tsx','pages/AiPilotPage.tsx','components/WorkspaceLayout.tsx'])('both source trees have the same repaired interaction: %s',path=>{
  expect(readFileSync('src/'+path,'utf8')).toBe(readFileSync('app/src/'+path,'utf8'));
});

it('lightweight Civic route IDs stay aligned with the authoritative evidence registry',()=>{ expect([...CIVIC_RECORD_IDS]).toEqual(CIVIC_CLAIMS.map(c=>c.id)); });
