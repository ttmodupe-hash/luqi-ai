import {afterEach,it,expect,vi} from 'vitest';
import {businessRequest,businessResponses,businessNavigationLink,businessSharePath} from '../src/lib/business-connect';
import {publicBusiness} from '../contracts/businessConnect';
import {ownedBusinessFixture} from './fixtures/business-connect';
afterEach(()=>vi.unstubAllGlobals());
it('uses only first-party requests with credentials in memory and no automatic retry',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({businesses:[],nextPage:null}),{headers:{'Content-Type':'application/json'}}));
  vi.stubGlobal('fetch',fetch);
  expect(await businessRequest('/directory?q=sewing','synthetic-token',businessResponses.directory)).toEqual({businesses:[],nextPage:null});
  expect(fetch).toHaveBeenCalledTimes(1);const [path,options]=fetch.mock.calls[0];
  expect(path).toBe('/api/v1/business-connect/directory?q=sewing');expect(options.credentials).toBe('omit');expect(options.headers.Authorization).toBe('Bearer synthetic-token');
  expect(path).not.toContain('token');
  await expect(businessRequest('https://external.example',undefined,businessResponses.status)).rejects.toThrow('Invalid business path');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('rejects unsafe contact responses and keeps navigation separate from external listing claims',()=>{
  const p=publicBusiness(ownedBusinessFixture());expect(businessNavigationLink(p)).toBeNull();
  expect(businessResponses.page.safeParse({business:{...p,contacts:{website:'javascript:alert(1)'}}}).success).toBe(false);
  const point={...p,kind:'storefront' as const,publicPoint:{latitude:-25.6,longitude:28.1}};
  expect(businessNavigationLink(point)).toBe('https://www.google.com/maps/dir/?api=1&destination=-25.6%2C28.1');
  expect(point.verification.providerListing).toBe('not_checked');
  expect(businessSharePath(p.id)).toBe('/business-connect/'+p.id);expect(()=>businessSharePath('secret#token')).toThrow();
});
it('fails closed on HTTP errors and malformed JSON without treating a write as confirmed',async()=>{
  const request=vi.fn().mockResolvedValueOnce(new Response('',{status:409})).mockResolvedValueOnce(new Response('{broken',{headers:{'Content-Type':'application/json'}}));
  vi.stubGlobal('fetch',request);
  await expect(businessRequest('/mine/4f147685-bad5-46dd-8520-1167d22bd41a','token',businessResponses.saved,{expectedRevision:1},'PUT')).rejects.toThrow('changed or matches');
  await expect(businessRequest('/status',undefined,businessResponses.status)).rejects.toThrow('Invalid notes response');
  expect(request).toHaveBeenCalledTimes(2);
});
