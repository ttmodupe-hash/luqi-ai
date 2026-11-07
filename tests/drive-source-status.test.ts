import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, symlink, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { DRIVE_SOURCES } from '../src/features/drive/drive-intelligence';
import { emptySourceStatus, parseSourceStatus, sourceFreshness, loadSourceStatus, SOURCE_STATUS_PATH } from '../src/features/drive/drive-source-status';
import { projectDriveSourceStatus, readSavedDriveSourceStatus } from '../api/services/drive-source-status-store';
import { createRouter, publicQuery } from '../api/middleware';
import { createTrpcHttp } from '../api/trpc-http';
import { driveSourcesRouter } from '../api/drive-source-status';

const NOW = new Date('2026-11-06T06:00:00.000Z');
const time = (hours: number) => new Date(NOW.getTime() - hours * 3600000).toISOString();
const id = DRIVE_SOURCES[0].id;
function state() { return {version:1,lastAttempt:{[id]:time(1)},lastGood:{[id]:{sourceId:id,checkedAt:time(2),digest:'a'.repeat(64),bytes:123,state:'changed-review-required',trust:'unreviewed-bytes-only'}}}; }
const dirs: string[] = [];
async function directory() { const dir = await mkdtemp(join(tmpdir(),'luqi-drive-status-')); dirs.push(dir); return dir; }
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); await Promise.all(dirs.splice(0).map(dir=>rm(dir,{recursive:true,force:true}))); });

