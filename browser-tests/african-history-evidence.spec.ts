import {test,expect} from '@playwright/test';
test('mobile African history guide shows linked evidence, no provider writes',async({page})=>{
 await page.setViewportSize({width:320,height:730});
 const writes:string[]=[];
 page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
 await page.goto('/#/comparative-evidence');
 const region=page.getByRole('region',{name:'African history and Islamic scholarship'});
 await expect(region.getByRole('heading',{name:'Africa, Islam and intellectual networks'})).toBeVisible();
 await region.getByRole('group',{name:'African history questions'}).getByRole('button',{name:'What was studied in Timbuktu?'}).click();
 await expect(region.getByText(/Surviving catalogued manuscripts/)).toBeVisible();
 await region.getByRole('button',{name:'Explore deeper context'}).click();
 await expect(region.getByText(/horoscope material/)).toBeVisible();
 await expect(region.getByRole('link',{name:'Arithmetic primer and commentary'})).toHaveAttribute('href',/loc\.gov/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(writes).toEqual([]);
});
