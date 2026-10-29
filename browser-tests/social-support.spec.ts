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
 await page.getByRole('link',{name:/SASSA grants, UIF claims, status and appeals/}).click();
 await expect(page).toHaveURL(/#\/social-support$/);
});
