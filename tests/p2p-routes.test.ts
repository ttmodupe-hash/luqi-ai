import {Hono} from 'hono';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({auth:vi.fn()}));
vi.mock('../api/services/pilotAuth',async original=>({...await original<typeof import('../api/services/pilotAuth')>(),authenticatePilotUser:mock.auth}));
import {p2p} from '../api/p2p';
import {SovereignP2PEngine} from '../api/services/sovereignP2P';
const app=new Hono().route('/api/v1/p2p',p2p);
const post=(path:string,body:unknown,type='application/json')=>app.request('/api/v1/p2p'+path,{method:'POST',headers:{'Content-Type':type},body:JSON.stringify(body)});
beforeEach(()=>{mock.auth.mockReset().mockResolvedValue(7);vi.stubEnv('LUQI_P2P_ENABLED','false')});afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs()});
it('authenticates before status disclosure or body processing',async()=>{
 mock.auth.mockRejectedValue(new Error('private'));for(const path of ['/status','/contacts','/moderation/reports']){const r=await app.request('/api/v1/p2p'+path);expect(r.status).toBe(401);expect(r.headers.get('Cache-Control')).toBe('no-store');expect(await r.text()).not.toContain('private')}
});
it('keeps all writes and moderation off by default without touching storage',async()=>{
 const spy=vi.spyOn(SovereignP2PEngine,'create');expect((await app.request('/api/v1/p2p/status')).status).toBe(200);
 expect(await (await app.request('/api/v1/p2p/status')).json()).toMatchObject({enabled:false,blockedPeers:[]});
 expect((await post('/circles',{})).status).toBe(503);expect((await app.request('/api/v1/p2p/moderation/reports')).status).toBe(503);expect(spy).not.toHaveBeenCalled();
 expect((await app.request('/api/v1/p2p/contacts')).status).toBe(503);
});
it('uses the authenticated actor for contacts and rejects caller identity and search parameters',async()=>{
 vi.stubEnv('LUQI_P2P_ENABLED','true');
 const spy=vi.spyOn(SovereignP2PEngine,'approvedContacts').mockResolvedValue({contacts:[]});
 const response=await app.request('/api/v1/p2p/contacts');
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(spy).toHaveBeenCalledExactlyOnceWith(7);
 expect((await app.request('/api/v1/p2p/contacts?userId=8')).status).toBe(400);
 expect((await app.request('/api/v1/p2p/contacts?name=Private')).status).toBe(400);
 expect(spy).toHaveBeenCalledOnce();
});
it('rejects forged identity, plaintext fields, missing report consent, query input and oversized bodies',async()=>{
 vi.stubEnv('LUQI_P2P_ENABLED','true');const spy=vi.spyOn(SovereignP2PEngine,'send');
 const packet={messageId:crypto.randomUUID(),circleId:crypto.randomUUID(),senderId:99,recipientId:8,timestamp:new Date().toISOString(),iv:'A'.repeat(16),ciphertext:'A'.repeat(30)};
 expect((await post('/messages',packet)).status).toBe(403);expect((await post('/messages',{...packet,senderId:7,text:'plaintext'})).status).toBe(400);
 expect((await post('/reports',{messageId:packet.messageId,reason:'HARASSMENT',evidence:'Private'})).status).toBe(400);
 expect((await app.request('/api/v1/p2p/status?userId=99')).status).toBe(400);
 expect((await post('/messages',{},'text/plain')).status).toBe(400);expect((await post('/messages',{text:'x'.repeat(20000)})).status).toBe(413);expect(spy).not.toHaveBeenCalled();
});
