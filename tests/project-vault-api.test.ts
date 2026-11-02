import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), status: vi.fn(), list: vi.fn(), get: vi.fn(), save: vi.fn(), remove: vi.fn(),
}));
vi.mock('../api/services/pilotAuth', () => ({
  authenticatePilotUser: mocks.auth,
  PilotAuthError: class extends Error { constructor(public code: string) { super(code); } },
}));
vi.mock('../api/services/projectVaultStore', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/services/projectVaultStore')>()),
  projectVaultStore: mocks,
}));
import { privateProjectVault as app } from '../api/private-project-vault';
import { ProjectVaultError } from '../api/services/projectVaultStore';

const id = 'da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const sealed = {
  format: 'luqi.vault.sealed.v1',
  kdf: 'PBKDF2-SHA256-310000',
  salt: Buffer.alloc(16, 7).toString('base64'),
  nonce: Buffer.alloc(12, 8).toString('base64'),
  ciphertext: Buffer.alloc(20, 9).toString('base64'),
};
const put = (path: string, data: unknown, contentType = 'application/json') =>
  app.request(path, { method:'PUT',headers:{'Content-Type':contentType},body:JSON.stringify(data) });
const post = (path: string, data: unknown) =>
  app.request(path, { method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(data) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('LUQI_PROJECT_VAULT_ENABLED', 'true');
  mocks.auth.mockResolvedValue(17);
});
afterEach(() => vi.unstubAllEnvs());
describe('private encrypted-project API access control', () => {
  it('authenticates before disclosing disabled status or touching storage', async () => {
    mocks.auth.mockRejectedValue(new Error('AUTH_REQUIRED'));
    for (const [method,path] of [['GET','/status'],['GET','/'],['PUT','/'+id],['POST','/'+id+'/remove']] as const) {
      const response = await app.request(path, {method});
      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    for(const fn of [mocks.status,mocks.list,mocks.get,mocks.save,mocks.remove]) expect(fn).not.toHaveBeenCalled();
  });
  it('defaults closed and does not access database for disabled users', async () => {
    vi.stubEnv('LUQI_PROJECT_VAULT_ENABLED','');
    const status = await app.request('/status');
    expect(status.status).toBe(200);
    expect(await status.json()).toEqual({ availability:'disabled', syncing:false, subscriptionActive:false });
    const save = await put('/'+id,{kind:'quote',expectedRevision:0,sealed});
    expect(save.status).toBe(503);
    expect(await save.json()).toEqual({code:'PROJECT_VAULT_DISABLED'});
    for(const fn of [mocks.status,mocks.list,mocks.get,mocks.save,mocks.remove]) expect(fn).not.toHaveBeenCalled();
  });
  it('only returns configured storage status, not fabricated subscriber identity', async () => {
    mocks.status.mockResolvedValue({availability:'configured',storage:'connected',
      encryptedPayloadOnly:true,ownerLimit:20});
    const response = await app.request('/status');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ availability:'configured',storage:'connected',
      encryptedPayloadOnly:true,ownerLimit:20,subscriptionActive:false });
    expect(mocks.status).toHaveBeenCalledTimes(1);
    expect((await app.request('/status?tier=creator')).status).toBe(400);
  });
  it('refuses extra owner fields, secrets, unknown kinds and unconfirmed saves', async () => {
    const good = {kind:'quote',expectedRevision:0,sealed};
    for(const bad of [
      {...good,ownerId:18},{...good, plaintext:'private business data'},
      {...good,kind:'image'}, {...good,expectedRevision:-1},
      {...good,sealed:{...sealed,passphrase:'secret'}},
    ]) expect((await put('/'+id,bad)).status).toBe(400);
    expect((await put('/'+id,good,'text/plain')).status).toBe(400);
    expect((await put('/'+id+'?owner=18',good)).status).toBe(400);
    expect((await put('/not-an-id',good)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    mocks.save.mockResolvedValueOnce({saved:true,id:'ba9c1eb2-62f6-45fb-b7f9-a989521270ae',revision:1,created:true});
    const result = await put('/'+id,good);
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({code:'PROJECT_STORAGE_UNAVAILABLE'});
  });
  it('creates and updates only with explicit revisions; passes account ID from verified auth', async () => {
    mocks.save.mockResolvedValueOnce({saved:true,id,revision:1,created:true})
      .mockResolvedValueOnce({saved:true,id,revision:2,created:false});
    const created = await put('/'+id,{kind:'quote',expectedRevision:0,sealed});
    expect(created.status).toBe(201);
    const updated = await put('/'+id,{kind:'quote',expectedRevision:1,sealed});
    expect(updated.status).toBe(200);
    expect(mocks.save.mock.calls.map(call => call[0])).toEqual([17,17]);
    expect(mocks.save.mock.calls.map(call => call[1])).toEqual([id,id]);
  });
  it('requires separate confirmed deletion, retains typed conflicts and never leaks errors', async () => {
    for(const body of [{}, {confirm:false,expectedRevision:1}, {confirm:true,expectedRevision:0},
      {confirm:true,expectedRevision:1,ownerId:19}]) expect((await post('/'+id+'/remove',body)).status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.remove.mockResolvedValueOnce({removed:true,id});
    const removed = await post('/'+id+'/remove',{confirm:true,expectedRevision:1});
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({removed:true,id});
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(17,id,1);
    mocks.remove.mockRejectedValueOnce(new ProjectVaultError('PROJECT_CONFLICT'));
    const conflict = await post('/'+id+'/remove',{confirm:true,expectedRevision:1});
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({code:'PROJECT_CONFLICT'});
    mocks.remove.mockRejectedValueOnce(new Error('mysql://private-customer-secret'));
    const error = await post('/'+id+'/remove',{confirm:true,expectedRevision:1});
    expect(error.status).toBe(503);
    expect(await error.json()).toEqual({code:'PROJECT_STORAGE_UNAVAILABLE'});
  });
  it('refuses to expose payment, admin or arbitrary share operations', async () => {
    for (const path of ['/checkout','/subscribe','/admin','/'+id+'/share','/'+id+'/run']) {
      expect((await post(path,{confirm:true})).status).toBe(404);
    }
  });
});
