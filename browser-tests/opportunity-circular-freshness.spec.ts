import {test,expect} from '@playwright/test';
test('Opportunity Compass distinguishes latest DPSA issue from individually open jobs',async({page})=>{
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
 await page.setViewportSize({width:320,height:720});
 await page.goto('/#/opportunities');
 await expect(page.getByRole('heading',{name:'Public Service Vacancy Circular 40 of 2026'})).toBeVisible();
 await expect(page.getByText(/Publisher posting: 2026-11-06/)).toBeVisible();
 await expect(page.getByText(/superseded by later Circulars 39 and 40/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(writes).toEqual([]);
});
