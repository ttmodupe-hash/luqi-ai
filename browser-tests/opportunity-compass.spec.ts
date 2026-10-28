import { test, expect } from '@playwright/test';
test('Opportunity Compass is useful at 320px without private data or unapproved inference', async ({page}) => {
  await page.setViewportSize({width:320,height:740});
  const posts:string[]=[];
  page.on('request',req=>{if(req.method()==='POST')posts.push(req.url())});
  await page.goto('/#/start');
  await page.getByRole('link',{name:'Explore opportunities'}).click();
  await expect(page).toHaveURL(/#\/opportunities$/);
  await expect(page.getByRole('heading',{name:/Opportunity Compass/})).toBeVisible();
  await expect(page.getByText('2027 NSFAS applications')).toBeVisible();
  await page.getByRole('button',{name:'Select Gauteng'}).click();
  await expect(page.getByRole('status').filter({hasText:'Selected Gauteng'})).toBeVisible();
  await page.getByLabel('Opportunity category').selectOption('sponsorship');
  await expect(page.getByText('National Arts Council calls')).toBeVisible();
  await expect(page.getByText('2027 NSFAS applications')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  expect(posts).toEqual([]);
});
test('read-only publisher monitor is only called after visitor clicks and never claims real vacancies', async ({page}) => {
 const requests:string[]=[];
 await page.route('**/api/v1/opportunity-watch',route=>{
   requests.push(route.request().method());
   return route.fulfill({json:{status:'sources_checked',scope:'publisher-pages-only',checkedAt:'2026-10-28T16:00:00Z',sources:[
     {id:'gov-jobs',status:'reachable',checkedAt:'2026-10-28T16:00:00Z',publication:'Public Service Vacancy Circular 38 of 2026'},
     {id:'nyda',status:'unavailable',checkedAt:'2026-10-28T16:00:00Z'},
     {id:'nrf',status:'reachable',checkedAt:'2026-10-28T16:00:00Z'}
   ]}});
 });
 await page.goto('/#/opportunities');
 expect(requests).toEqual([]);
 await page.getByRole('button',{name:'Check official source pages'}).click();
 await expect(page.getByText(/Publisher-page check completed/)).toBeVisible();
 await expect(page.getByRole('region',{name:'Official opportunity source monitor'}).getByText(/Circular 38 of 2026/)).toBeVisible();
 expect(requests).toEqual(['GET']);
 await expect(page.getByText(/does not mean an advertised position is open/)).toBeVisible();
});
test('other country choice does not fabricate 54-country opportunities',async({page})=>{
 await page.goto('/#/opportunities');
 await page.getByLabel('Country view').selectOption('KE');
 await expect(page.getByText(/Opportunities for Kenya have not been sourced and reviewed yet/)).toBeVisible();
 await expect(page.getByText('2027 NSFAS applications')).toHaveCount(0);
});
test('Chat links directly to opportunities without a paid provider request',async({page})=>{
 const paid:string[]=[];
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/v1\/luqi-core/.test(req.url()))paid.push(req.url())});
 await page.goto('/#/chat');
 await page.getByRole('link',{name:/Government jobs, youth funding, bursaries and graduates/}).click();
 await expect(page).toHaveURL(/#\/opportunities$/);
 expect(paid).toEqual([]);
});
