import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),mine:vi.fn(),directory:vi.fn(),publicPage:vi.fn(),save:vi.fn(),ownerAction:vi.fn(),history:vi.fn(),report:vi.fn(),reviewQueue:vi.fn(),moderate:vi.fn(),resolveReport:vi.fn(),retention:vi.fn()}));
vi.mock('../api/services/pilotAuth',()=>({authenticatePilotUser:mocks.auth,PilotAuthError:class extends Error{constructor(public code:string){super(code);}}}));
vi.mock('../api/services/businessConnectStore',async original=>({...await original<typeof import('../api/services/businessConnectStore')>(),businessConnectStore:mocks}));
import {businessConnect as app} from '../api/business-connect';
import {BusinessError} from '../api/services/businessConnectStore';
import {businessFixture,ownedBusinessFixture} from './fixtures/business-connect';
const id=ownedBusinessFixture().id;let who=100;
const call=(path:string,body?:unknown,method=body===undefined?'GET':'POST',contentType='application/json')=>app.request(path,{method,headers:{'Content-Type':contentType},...(body===undefined?{}:{body:JSON.stringify(body)})});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue(++who);vi.stubEnv('LUQI_BUSINESS_CONNECT_ENABLED','true');vi.stubEnv('LUQI_BUSINESS_CONNECT_PUBLIC_ENABLED','false');});
afterEach(()=>vi.unstubAllEnvs());
describe('Business Connect rollout and identity boundaries',()=>{
  it('defaults off without touching authentication, storage or paid providers',async()=>{
    vi.stubEnv('LUQI_BUSINESS_CONNECT_ENABLED','');
    expect(await (await call('/status')).json()).toEqual({enabled:false,publicDirectory:false,mode:'disabled'});
    expect((await call('/mine')).status).toBe(503);expect((await call('/directory')).status).toBe(503);
    Object.values(mocks).forEach(fn=>expect(fn).not.toHaveBeenCalled());
  });
  it('requires existing Luqi authentication for the review directory and all owner mutations',async()=>{
    mocks.auth.mockRejectedValue(new Error('invalid customer'));
    for(const path of ['/directory','/directory/'+id,'/mine','/moderation/queue']){
      const r=await call(path);expect(r.status).toBe(401);expect(r.headers.get('Cache-Control')).toBe('no-store');
    }
    expect((await call('/mine/'+id,{expectedRevision:0,profile:businessFixture()},'PUT')).status).toBe(401);
    expect(mocks.directory).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
  });
  it('needs a separate public gate; opening directory reads never opens owner or moderation access',async()=>{
    vi.stubEnv('LUQI_BUSINESS_CONNECT_PUBLIC_ENABLED','true');mocks.auth.mockRejectedValue(new Error('invalid'));
    mocks.directory.mockResolvedValue({businesses:[],nextPage:null});expect((await call('/directory')).status).toBe(200);
    expect(mocks.auth).not.toHaveBeenCalled();expect((await call('/mine')).status).toBe(401);expect((await call('/moderation/queue')).status).toBe(401);
  });
  it('validates strict JSON, upload/body limits, repeated queries and spoofed owner fields',async()=>{
    const good={expectedRevision:0,profile:businessFixture()};
    for(const body of [{...good,ownerId:99},{...good,profile:{...good.profile,verification:{contactConfirmed:true}}}])expect((await call('/mine/'+id,body,'PUT')).status).toBe(400);
    expect((await call('/mine/'+id,good,'PUT','multipart/form-data')).status).toBe(400);
    expect((await call('/mine/'+id,{...good,x:'a'.repeat(33000)},'PUT')).status).toBe(413);
    for(const path of ['/directory?ownerId=99','/directory?q=a&q=b','/mine?owner=1','/status?secret=1','/directory?page=999'])expect((await call(path)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('takes owner identity only from the validated session and requires explicit versioned actions',async()=>{
    mocks.save.mockResolvedValue({business:ownedBusinessFixture()});
    expect((await call('/mine/'+id,{expectedRevision:0,profile:businessFixture()},'PUT')).status).toBe(201);
    expect(mocks.save).toHaveBeenCalledWith(who,id,{expectedRevision:0,profile:businessFixture()});
    for(const body of [{expectedRevision:1,confirm:false},{expectedRevision:0,confirm:true},{expectedRevision:1,confirm:true,ownerId:2}])expect((await call('/mine/'+id+'/delete',body)).status).toBe(400);
    expect(mocks.ownerAction).not.toHaveBeenCalled();
    mocks.ownerAction.mockResolvedValue({removed:true,id});expect((await call('/mine/'+id+'/delete',{expectedRevision:1,confirm:true})).status).toBe(200);
    expect(mocks.ownerAction).toHaveBeenCalledWith(who,id,1,'delete');
  });
  it('keeps database diagnostics private and preserves ownership/conflict errors',async()=>{
    mocks.mine.mockRejectedValue(new Error('mysql://private:password@server/private-table'));
    const r=await call('/mine');expect(r.status).toBe(503);expect(await r.json()).toEqual({code:'BUSINESS_STORAGE_UNAVAILABLE'});
    mocks.reviewQueue.mockRejectedValue(new BusinessError('DENIED'));expect((await call('/moderation/queue')).status).toBe(403);
    mocks.save.mockRejectedValue(new BusinessError('DUPLICATE_REVIEW_REQUIRED'));
    const duplicate=await call('/mine/'+id,{expectedRevision:0,profile:businessFixture()},'PUT');expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({code:'DUPLICATE_REVIEW_REQUIRED'});
  });
  it('does not provide photo, map submission, ownership-transfer or bulk publication APIs',async()=>{
    for(const path of ['/upload','/maps/google','/transfer','/publish-all'])expect((await call(path,{confirm:true})).status).toBe(404);
  });
});
