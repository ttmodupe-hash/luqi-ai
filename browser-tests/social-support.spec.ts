import {test,expect} from '@playwright/test';
test('SASSA guide is readable at 320px without data submission or sensitive fields',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 const posted:string[]=[];page.on('request',r=>{if(r.method()==='POST')posted.push(r.url());});
 await page.goto('/#/sassa');
 await expect(page.getByRole('heading',{name:'SASSA grants and UIF claims support'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Social Relief of Distress (SRD)'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Official SASSA SRD portal/})).toHaveAttribute('href','https://srd.sassa.gov.za/');
 await page.getByLabel('Help topic').selectOption('sassa-child');
 await expect(page.getByRole('heading',{name:'Child support grant'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(posted).toEqual([]);
});
test('UIF guide directs new claims to UIF Online, not deprecated employee uFiling',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 let posted:string[]=[];page.on('request',r=>{if(r.method()==='POST')posted.push(r.url());});
 await page.goto('/#/uif');
 await expect(page.getByRole('button',{name:'UIF benefits'})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('link',{name:/Current UIF Online employee claims/}))
  .toHaveAttribute('href','https://uifonline.labour.gov.za/uifOnline/');
 await expect(page.getByText(/not legacy uFiling/)).toBeVisible();
 await page.getByLabel('Help topic').selectOption('uif-employers');
 await expect(page.getByText(/Employer registration, declarations and contribution support/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(posted).toEqual([]);
});
test('Start and Chat expose free public support navigation',async({page})=>{
 await page.goto('/#/start');
 await page.getByRole('link',{name:/Open SASSA & UIF support/}).click();
 await expect(page).toHaveURL(/#\/social-support$/);
 await page.goto('/#/chat');
 await page.getByText('Browse free Luqi guides',{exact:true}).click();
 await page.getByRole('link',{name:/SASSA grants, UIF claims, status and appeals/}).click();
 await expect(page).toHaveURL(/#\/social-support$/);
 await expect(page.getByRole('heading',{name:'SASSA grants and UIF claims support'})).toBeVisible();
});

test('SASSA, UIF and combined help disclose expired review without a daily-watch promise at 320px',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-09T15:00:00+02:00'));
 await page.setViewportSize({width:320,height:740});
 const posted:string[]=[];
 page.on('request',r=>{if(r.method()==='POST')posted.push(r.url());});
 for(const route of ['social-support','sassa','uif']){
  await page.goto('/#/'+route);
  await expect(page.getByText(/Use these steps to prepare your enquiry, and verify current rates/)).toBeVisible();
  await expect(page.getByText(/Luqi does not access your agency account or continuously update these instructions/)).toBeVisible();
  await expect(page.getByText(/past their review window/)).toBeVisible();
  await expect(page.getByText(/separate daily official-source review/)).toHaveCount(0);
  await expect(page.getByRole('link',{name:/official website/}).first()).toHaveAttribute('rel','noopener noreferrer');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.getByRole('button',{name:'SASSA grants'}).focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'SASSA grants'})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Help topic').selectOption('sassa-status');
 await expect(page.getByRole('heading',{name:'SASSA status, payments and appeals'})).toBeVisible();
 expect(posted).toEqual([]);
});
