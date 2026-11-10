import {test,expect} from '@playwright/test';

test('a narrow DPSA correction is discoverable, linked, keyboard usable and fits 320px',async({page})=>{
 const writes:string[]=[];page.on('request',request=>{if(request.method()!=='GET')writes.push(request.url());});
 await page.setViewportSize({width:320,height:720});
 await page.goto('/#/opportunities');
 await expect(page.getByRole('heading',{name:'Public Service Vacancy Circular 40 of 2026'})).toBeVisible();
 const search=page.getByRole('textbox',{name:'Search opportunity sources'});
 await search.focus();await page.keyboard.type('HO 2026/11/33');
 await expect(page.getByRole('heading',{name:'Public Service Vacancy Circular 40 of 2026'})).toBeVisible();
 await expect(page.getByText(/Withdrawn Correctional Services posts/)).toBeVisible();
 const article=page.locator('article').filter({has:page.getByRole('heading',{name:'Public Service Vacancy Circular 40 of 2026'})});
 await expect(article.getByRole('link',{name:'Read the official source'})).toHaveAttribute('href','https://www.dpsa.gov.za/newsroom/psvc/circular-40-of-2026/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(writes).toEqual([]);
});
