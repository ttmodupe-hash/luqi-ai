import { test, expect } from '@playwright/test';
test('Opportunity Compass is useful at 320px without private data or unapproved inference', async ({page}) => {
  await page.setViewportSize({width:320,height:740});
  const posts:string[]=[];
  page.on('request',req=>{if(req.method()==='POST')posts.push(req.url())});
  await page.goto('/#/start');
  await page.getByRole('link',{name:'Explore opportunities'}).click();
  await expect(page).toHaveURL(/#\/opportunities$/);
  await expect(page.getByRole('heading',{name:/Opportunity Compass/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'2027 NSFAS applications'})).toBeVisible();
  await page.getByRole('button',{name:'Select Gauteng'}).click();
  await expect(page.getByRole('status').filter({hasText:'Selected Gauteng'})).toBeVisible();
  await page.getByLabel('Opportunity category').selectOption('sponsorship');
  await expect(page.getByRole('heading',{name:'National Arts Council calls'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'2027 NSFAS applications'})).toHaveCount(0);
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
 await expect(page.getByRole('heading',{name:'2027 NSFAS applications'})).toHaveCount(0);
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


test('the real province map filters reviewed individual adverts, and never markets withdrawn posts',async({page})=>{
  const paid:string[]=[];page.on('request',req=>{if(req.method()==='POST')paid.push(req.url());});
  await page.setViewportSize({width:320,height:740});
  await page.goto('/#/opportunities');
  const records=page.getByRole('region',{name:'Individual government job matches'});
  await expect(records.getByRole('heading',{name:'Administrative Clerk: Management Support Services'})).toBeVisible();
  await page.getByRole('button',{name:'Select Gauteng'}).click();
  await expect(records.getByRole('heading',{name:'Administrative Clerk: Management Support Services'})).toBeVisible();
  await expect(records.getByRole('heading',{name:'Client Service Officer: COID'})).toHaveCount(0);
  await page.getByRole('button',{name:'Select Eastern Cape'}).click();
  await expect(records.getByRole('heading',{name:'Office Administrator'})).toBeVisible();
  await expect(records.getByRole('heading',{name:'Personnel Officer: Human Resources Management'})).toHaveCount(0);
  await records.getByLabel(/Include withdrawn posts/).check();
  const withdrawn=records.getByRole('article').filter({hasText:'Personnel Officer: Human Resources Management'});
  await expect(withdrawn.getByText(/Withdrawn by the employer/)).toBeVisible();
  await expect(withdrawn.getByRole('link',{name:'Official withdrawal notice'})).toHaveAttribute('href',/labour.gov.za\/erratum-withdrawal/);
  expect(paid).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
test('fixed job evidence checker is requested only on demand and cannot certify active hiring',async({page})=>{
 const calls:string[]=[];await page.route('**/api/v1/opportunity-watch/notices',route=>{
  calls.push(route.request().method());
  return route.fulfill({json:{checkedAt:'2026-10-29T08:00:00Z',scope:'fixed_official_individual_adverts_only',checks:[
   {id:'labour-gp-carletonville-clerk',reference:'HR4/4/4/09/47',state:'reference-and-deadline-found',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'labour-mp-sabie-coid',reference:'HR4/4/7/97',state:'publisher-unavailable',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'labour-mp-ict',reference:'HR 4/4/7/96',state:'content-unconfirmed',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'labour-ec-office-administrator',reference:'HR4/4/1/105',state:'publisher-unavailable',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'labour-kzn-employer-services',reference:'HR4/4/9/29',state:'publisher-unavailable',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'cogta-gp-scm',reference:'SSCMDSPR',state:'publisher-unavailable',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'kouga-ec-town-planner-intern',reference:'263/2026',state:'reference-and-deadline-found',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'mp-traffic-officer-learnership',reference:'DCSSL/05/2026',state:'content-unconfirmed',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'labour-gp-bronkhorstspruit-ies',reference:'HR4/4/4/08/04',state:'publisher-unavailable',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'},
   {id:'labour-ec-withdrawn-personnel',reference:'HR4/4/1/13',state:'withdrawn',checkedAt:'2026-10-29T08:00:00Z',note:'text_evidence_only_not_live_availability'}
  ]}});
 });
 await page.goto('/#/opportunities');const region=page.getByRole('region',{name:'Individual government job matches'});
 expect(calls).toEqual([]);
 await region.getByRole('button',{name:'Recheck published job notices'}).click();
 await expect(region.getByText(/Publisher text check complete/)).toBeVisible();
 const carletonville=region.getByRole('article').filter({hasText:'Administrative Clerk: Management Support Services'});
 await expect(carletonville.getByText(/matching reference and deadline/)).toBeVisible();
 await expect(carletonville.getByText(/current acceptance status must be confirmed/)).toBeVisible();
 expect(calls).toEqual(['GET']);
});

test('new official internship and learnership cards disclose pay units and evidence limits on a 320px phone',async({page})=>{
 const posts:string[]=[];page.on('request',req=>{if(req.method()==='POST')posts.push(req.url());});
 await page.setViewportSize({width:320,height:740});
 await page.goto('/#/opportunities');
 const board=page.getByRole('region',{name:'Individual government job matches'});
 const kouga=board.getByRole('article').filter({hasText:'Town Planner Internship'});
 await expect(kouga.getByText(/Advertised salary: R10\\s*000 per month/)).toBeVisible();
 await expect(kouga.getByText(/current acceptance status must be confirmed/)).toBeVisible();
 await expect(kouga.getByRole('link',{name:'Original government advert'})).toHaveAttribute('href','https://www.kouga.gov.za/vacancy/town-planner-internship');
 const learn=board.getByRole('article').filter({hasText:'Basic Traffic Officers Diploma Learnership 2026\/27'});
 await expect(learn.getByText(/Advertised stipend: R5\\s*000 per month/)).toBeVisible();
 await expect(learn.getByText(/exact cutoff time unconfirmed/)).toBeVisible();
 expect(posts).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
