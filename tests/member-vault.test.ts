import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const mocks=vi.hoisted(()=>({
  auth:vi.fn(),status:vi.fn(),create:vi.fn(),list:vi.fn(),get:vi.fn(),
  update:vi.fn(),remove:vi.fn(),
}));
vi.mock('../api/services/pilotAuth',()=>({
  authenticatePilotUser:mocks.auth,
  PilotAuthError:class extends Error{
    constructor(public readonly code:string){super(code);}
  },
}));
vi.mock('../api/services/memberVaultStore',()=>({memberVaultStore:mocks}));
import { memberVault as app } from '../api/member-vault';
import { VaultError } from '../api/services/memberVaultContract';
const id='da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const quote={businessName:'LUQI Studio',customerName:'Sample client',reference:'Q-1',
  rows:[{description:'Workshop',quantity:2,unitPriceZar:'150.00'}]};
const draft={title:'Sample quotation',quote};
function req(path:string,method:string,body?:unknown){
  return app.request(path,{method,headers:{'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
}
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue(7);
  vi.stubEnv('LUQI_MEMBER_VAULT_ENABLED','true');});
afterEach(()=>vi.unstubAllEnvs());
describe('fail-closed member project API',()=>{
  it('authenticates before status or storage and never discloses membership anonymously',async()=>{
    mocks.auth.mockRejectedValue(new Error('missing JWT'));
    for(const path of ['/status','/', '/'+id]){
      const r=await req(path,'GET');
      expect(r.status).toBe(401);
      expect(r.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(mocks.status).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('remains disabled by default even for a valid logged-in user',async()=>{
    vi.stubEnv('LUQI_MEMBER_VAULT_ENABLED','');
    const status=await req('/status','GET');
    expect(await status.json()).toEqual({enabled:false,member:false});
    expect((await req('/','POST',draft)).status).toBe(503);
    expect((await req('/','GET')).status).toBe(503);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('validates bounded quote contents and rejects caller owner and plan fields',async()=>{
    for(const payload of [
      {...draft,userId:99},{...draft,plan:'creator'},
      {...draft,quote:{...quote,customerName:'Client\nPAID'}},
      {...draft,quote:{...quote,rows:[]}},
      {...draft,quote:{...quote,rows:[{description:'Service',quantity:1,unitPriceZar:'12.345'}]}},
    ])expect((await req('/','POST',payload)).status).toBe(400);
    expect((await req('/?owner_id=2','POST',draft)).status).toBe(400);
    expect((await req('/invalid','GET')).status).toBe(400);
    expect((await req('/'+id,'PUT',{...draft,expectedRevision:1,owner:4})).status).toBe(400);
    expect((await req('/'+id,'DELETE',{confirm:false,expectedRevision:1})).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('returns owner-scoped create, list, optimistic edit and explicit deletion',async()=>{
    const project={id,title:draft.title,quote,revision:1};
    mocks.create.mockResolvedValue(project);
    mocks.list.mockResolvedValue([{id,title:draft.title,revision:1}]);
    mocks.get.mockResolvedValue(project);
    mocks.update.mockResolvedValue({...project,revision:2});
    mocks.remove.mockResolvedValue({id,deleted:true});
    expect((await req('/','POST',draft)).status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(7,draft);
    expect((await req('/','GET')).status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(7);
    expect((await req('/'+id,'GET')).status).toBe(200);
    expect(mocks.get).toHaveBeenCalledWith(7,id);
    expect((await req('/'+id,'PUT',{...draft,expectedRevision:1})).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(7,id,1,draft);
    const removed=await req('/'+id,'DELETE',{confirm:true,expectedRevision:2});
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({id,deleted:true});
    expect(mocks.remove).toHaveBeenCalledWith(7,id,2);
  });
  it('does not leak private MySQL errors or invent successful membership',async()=>{
    mocks.create.mockRejectedValue(new Error('mysql://private-secret@host'));
    let r=await req('/','POST',draft);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({code:'MEMBER_VAULT_STORAGE_UNAVAILABLE'});
    mocks.create.mockRejectedValue(new VaultError('MEMBERSHIP_REQUIRED'));
    r=await req('/','POST',draft);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({code:'MEMBERSHIP_REQUIRED'});
    mocks.remove.mockResolvedValue({id,deleted:false});
    r=await req('/'+id,'DELETE',{confirm:true,expectedRevision:1});
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({code:'MEMBER_VAULT_STORAGE_UNAVAILABLE'});
  });
});
