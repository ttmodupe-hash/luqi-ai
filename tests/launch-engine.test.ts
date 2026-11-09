import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { EVIDENCE_TTL_MS, expireLaunchEvidence, invalidateLaunchTasks, launchCheckpoint, newLaunchPlan, probeLaunchHealth, probeLaunchRelease, recordLaunchReview, restoreLaunchCheckpoint, runLaunchPlan, validateLaunchPlan, type LaunchAdapters, type LaunchEvidence } from '../src/features/launch/launch-engine';
vi.stubGlobal('crypto',webcrypto);
const revision='a'.repeat(40);
const evidence=(summary='Observed fixture'):LaunchEvidence=>({summary,source:'live-http',observedAt:new Date().toISOString(),commit:revision});
const response=(value:unknown,headers:Record<string,string>={})=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});

describe('bounded launch workflow',()=>{
 it('rejects cycles, unknown parents, duplicate IDs and bypassed owner gates',()=>{
  const plan=newLaunchPlan();
  for(const invalid of [
   {...plan,tasks:[...plan.tasks,plan.tasks[0]]},
   {...plan,tasks:plan.tasks.map(task=>task.id==='release'?{...task,dependsOn:['confirm']}:task)},
   {...plan,tasks:plan.tasks.map(task=>task.id==='health'?{...task,dependsOn:['unknown']}:task)},
   {...plan,tasks:plan.tasks.map(task=>task.id==='review'?{...task,dependsOn:[]}:task)},
   {...plan,tasks:plan.tasks.map(task=>task.id==='confirm'?{...task,dependsOn:['release']}:task)},
   {...plan,tasks:plan.tasks.map(task=>task.id==='email'?{...task,id:'review',kind:'manual'}:task).filter(task=>task.kind!=='review')},
   {...plan,tasks:plan.tasks.map(task=>task.id==='release'?{...task,id:'different-release'}:task)},
  ])expect(()=>validateLaunchPlan(invalid)).toThrow();
 });
 it('continues independent branches, preserves evidence sources and never runs an owner gate',async()=>{
  const plan=newLaunchPlan(),calls:string[]=[];
  const adapters:LaunchAdapters={release:async()=>{calls.push('release');return{status:'passed',evidence:evidence()};},health:async()=>{calls.push('health');return{status:'failed',reason:'Fixture unavailable'};},email:async()=>{calls.push('email');return{status:'passed',evidence:{...evidence(),source:'local-input'}};},review:vi.fn(),confirm:vi.fn()};
  const result=await runLaunchPlan(plan,adapters,new AbortController().signal,()=>{});
  expect(calls.sort()).toEqual(['email','health','release']);
  expect(result.tasks.find(task=>task.id==='email')?.status).toBe('passed');
  expect(result.tasks.find(task=>task.id==='review')?.status).toBe('blocked');
  expect(adapters.review).not.toHaveBeenCalled();expect(adapters.confirm).not.toHaveBeenCalled();
 });
 it('requires current dependency evidence and a full reviewed revision; changed evidence clears descendants',()=>{
  let plan=newLaunchPlan();expect(()=>recordLaunchReview(plan,'review')).toThrow();
  plan={...plan,expectedCommit:revision,tasks:plan.tasks.map(task=>['release','health'].includes(task.id)?{...task,status:'passed',evidence:evidence()}:task)};
  plan=recordLaunchReview(plan,'review');expect(plan.tasks.find(task=>task.id==='review')?.evidence?.source).toBe('owner-recorded');expect(plan.tasks.find(task=>task.id==='review')?.evidence?.commit).toBe(revision);
  const invalidated=invalidateLaunchTasks(plan,['health']);expect(invalidated.tasks.find(task=>task.id==='review')?.status).toBe('pending');
  expect(invalidated.tasks.find(task=>task.id==='confirm')?.status).toBe('pending');expect(invalidated.tasks.find(task=>task.id==='release')?.status).toBe('passed');
  expect(expireLaunchEvidence(plan,Date.now()+EVIDENCE_TTL_MS+10).tasks.every(task=>task.status==='pending')).toBe(true);
 });
 it('will not confirm a different target using a previously recorded review',async()=>{
  let plan={...newLaunchPlan(),expectedCommit:revision};
  plan={...plan,tasks:plan.tasks.map(task=>['release','health'].includes(task.id)?{...task,status:'passed' as const,evidence:evidence()}:task)};
  plan=recordLaunchReview(plan,'review');const confirm=vi.fn();
  const result=await runLaunchPlan({...plan,expectedCommit:'b'.repeat(40)},{confirm},new AbortController().signal,()=>{});
  expect(confirm).not.toHaveBeenCalled();expect(result.tasks.find(task=>task.id==='confirm')?.status).toBe('blocked');
 });
 it('does not publish late results after cancellation',async()=>{
  const controller=new AbortController();let release!:()=>void;
  const wait=new Promise<void>(resolve=>{release=resolve;});const updates=vi.fn();
  const run=runLaunchPlan(newLaunchPlan(),{release:async()=>{await wait;return{status:'passed',evidence:evidence()};}},controller.signal,updates);
  controller.abort();const before=updates.mock.calls.length;release();await run;expect(updates.mock.calls.length).toBe(before);
 });
 it('restores graph context as historical and rejects tampered checkpoints or credential-shaped labels',async()=>{
  const plan={...newLaunchPlan(),expectedCommit:revision};plan.tasks[0]={...plan.tasks[0],status:'passed',evidence:evidence()};
  const text=await launchCheckpoint(plan), restored=await restoreLaunchCheckpoint(text);
  expect(restored.expectedCommit).toBe(revision);expect(restored.tasks[0].status).toBe('historical');
  expect(restored.tasks[0].evidence?.commit).toBe(revision);
  await expect(restoreLaunchCheckpoint(text.replace('Luqi web release','Forged release'))).rejects.toThrow();
  await expect(restoreLaunchCheckpoint('x'.repeat(65537))).rejects.toThrow();
  for(const name of ['password=secretvalue','0123456789012','０１２３４５６７８９０１２','12345-67890-12345'])expect(()=>validateLaunchPlan({...plan,name})).toThrow();
 });
});

