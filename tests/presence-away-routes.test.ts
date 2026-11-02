import { Hono } from 'hono';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const mock=vi.hoisted(()=>({auth:vi.fn()}));
vi.mock('../api/services/pilotAuth',async original=>({...await original<typeof import('../api/services/pilotAuth')>(),authenticatePilotUser:mock.auth}));
import { p2p } from '../api/p2p';
import { SovereignP2PEngine } from '../api/services/sovereignP2P';
const app=new Hono().route('/api/v1/p2p',p2p);
const post=(body:unknown)=>app.request('/api/v1/p2p/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{mock.auth.mockReset().mockResolvedValue(7);vi.stubEnv('LUQI_P2P_ENABLED','true');});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it('accepts an explicit away choice only for the authenticated actor',async()=>{
 const spy=vi.spyOn(SovereignP2PEngine,'sharePresence').mockResolvedValue({accepted:true,ttlSeconds:75});
 const body={leaseId:crypto.randomUUID(),sequence:1,active:true,availability:'away'};
 const result=await post(body);expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('no-store');
 expect(spy).toHaveBeenCalledExactlyOnceWith(7,body);
});
it('rejects forged identity and invalid availability before storage',async()=>{
 const spy=vi.spyOn(SovereignP2PEngine,'sharePresence');
 const body={leaseId:crypto.randomUUID(),sequence:1,active:true};
 for(const availability of ['offline','hidden','busy',null,7,{}])expect((await post({...body,availability})).status).toBe(400);
 expect((await post({...body,availability:'away',userId:8})).status).toBe(400);expect(spy).not.toHaveBeenCalled();
});
it('the disabled production gate still blocks away updates',async()=>{
 vi.stubEnv('LUQI_P2P_ENABLED','false');const spy=vi.spyOn(SovereignP2PEngine,'sharePresence');
 expect((await post({leaseId:crypto.randomUUID(),sequence:1,active:true,availability:'away'})).status).toBe(503);
 expect(spy).not.toHaveBeenCalled();
});
it('unauthenticated away requests remain private and denied',async()=>{
 mock.auth.mockRejectedValue(Error('private details'));const spy=vi.spyOn(SovereignP2PEngine,'sharePresence');
 const result=await post({leaseId:crypto.randomUUID(),sequence:1,active:true,availability:'away'});
 expect(result.status).toBe(401);expect(await result.text()).not.toContain('private details');expect(spy).not.toHaveBeenCalled();
});
