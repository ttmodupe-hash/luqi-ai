import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Synthetic local-only fixtures. No credentials, payments or paid model calls.
test.beforeEach(async ({ page, baseURL }) => {
 await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen','true'));
 await page.route('**/*', route => {
   const target = new URL(route.request().url());
   if (target.origin !== new URL(baseURL!).origin) return route.abort();
   if (target.pathname.startsWith('/api/') || target.pathname.startsWith('/v1/'))
      return route.fulfill({status:503,json:{code:'TEST_UNAVAILABLE'}});
   return route.continue();
 });
});
test('hybrid sources and original SVG artworks are mirrored', () => {
 for (const path of ['pages/Home.tsx','pages/AskLuqiPage.tsx','home-cinematic.css']) {
   expect(readFileSync('src/'+path,'utf8')).toBe(readFileSync('app/src/'+path,'utf8'));
 }
 for (const path of ['luqi-african-horizon.svg','luqi-history-panorama.svg']) {
   expect(readFileSync('public/'+path,'utf8')).toBe(readFileSync('app/public/'+path,'utf8'));
 }
});
for (const width of [320,390,768,1280]) {
 test('rich Luqi homepage stays usable at '+width+'px', async ({page}) => {
   const errors:string[]=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:900});
   await page.goto('/#/');
   await expect(page.getByRole('heading',{name:/Knowledge. People.\s*A Stronger Africa./})).toBeVisible();
   await expect(page.getByRole('heading',{name:/African Peoples and Historical Evidence in Biblical Narratives/})).toBeVisible();
   await expect(page.getByRole('navigation',{name:"Quick access to Luqi's working tools"})).toBeVisible();
   await expect(page.getByRole('complementary',{name:'Guest trial and country guide'})).toBeVisible();
   await expect(page.locator('.luqi-hero-moon')).toBeVisible();
   await expect(page.getByRole('link',{name:'Get started',exact:true})).toBeVisible();
   await expect(page.locator('.luqi-hero-chips').getByRole('link',{name:'Small tenders & RFQs'})).toHaveAttribute('href','#/tenders');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   expect(errors).toEqual([]);
   await page.screenshot({path:test.info().outputPath('hybrid-'+width+'.png'),fullPage:true,scale:'css'});
 });
}
test('homepage question is passed to local guide without AI submission or query-string leak', async ({page}) => {
 const writes:string[]=[];
 page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});
 await page.goto('/#/');
 await page.getByRole('textbox',{name:'Ask Luqi anything'}).fill('Help me find a small cleaning quotation');
 await page.getByRole('button',{name:'Find my next step with Luqi'}).click();
 await expect(page).toHaveURL(/#\/ask$/);
 await expect(page.getByRole('textbox',{name:'What would you like help with?'})).toHaveValue('Help me find a small cleaning quotation');
 // The homepage submit already expressed intent: do not force a second submit.
 await expect(page.getByRole('heading',{name:'Put a practical idea to work'})).toBeVisible();
 const pathBefore = await page.evaluate(() => window.location.hash);
 await page.getByRole('button',{name:'Go to suggested next step'}).click();
 await expect(page.getByRole('heading',{name:'Put a practical idea to work'})).toBeFocused();
 expect(await page.evaluate(() => window.location.hash)).toBe(pathBefore);
 await expect(page.getByRole('link',{name:'Open business desk'})).toHaveAttribute('href','#/business-desk');
 expect(writes).toEqual([]);
});
test('source-linked African study loads only when requested', async ({page}) => {
 await page.goto('/#/');
 const control=page.getByRole('button',{name:'Explore the topics'});
 await control.click();
 await expect(page.getByRole('button',{name:'Close the study'})).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('button',{name:'Explore African biblical history'})).toBeVisible();
});

test('home history distinguishes the unnamed Cushite wife from named Zipporah at 320px', async ({page}) => {
 const writes:string[]=[];
 page.on('request', request => {if(!['GET','HEAD'].includes(request.method())) writes.push(request.url());});
 await page.setViewportSize({width:320,height:760});
 await page.goto('/#/');
 const figures=page.locator('.luqi-history-figures');
 await expect(figures.getByText('Moses’ unnamed Cushite wife',{exact:true})).toBeVisible();
 await expect(figures.getByText('Numbers 12:1',{exact:true})).toBeVisible();
 await expect(figures.getByText('Zipporah',{exact:true})).toHaveCount(0);
 await expect(figures).toHaveAttribute('aria-label',/identities may be disputed/);
 const note=page.locator('.luqi-history-caution');
 await expect(note).toContainText('Numbers 12:1 describes Moses’ Cushite wife without naming her');
 await expect(note).toContainText('Whether these refer to the same person is disputed');
 const numbers=note.getByRole('link',{name:'Read Numbers 12:1'});
 const exodus=note.getByRole('link',{name:'Read Exodus 2:21'});
 await expect(numbers).toHaveAttribute('href','https://www.sefaria.org/Numbers.12.1-15');
 await expect(exodus).toHaveAttribute('href','https://bible.usccb.org/bible/exodus/2');
 for(const link of [numbers,exodus]){
   await expect(link).toHaveAttribute('target','_blank');
   await expect(link).toHaveAttribute('rel','noopener noreferrer');
 }
 await numbers.focus();
 await page.keyboard.press('Tab');
 await expect(exodus).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(writes).toEqual([]);
});