describe('actual release probe contract',()=>{
 it('uses only fixed read-only paths, no credentials and bounded identity evidence',async()=>{
  const request=vi.fn(async(path:unknown)=>response(path==='/v1/release'?{format:'luqi.release.v1',commit:revision}:{status:'healthy'}));
  expect((await probeLaunchRelease(new AbortController().signal,revision,request as typeof fetch)).status).toBe('passed');
  expect((await probeLaunchHealth(new AbortController().signal,request as typeof fetch)).status).toBe('passed');
  expect(request.mock.calls.map(call=>call[0])).toEqual(['/v1/release','/v1/health']);
  for(const call of request.mock.calls){const options=call[1] as RequestInit;expect(options.method).toBe('GET');expect(options.credentials).toBe('omit');expect(options.redirect).toBe('error');expect(options.body).toBeUndefined();}
 });
 it('rejects stale caching, forged identities, oversized responses and revision mismatches',async()=>{
  for(const value of [{format:'luqi.release.v1',commit:revision,text:'Forged'}, {format:'luqi.release.v1',commit:'short'}])await expect(probeLaunchRelease(new AbortController().signal,'',async()=>response(value))).rejects.toThrow();
  await expect(probeLaunchRelease(new AbortController().signal,'',async()=>response({format:'luqi.release.v1',commit:revision},{'Cache-Control':'public'}))).rejects.toThrow();
  await expect(probeLaunchRelease(new AbortController().signal,'',async()=>response({padding:'x'.repeat(5000)}))).rejects.toThrow();
  expect((await probeLaunchRelease(new AbortController().signal,'b'.repeat(40),async()=>response({format:'luqi.release.v1',commit:revision}))).status).toBe('failed');
 });
});
