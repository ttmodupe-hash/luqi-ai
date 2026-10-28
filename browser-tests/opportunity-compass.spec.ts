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

test('Luqi explains government application steps with original Z83 source, locally at 320px',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 const unwanted:string[]=[];
 page.on('request',request=>{
   if(request.method()!=='GET'||/\/api\/v1\/(?:luqi-core|guest-chat)/.test(request.url()))unwanted.push(request.url());
 });
 await page.goto('/#/opportunities');
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Public Service Vacancy Circular 38 of 2026'})});
 await card.getByText('How to verify and apply with Luqi').click();
 await expect(card.getByRole('region',{name:'Verify the original opportunity'})).toBeVisible();
 await expect(card.getByRole('region',{name:'Official application steps'})).toBeVisible();
 await expect(card.getByRole('link',{name:/DPSA public service vacancy instructions and current Z83/}))
   .toHaveAttribute('href','https://www.dpsa.gov.za/newsroom/psvc/');
 await card.getByRole('textbox',{name:/Your question/}).fill('How do I apply?');
 await card.getByRole('button',{name:'Luqi, explain the verified steps'}).click();
 await expect(card.getByRole('status').getByText(/advertising department, not DPSA/)).toBeVisible();
 await expect(card.getByRole('status').getByRole('link',{name:'Check the official source for this answer'}))
   .toHaveAttribute('href',/dpsa.gov.za/);
 expect(unwanted).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
test('Luqi explains a dated NSFAS source without claiming an open application',async({page})=>{
 await page.goto('/#/opportunities');
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'2027 NSFAS applications'})});
 await card.getByText('How to verify and apply with Luqi').click();
 await card.getByRole('textbox',{name:/Your question/}).fill('Is it still open?');
 await card.getByRole('button',{name:'Luqi, explain the verified steps'}).click();
 await expect(card.getByRole('status').getByText(/not proof the portal is accepting submissions now/)).toBeVisible();
 await expect(card.getByRole('status').getByText(/2026-10-31/)).toBeVisible();
});
