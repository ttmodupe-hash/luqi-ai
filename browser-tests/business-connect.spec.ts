import {test,expect} from '@playwright/test';
import {businessFixture,ownedBusinessFixture} from '../tests/fixtures/business-connect';
import {publicBusiness} from '../contracts/businessConnect';

test('Business Connect keeps home-based drafts private at 320px using one existing Luqi login',async({page,baseURL})=>{
  if(baseURL!=='http://127.0.0.1:4173')throw Error('Business Connect acceptance requires the disposable loopback container');
  await page.setViewportSize({width:320,height:740});
  const forbidden:string[]=[],writes:unknown[]=[];let loginCount=0,saved=ownedBusinessFixture(),hasDraft=false;
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!==baseURL){forbidden.push(url.origin);return route.abort();}
    if(!url.pathname.startsWith('/api/'))return route.continue();
    if(url.pathname==='/api/v1/auth/login'){
      loginCount++;return route.fulfill({json:{token:'isolated-business-browser-token',user:{email:'business-browser@example.invalid',name:'Synthetic Owner'}}});
    }
    const path=url.pathname.replace('/api/v1/business-connect','');
    if(url.pathname.startsWith('/api/v1/business-connect')){
      if(path==='/status')return route.fulfill({json:{enabled:true,publicDirectory:false,mode:'authenticated_preview'}});
      expect(req.headers()['authorization']).toBe('Bearer isolated-business-browser-token');
      if(path==='/mine'&&req.method()==='GET')return route.fulfill({json:{businesses:hasDraft?[saved]:[],canReview:false}});
      if(req.method()==='PUT'&&path.startsWith('/mine/')){
        const body=req.postDataJSON();writes.push(body);saved={...saved,id:path.split('/').pop()!,profile:body.profile};hasDraft=true;
        return route.fulfill({json:{business:saved}});
      }
      if(path==='/directory')return route.fulfill({json:{businesses:[],nextPage:null}});
      forbidden.push(path);return route.abort();
    }
    // Other signed-in tools may read their availability; no AI/message/payment
    // POST is allowed or sent to a live backend in this synthetic acceptance.
    if(req.method()!=='GET')forbidden.push(req.method()+' '+url.pathname);
    return route.fulfill({status:503,json:{code:'SYNTHETIC_BACKEND_UNAVAILABLE'}});
  });
  await page.goto('/#/login');await page.getByLabel('Email',{exact:true}).fill('business-browser@example.invalid');
  await page.getByLabel('Password',{exact:true}).fill('Synthetic-browser-passphrase');
  await page.locator('.luqi-access').getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/#\/chat$/);
  await page.evaluate(()=>{window.location.hash='#/business-connect';});
  await page.getByRole('button',{name:'My businesses',exact:true}).click();
  const beforeEditor=await page.evaluate(()=>document.documentElement.scrollWidth);
  await page.getByRole('button',{name:'Add your business',exact:true}).click();
  await page.getByLabel('Owner-confirmed business name',{exact:false}).fill('Private Browser Business');
  await page.getByLabel('Public trading name',{exact:true}).fill('Village Repairs');
  await page.getByLabel('Business description',{exact:true}).fill('Clothing repairs for our local community.');
  await page.getByLabel('Services and optional prices',{exact:false}).fill('Clothing repairs | R50');
  await page.getByLabel('Township, town or village',{exact:true}).fill('Mabopane');
  await page.getByLabel('How you trade',{exact:true}).selectOption('home_based');
  await page.getByLabel('Public service area',{exact:true}).fill('Mabopane and Soshanguve');
  await expect(page.getByLabel('Optional public latitude')).toHaveCount(0);await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(page.getByLabel('I approve public display',{exact:false})).not.toBeChecked();
  await page.getByLabel('I own this business',{exact:false}).check();await page.getByLabel('I consent to Luqi storing',{exact:false}).check();
  const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,
    overflow:[...document.querySelectorAll('body *')].map(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return {tag:el.tagName,class:el.getAttribute('class'),label:el.getAttribute('aria-label'),right:r.right,width:r.width,
        scroll:el.scrollWidth,client:el.clientWidth,display:s.display,visibility:s.visibility,whiteSpace:s.whiteSpace,minInlineSize:s.minInlineSize};
    }).filter(el=>el.width>0&&el.visibility!=='hidden'&&(el.right>innerWidth+1||el.scroll>el.client+1)).slice(-20)}));
  expect(layout.width,JSON.stringify({...layout,beforeEditor})).toBeLessThanOrEqual(layout.viewport+1);
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByText('Private draft saved. Preview the public details before sending for review.')).toBeVisible();
  await expect(page.getByText('Private Browser Business',{exact:true})).toHaveCount(0);
  expect(loginCount).toBe(1);expect(writes).toHaveLength(1);expect((writes[0] as {profile:ReturnType<typeof businessFixture>}).profile.consent.publicListing).toBe(false);
  expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
  expect(forbidden).toEqual([]);
});

test('shareable public business pages expose only owner-selected contacts without loading external maps',async({page,baseURL})=>{
  if(baseURL!=='http://127.0.0.1:4173')throw Error('Loopback only');
  const b=publicBusiness(ownedBusinessFixture()),external:string[]=[];
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!==baseURL){external.push(url.origin);return route.abort();}
    if(url.pathname.endsWith('/business-connect/status'))return route.fulfill({json:{enabled:true,publicDirectory:true,mode:'public'}});
    if(url.pathname.endsWith('/directory/'+b.id))return route.fulfill({json:{business:b}});
    if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{code:'SYNTHETIC_UNAVAILABLE'}});
    return route.continue();
  });
  await page.goto('/#/business-connect/'+b.id);await expect(page.getByRole('heading',{name:b.tradingName,exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'WhatsApp business',exact:true})).toHaveAttribute('href','https://wa.me/27825550102');
  await expect(page.getByRole('link',{name:'Call business',exact:true})).toHaveCount(0);
  await expect(page.getByText('Private Sewing Enterprise',{exact:true})).toHaveCount(0);
  await expect(page.getByText('External map listing not checked',{exact:true})).toBeVisible();
  expect(external).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
