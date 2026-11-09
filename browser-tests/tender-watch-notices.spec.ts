import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-09T09:00:00+02:00'));
 if(process.env.LUQI_BROWSER_BASE_URL){
  // Explicit live-release acceptance may read only the canonical public UI.
  // Block APIs, external sites and every mutation before a request is sent.
  expect(process.env.LUQI_BROWSER_BASE_URL).toBe('https://app.luqi-ai.com');
  await page.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());
   if(!['GET','HEAD'].includes(req.method())||url.origin!=='https://app.luqi-ai.com'||url.pathname.startsWith('/api/'))return route.abort('blockedbyclient');
   return route.continue();
  });
 }
});

test('watch handoff shows pending-document advertisements with working 320px filters and no applicant requests',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:900});
 const unsafeRequests:string[]=[];
 page.on('request',req=>{
  if(req.method()!=='GET'||/\/api\/v1\/luqi-core|dikgatlong\.gov\.za/.test(req.url()))unsafeRequests.push(req.url());
 });
 await page.goto('/#/tenders');
 const watch=page.getByRole('region',{name:'Upcoming procurement · documents pending'});
 await expect(watch.getByRole('status',{name:'Matched watch notice count'})).toContainText('2 advertisements');
 await expect(watch.getByText('Documents pending · not bid-ready',{exact:true})).toHaveCount(2);
 await expect(watch.getByText(/latest release recheck could not retrieve/)).toBeVisible();
 await expect(watch.getByRole('button')).toHaveCount(0);
 await expect(watch.getByText('Estimated contract value: not stated.',{exact:true})).toHaveCount(2);
 await watch.getByLabel('Province for watch notices').selectOption('GP');
 await expect(watch.getByRole('article')).toHaveCount(0);
 await watch.getByLabel('Province for watch notices').selectOption('NC');
 await watch.getByLabel('Search watch reference, area or service').fill('T10/2026/27');
 await expect(watch.getByRole('article')).toHaveCount(1);
 const water=watch.getByRole('article');
 await expect(water.getByRole('heading')).toContainText('Delportshoop');
 await expect(water.getByText(/2026-12-18 10:00 SAST/)).toBeVisible();
 await expect(water.getByRole('link',{name:'Original advertisement',exact:true})).toHaveAttribute('href',/download=382:/);
 await expect(water.getByRole('link',{name:'Original advertisement',exact:true})).toHaveAttribute('rel','noopener noreferrer');
 const summary=water.locator('summary');
 await summary.focus();await page.keyboard.press('Enter');
 await expect(water.getByText(/Full bid book advertised as free to download/)).toBeVisible();
 await watch.getByLabel('Search watch reference, area or service').fill('wastewater');
 await expect(watch.getByRole('heading')).toHaveCount(2);
 const sewage=watch.getByRole('article');
 await expect(sewage.getByRole('heading')).toContainText('T01/2026/27');
 await sewage.locator('summary').click();
 await expect(sewage.getByText(/R550 for the tender book/)).toBeVisible();
 await expect(sewage.getByText(/This is a document fee, not the contract value/)).toBeVisible();
 await watch.getByLabel('Search watch reference, area or service').fill('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(unsafeRequests).toEqual([]);
 await watch.screenshot({path:testInfo.outputPath('tender-watch-320px.png')});
});

test('calendar passage requires source review and never manufactures full-document verification',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-13T10:00:00+02:00'));
 await page.goto('/#/tenders');
 const watch=page.getByRole('region',{name:'Upcoming procurement · documents pending'});
 await expect(watch.getByText('Source recheck required · not bid-ready',{exact:true})).toHaveCount(2);
 await expect(watch.getByRole('button')).toHaveCount(0);
});

test('exact compulsory briefing cutoff hides the notice unless history is deliberately requested',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-20T10:00:00+02:00'));
 await page.goto('/#/tenders');
 const watch=page.getByRole('region',{name:'Upcoming procurement · documents pending'});
 await expect(watch.getByRole('article')).toHaveCount(1);
 await expect(watch.getByRole('heading',{name:/T01\/2026\/27/})).toHaveCount(0);
 await watch.getByLabel('Include closed watch notices and past compulsory briefings').check();
 await expect(watch.getByText('Compulsory briefing has passed · historical for new bidders',{exact:true})).toBeVisible();
 await expect(watch.getByRole('article')).toHaveCount(2);
});

test('closed notices stay out of default results and display explicit history labels',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-12-19T09:00:00+02:00'));
 await page.goto('/#/tenders');
 const watch=page.getByRole('region',{name:'Upcoming procurement · documents pending'});
 await expect(watch.getByRole('article')).toHaveCount(0);
 await watch.getByLabel('Include closed watch notices and past compulsory briefings').check();
 await expect(watch.getByText('Advertised closing time passed · historical only',{exact:true})).toHaveCount(2);
});
