import {test,expect} from '@playwright/test';
const endpoint='/api/trpc/driveSources.status';
const ids=['dmpr-fuel','sanral-notices','n3tc-updates','saws-weather','sanparks-roads','sanparks-visits'];
function status(state='disabled') {return {version:1,scope:'source-checks-not-road-conditions',state,generatedAt:new Date().toISOString(),safeToTravel:null,
 checks:ids.map(id=>({id,lastAttemptAt:null as string|null,lastSuccessAt:null as string|null,attemptState:'not-checked',contentState:'not-checked'}))};}

test('saved source status is a deliberate credential-free same-origin read',async({page})=>{
 const requests:{url:string;method:string;headers:Record<string,string>;body:string|null}[]=[];
 await page.route('**/api/trpc/driveSources.status',async route=>{const r=route.request();requests.push({url:r.url(),method:r.method(),headers:r.headers(),body:r.postData()});await route.fulfill({json:{result:{data:{json:status()}}}});});
 await page.goto('/#/drive?trail=n3');expect(requests).toHaveLength(0);
 await page.getByText('Saved source-check status',{exact:true}).click();expect(requests).toHaveLength(0);
 await page.getByRole('button',{name:'Read saved source checks'}).click();
 await expect(page.getByRole('status',{name:'Saved source connection'})).toContainText('not enabled');expect(requests).toHaveLength(1);
 expect(new URL(requests[0].url).pathname).toBe(endpoint);expect(new URL(requests[0].url).search).toBe('');expect(requests[0].method).toBe('GET');expect(requests[0].body).toBeNull();
 expect(requests[0].headers.authorization).toBeUndefined();expect(requests[0].headers.cookie).toBeUndefined();expect(requests[0].headers.referer).toBeUndefined();
});
test('failed latest attempt retains an overdue prior success on a narrow screen',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:840});
 await page.route('**/api/trpc/driveSources.status',async route=>{
  const data=status('available');data.checks[0]={id:ids[0],lastAttemptAt:new Date(Date.now()-3600000).toISOString(),lastSuccessAt:new Date(Date.now()-48*3600000).toISOString(),attemptState:'unavailable',contentState:'changed-review-required'};
  await route.fulfill({json:{result:{data:{json:data}}}});
 });
 await page.goto('/#/drive?trail=n3');await page.getByText('Saved source-check status',{exact:true}).click();await page.getByRole('button',{name:'Read saved source checks'}).click();
 await expect(page.getByText('Page bytes changed; content review required',{exact:true})).toBeVisible();await expect(page.getByText('Observation overdue for review',{exact:true})).toBeVisible();
 await expect(page.getByText(/An earlier successful timestamp is retained/)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const panel=page.locator('details').filter({has:page.getByRole('heading',{name:'See when sources were last checked'})});
 await panel.screenshot({path:testInfo.outputPath('drive-source-status-320.png')});
});
test('bad response does not break local planning and corridor change clears the status view',async({page})=>{
 await page.route('**/api/trpc/driveSources.status',route=>route.fulfill({status:500,contentType:'text/plain',body:'SECRET-DIAGNOSTIC'}));
 await page.goto('/#/drive?trail=n3');await page.getByText('Saved source-check status',{exact:true}).click();await page.getByRole('button',{name:'Read saved source checks'}).click();
 await expect(page.getByRole('status',{name:'Saved source connection'})).toContainText('could not be loaded');await expect(page.locator('body')).not.toContainText('SECRET-DIAGNOSTIC');
 await page.getByText('Smart journey planner and evidence desk',{exact:true}).click();await page.getByLabel('I am safely parked or planning before travel.').check();await expect(page.getByRole('button',{name:'Create journey brief'})).toBeVisible();
 await page.getByRole('button',{name:'N1 · Pretoria to Polokwane',exact:true}).click();
 await expect(page.getByText('Saved source-check status',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Read saved source checks'})).not.toBeVisible();
});
