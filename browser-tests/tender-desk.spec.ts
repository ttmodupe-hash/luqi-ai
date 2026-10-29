import {test,expect} from '@playwright/test';
test('Luqi public tenders are discoverable at 320px without account or paid calls',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 const calls:string[]=[];
 page.on('request',request=>{if(request.method()==='POST'||/\/api\/v1\/luqi-core/.test(request.url()))calls.push(request.url())});
 await page.goto('/#/start');
 await page.getByRole('link',{name:'Open Tender Desk'}).click();
 await expect(page).toHaveURL(/#\/tenders$/);
 await expect(page.getByRole('heading',{name:/Find tenders/})).toBeVisible();
 await expect(page.getByRole('link',{name:'Open official source'}).first()).toHaveAttribute('href',/etenders\.gov\.za/);
 await expect(page.getByRole('heading',{name:/Lead bond arranger/})).toBeVisible();
 await page.getByLabel('Search tender notices').fill('sign language');
 await expect(page.getByRole('heading',{name:/South African Sign Language/})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Lead bond arranger/})).toHaveCount(0);
 expect(calls).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('no official tender is filed, and applicant approvals are required for reviewed pack handoff',async({page})=>{
 const calls:string[]=[];
 page.on('request',req=>{if(req.method()!=='GET')calls.push(req.method()+' '+new URL(req.url()).pathname)});
 await page.goto('/#/tenders');
 const tender=page.getByRole('article').filter({has:page.getByRole('heading',{name:/Contractor-development mentorship/})});
 await tender.getByRole('button',{name:'Prepare bidder worksheet for this tender'}).click();
 const assistant=page.getByRole('region',{name:'Luqi assisted tender preparation'});
 await expect(assistant.getByRole('textbox',{name:'Official tender reference'})).toHaveValue('PS-REDP 17-2026');
 await expect(assistant.getByRole('button',{name:'Export human-approved preparation pack'})).toBeDisabled();
 await assistant.getByLabel('Bidder trading name').fill('Test supplier (synthetic)');
 await assistant.getByLabel('Your truthful response to the tender scope').fill('Factual service response for this synthetic test');
 await assistant.getByLabel('How you propose to deliver the work').fill('Documented delivery method');
 await assistant.getByLabel('Actual related experience you can substantiate').fill('Two example projects to verify');
 await assistant.getByLabel('Pricing assumptions, exclusions and tax basis for review').fill('Actual offer figures require approval');
 await assistant.getByLabel('Bid price in rand').fill('125000.00');
 await assistant.getByLabel('Confirmed tender submission method').selectOption('physical');
 await expect(assistant.getByRole('button',{name:'Export human-approved preparation pack'})).toBeDisabled();
 const approvalSection=assistant.getByRole('region',{name:'Mandatory human tender approvals'});
 const checkboxes=approvalSection.getByRole('checkbox');
 await expect(checkboxes).toHaveCount(7);
 const n=await checkboxes.count();
 for(let i=0;i<n;i++)await checkboxes.nth(i).check();
 await expect(assistant.getByText('Human-reviewed preparation pack ready to export')).toBeVisible();
 const download=page.waitForEvent('download');
 await assistant.getByRole('button',{name:'Export human-approved preparation pack'}).click();
 const file=await download;
 expect(file.suggestedFilename()).toContain('luqi-tender-preparation-');
 const stream=await file.createReadStream();let content='';
 if(stream)for await(const chunk of stream)content+=chunk.toString('utf-8');
 expect(content).toContain('NOT AN OFFICIAL TENDER FORM');
 expect(content).toContain('Luqi has NOT applied');
 expect(content).toContain('PS-REDP 17-2026');
 expect(calls).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('missed compulsory briefing and past tender deadlines are never promoted as open',async({page})=>{
 await page.goto('/#/tenders');
 await expect(page.getByRole('heading',{name:/Electrical maintenance, repairs/})).toHaveCount(0);
 await page.getByRole('checkbox',{name:/Show expired tenders/}).check();
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:/Electrical maintenance, repairs/})});
 await expect(card.getByText(/Past compulsory briefing/)).toBeVisible();
 await card.getByRole('button',{name:'Prepare bidder worksheet for this tender'}).click();
 await expect(page.getByRole('status',{name:'Tender preparation readiness'})).toContainText('Past compulsory briefing');
});

test('on-demand tender monitor checks only fixed first-party GET and never claims an open bid',async({page})=>{
 const methods:string[]=[];
 await page.route('**/api/v1/tender-watch',route=>{
  methods.push(route.request().method());
  const ids=['dsbd-msme-market-access','dsbd-localisation-evaluation','ekurhuleni-ps-f-02',
   'gcis-sasl-012','tshwane-gpm04','tshwane-hd01','ekurhuleni-ps-redp17','ekurhuleni-aws08'];
  const date='2026-10-29T08:00:00Z';
  return route.fulfill({json:{status:'publisher-pages-checked',scope:'fixed_official_tender_pages',checkedAt:date,
   notices:ids.map(id=>({id,checkedAt:date,note:'not_live_bid_availability',
    state:id==='ekurhuleni-ps-f-02'?'reference-visible':'listing-only'}))}});
 });
 await page.goto('/#/tenders');
 expect(methods).toEqual([]);
 await page.getByRole('button',{name:'Check tender notice sources'}).click();
 const region=page.getByRole('region',{name:'Official tender source monitor'});
 await expect(region.getByText(/Source text checked/)).toBeVisible();
 const bond=page.getByRole('article').filter({has:page.getByRole('heading',{name:/Lead bond arranger/})});
 await expect(bond.getByText(/Tender number and closing date appear on the source/)).toBeVisible();
 await expect(bond.getByText(/Source-listed; issuer confirmation required/)).toBeVisible();
 expect(methods).toEqual(['GET']);
});