it('projects only IDs, enum states and timestamps while retaining the previous success', () => {
 const input = {...state(), privatePath:'/private/SECRET', learnerNote:'LEARNER-SECRET'};
 const output = projectDriveSourceStatus(input,NOW), check=output.checks.find(c=>c.id===id)!;
 expect(check.lastAttemptAt).toBe(time(1));expect(check.lastSuccessAt).toBe(time(2));expect(check.attemptState).toBe('unavailable');expect(check.contentState).toBe('changed-review-required');
 const text=JSON.stringify(output);expect(text).not.toContain('SECRET');expect(text).not.toContain('a'.repeat(64));expect(text).not.toContain('bytes');expect(output.safeToTravel).toBeNull();
});
it('represents an empty store and a source with no successful observation honestly',()=>{
 expect(projectDriveSourceStatus({version:1,lastAttempt:{},lastGood:{}},NOW).state).toBe('empty');
 const x=projectDriveSourceStatus({version:1,lastAttempt:{[id]:time(1)},lastGood:{}},NOW);
 expect(x.state).toBe('available');expect(x.checks[0].attemptState).toBe('unavailable');expect(sourceFreshness(x.checks[0],NOW)).toBe('never-observed');
});
it('keeps an old observation overdue even after a recent failed attempt',()=>{
 const x=state();x.lastGood[id].checkedAt=time(48);const projected=projectDriveSourceStatus(x,NOW);
 expect(sourceFreshness(projected.checks[0],NOW)).toBe('observation-overdue');
});
it('ages a successful observation according to its source cadence',()=>{
 const x=projectDriveSourceStatus(state(),NOW).checks[0];expect(sourceFreshness(x,NOW)).toBe('recent-observation');
 expect(sourceFreshness(x,new Date(NOW.getTime()+24*3600000))).toBe('observation-overdue');
});
it('does not label a future observation current',()=>{
 const x=state();x.lastAttempt[id]=new Date(NOW.getTime()+1000).toISOString();expect(()=>projectDriveSourceStatus(x,NOW)).toThrow();
});
for(const patch of [
 {scope:'live-road-conditions'}, {safeToTravel:true}, {generatedAt:'2026-11-05T00:00:00.000Z'},
 {generatedAt:'2027-01-01T00:00:00.000Z'}, {privatePath:'/secret'}, {state:['available']}, {checks:[]}, {version:2},
]) it('rejects invalid public snapshot '+JSON.stringify(patch),()=>{
 expect(()=>parseSourceStatus({...projectDriveSourceStatus(state(),NOW),...patch},NOW)).toThrow();
});
for(const patch of [{id:'attacker-url'}, {digest:'a'.repeat(64)}, {contentState:['baseline']}, {lastSuccessAt:time(0)}, {lastAttemptAt:null}, {attemptState:'observed'}, {contentState:'not-checked'}])
 it('rejects invalid source metadata '+JSON.stringify(patch),()=>{
 const x=projectDriveSourceStatus(state(),NOW);x.checks[0]={...x.checks[0],...patch} as any;
 expect(()=>parseSourceStatus(x,NOW)).toThrow();
});
it('rejects duplicate IDs and inconsistent disabled snapshots',()=>{
 const x=projectDriveSourceStatus(state(),NOW);x.checks[1]={...x.checks[0]};expect(()=>parseSourceStatus(x,NOW)).toThrow();
 expect(()=>parseSourceStatus({...projectDriveSourceStatus(state(),NOW),state:'disabled'},NOW)).toThrow();
});
it('does not read storage or network when the rollout is disabled',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect((await readSavedDriveSourceStatus({enabled:'false',stateDir:'/private/never-open'},NOW)).state).toBe('disabled');expect(fetcher).not.toHaveBeenCalled();
});
it('reads a valid fixed metadata file without making requests',async()=>{
 const dir=await directory();await writeFile(join(dir,'state.json'),JSON.stringify(state()));const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect((await readSavedDriveSourceStatus({enabled:'true',stateDir:dir},NOW)).checks[0].lastSuccessAt).toBe(time(2));expect(fetcher).not.toHaveBeenCalled();
});
it('returns empty for absent state and unavailable for invalid configuration',async()=>{
 const dir=await directory();expect((await readSavedDriveSourceStatus({enabled:'true',stateDir:dir},NOW)).state).toBe('empty');
 expect((await readSavedDriveSourceStatus({enabled:'true',stateDir:'relative'},NOW)).state).toBe('unavailable');
 expect((await readSavedDriveSourceStatus({enabled:'true'},NOW)).state).toBe('unavailable');
});
for(const text of ['{SECRET-BROKEN-JSON','x'.repeat(32769),'',JSON.stringify({version:9,lastAttempt:{},lastGood:{}})])
 it('rejects malformed or oversized saved metadata of length '+text.length,async()=>{
 const dir=await directory();await writeFile(join(dir,'state.json'),text);
 const output=await readSavedDriveSourceStatus({enabled:'true',stateDir:dir},NOW);
 expect(output.state).toBe('unavailable');expect(JSON.stringify(output)).not.toContain('SECRET');expect(JSON.stringify(output)).not.toContain(dir);
});
it('rejects state-file symlinks and directories rather than following them',async()=>{
 const dir=await directory(),target=join(dir,'other.json');await writeFile(target,JSON.stringify(state()));await symlink(target,join(dir,'state.json'));
 expect((await readSavedDriveSourceStatus({enabled:'true',stateDir:dir},NOW)).state).toBe('unavailable');
 await rm(join(dir,'state.json'));await mkdir(join(dir,'state.json'));expect((await readSavedDriveSourceStatus({enabled:'true',stateDir:dir},NOW)).state).toBe('unavailable');
});
it('rejects a symlinked state directory',async()=>{
 const parent=await directory(),real=join(parent,'real'),link=join(parent,'link');await mkdir(real);await writeFile(join(real,'state.json'),JSON.stringify(state()));await symlink(real,link);
 expect((await readSavedDriveSourceStatus({enabled:'true',stateDir:link},NOW)).state).toBe('unavailable');
});
it('loads only the fixed same-origin path with no credentials or private payload',async()=>{
 const payload=emptySourceStatus('disabled');const fetcher=vi.fn(async()=>Response.json({result:{data:{json:payload}}}));
 const output=await loadSourceStatus(new AbortController().signal,fetcher as typeof fetch);
 expect(output.state).toBe('disabled');expect(fetcher.mock.calls[0]?.[0]).toBe(SOURCE_STATUS_PATH);
 expect(fetcher.mock.calls[0]?.[1]).toMatchObject({method:'GET',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer'});
 expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty('body');
});
it('does not request when already aborted',async()=>{
 const controller=new AbortController();controller.abort();const fetcher=vi.fn();await expect(loadSourceStatus(controller.signal,fetcher)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
for(const [name,make] of [
 ['server error',()=>new Response('SECRET',{status:500})],
 ['wrong MIME',()=>new Response('{}',{headers:{'content-type':'text/html'}})],
 ['oversize body',()=>new Response('x'.repeat(16385),{headers:{'content-type':'application/json'}})],
 ['wrong envelope',()=>Response.json({error:{message:'SECRET'}})],
 ['extra envelope data',()=>Response.json({result:{data:{json:emptySourceStatus('disabled')}},secret:'SECRET'})],
] as const) it('rejects '+name+' at the client boundary',async()=>{
 await expect(loadSourceStatus(new AbortController().signal,(async()=>make()) as typeof fetch)).rejects.toThrow();
});
it('serves the actual public tRPC query but not caller paths or mutations',async()=>{
 vi.stubEnv('LUQI_DRIVE_STATUS_PUBLIC_ENABLED','false');
 const router=createRouter({driveSources:driveSourcesRouter,unapproved:publicQuery.query(()=>({private:'SECRET'}))});
 const app=new Hono();app.route('/api/trpc',createTrpcHttp(router));
 const response=await app.request(SOURCE_STATUS_PATH);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 const body=await response.json();expect(parseSourceStatus(body.result.data.json).state).toBe('disabled');
 const input=encodeURIComponent(JSON.stringify({json:{stateDir:'/secret',refresh:true}}));
 expect((await app.request(SOURCE_STATUS_PATH+'?input='+input)).status).toBeGreaterThanOrEqual(400);
 expect((await app.request(SOURCE_STATUS_PATH,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status).toBeGreaterThanOrEqual(400);
 const denied=await app.request('/api/trpc/unapproved');expect(denied.status).toBeGreaterThanOrEqual(400);expect(await denied.text()).not.toContain('SECRET');
});
it('client and production mirrors match and the real router mounts only the named status procedure',()=>{
 for(const path of ['drive-source-status.ts','DriveSourceStatusPanel.tsx','TripFuel.tsx'])expect(readFileSync('src/features/drive/'+path,'utf8')).toBe(readFileSync('app/src/features/drive/'+path,'utf8'));
 const router=readFileSync('api/router.ts','utf8');expect(router).toContain('driveSources: driveSourcesRouter');
 const api=readFileSync('api/drive-source-status.ts','utf8');expect(api).not.toContain('.mutation(');expect(api).toContain('z.undefined()');
});
