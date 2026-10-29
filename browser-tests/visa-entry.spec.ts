import {test,expect} from '@playwright/test';
test('mobile Visa & Entry uses only original government sources and never sends personal data',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/#/visa-entry');
 await expect(page.getByRole('heading',{name:/Plan your journey. Verify entry requirements/})).toBeVisible();
 await page.getByLabel('Destination country').selectOption('KE');
 await page.getByLabel('Passport nationality').selectOption('South Africa');
 await page.getByLabel('Intended stay days').fill('14');
 await expect(page.getByText(/Kenya’s official How to Apply page lists South Africa/)).toBeVisible();
 await expect(page.getByText(/This is a dated source example, not a real-time personal exemption ruling/)).toBeVisible();
 await expect(page.getByRole('link',{name:'View government website'}).first()).toHaveAttribute('href','https://etakenya.go.ke/how-to-apply');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(posts).toEqual([]);
});
test('travel entry guide does not misstate South Africa work eligibility',async({page})=>{
 await page.goto('/#/visa');
 await expect(page).toHaveURL(/#\/visa-entry$/);
 await page.getByLabel('Passport nationality').selectOption('Nigeria');
 await page.getByLabel('Purpose of visit').selectOption('work');
 await page.getByLabel('Arrival method').selectOption('land');
 await expect(page.getByText(/ETA page expressly says ETA holders cannot work/)).toBeVisible();
 await expect(page.getByText(/land or sea arrivals/)).toBeVisible();
});
test('Start and Chat expose the free visa source navigator',async({page})=>{
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/#/start');
 await page.getByRole('link',{name:/Explore Visa & Entry/}).click();
 await expect(page).toHaveURL(/#\/visa-entry$/);
 await page.goto('/#/chat');
 await page.getByRole('link',{name:/Visa & Entry: review official South African/}).click();
 await expect(page).toHaveURL(/#\/visa-entry$/);
 expect(posts).toEqual([]);
});
