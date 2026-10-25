import { describe, expect, it, vi } from 'vitest';
import { vaultClient, VaultRequestError } from '../src/lib/private-vault-client';
const id = 'da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const other = 'ba9c1eb2-62f6-45fb-b7f9-a989521270ae';
const sealed = {
  format: 'luqi.vault.sealed.v1' as const, kdf: 'PBKDF2-SHA256-310000' as const,
  salt:'AQEBAQEBAQEBAQEBAQEBAQ==',nonce:'AgICAgICAgICAgIC',
  ciphertext:'AwMDAwMDAwMDAwMDAwMDAwMDAwM=',
};
const metadata = {id,kind:'quote',revision:1,updatedAt:'2026-10-25T11:00:00.000000Z'};
const reply = (body:unknown,status=200) => new Response(JSON.stringify(body),{
  status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'},
});

describe('future vault client is authorization-scoped, no-store and always bounded', () => {
  it('makes no request on construction and uses only fixed same-origin paths', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(reply({availability:'disabled',syncing:false,subscriptionActive:false}))
      .mockResolvedValueOnce(reply({projects:[metadata]}));
    const api=vaultClient('ephemeral-test-token',fetch);
    expect(fetch).not.toHaveBeenCalled();
    expect((await api.status()).availability).toBe('disabled');
    expect((await api.list()).projects).toHaveLength(1);
    for(const [url,options] of fetch.mock.calls){
      expect(url).toMatch(/^\/api\/v1\/projects\//);
      expect(options).toMatchObject({method:'GET',cache:'no-store',credentials:'omit',redirect:'error',
        headers:{Authorization:'Bearer ephemeral-test-token',Accept:'application/json'}});
      expect(options.headers).not.toHaveProperty('Cookie');
      expect(options.headers).not.toHaveProperty('Content-Type');
    }
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('refuses injected IDs, response owners, expanded status and unsupported kinds', async () => {
    const fetch=vi.fn(); const api=vaultClient('token',fetch);
    expect(() => api.get('https://attacker.invalid')).toThrow();
    expect(() => api.get('../other')).toThrow();
    expect(() => api.create('bad', 'quote', sealed)).toThrow();
    expect(() => api.create(id,'fake' as never,sealed)).toThrow();
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce(reply({availability:'configured',storage:'connected',
      encryptedPayloadOnly:true,ownerLimit:20,subscriptionActive:true}))
      .mockResolvedValueOnce(reply({projects:[{...metadata,ownerId:33}]}))
      .mockResolvedValueOnce(reply({project:{...metadata,id:other,sealed}}));
    await expect(api.status()).rejects.toThrow();
    await expect(api.list()).rejects.toThrow();
    await expect(api.get(id,'quote')).rejects.toThrow();
  });
  it('requires exact committed creation, optimistic update and bound confirmed deletion', async () => {
    const fetch=vi.fn().mockResolvedValueOnce(reply({saved:true,id,revision:1,created:true},201))
      .mockResolvedValueOnce(reply({saved:true,id,revision:2,created:false}))
      .mockResolvedValueOnce(reply({removed:true,id}))
      .mockResolvedValueOnce(reply({removed:true,id:other}));
    const api=vaultClient('token',fetch);
    expect(await api.create(id,'quote',sealed)).toEqual({saved:true,id,revision:1,created:true});
    expect(await api.update(id,'quote',sealed,1)).toMatchObject({revision:2,created:false});
    expect(await api.remove(id,2)).toEqual({removed:true,id});
    expect(fetch.mock.calls.map(x=>x[1].method)).toEqual(['PUT','PUT','POST']);
    expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify({kind:'quote',expectedRevision:0,sealed}));
    expect(fetch.mock.calls[1][1].body).toBe(JSON.stringify({kind:'quote',expectedRevision:1,sealed}));
    expect(fetch.mock.calls[2][1].body).toBe(JSON.stringify({confirm:true,expectedRevision:2}));
    await expect(api.remove(id,2)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('does not retry after an uncertain write or reveal raw server errors', async () => {
    const request=vi.fn().mockRejectedValue(new TypeError('connection lost'));
    await expect(vaultClient('token',request).create(id,'quote',sealed)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    const bad=vi.fn().mockResolvedValue(reply({code:'mysql://secret@host'},503));
    await expect(vaultClient('token',bad).status()).rejects.toEqual(new VaultRequestError(503));
    expect(bad).toHaveBeenCalledTimes(1);
  });
  it('rejects oversized, invalid and content-type-mismatched response bodies', async () => {
    const tooLarge=vi.fn().mockResolvedValueOnce(new Response('x'.repeat(42_100),{
      headers:{'Content-Type':'application/json'},
    })).mockResolvedValueOnce(new Response('{}',{
      headers:{'Content-Type':'text/plain'},
    }));
    const api=vaultClient('token',tooLarge);
    await expect(api.status()).rejects.toThrow('PROJECT_REPLY_INVALID');
    await expect(api.status()).rejects.toThrow('PROJECT_REPLY_INVALID');
    expect(tooLarge).toHaveBeenCalledTimes(2);
  });
  it('never claims payment entitlement just because the feature is technically configured', async () => {
    const request=vi.fn().mockResolvedValue(reply({availability:'configured',storage:'connected',
      encryptedPayloadOnly:true,ownerLimit:20,subscriptionActive:false}));
    expect((await vaultClient('token',request).status()).subscriptionActive).toBe(false);
  });
});
