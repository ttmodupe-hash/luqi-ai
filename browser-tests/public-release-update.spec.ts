import {test,expect} from '@playwright/test';

test('stale Luqi tab detects a new public boot script and requires customer-approved refresh',async({page})=>{
 const posts:string[]=[];page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
 await page.setViewportSize({width:320,height:740});
 await page.goto('/#/start');
 await expect(page.getByRole('heading',{name:'A useful place to begin.'})).toBeVisible();
 const old=await page.locator('script[type="module"][src^="/assets/index-"]').first().getAttribute('src');
 expect(old).toMatch(/^\/assets\/index-[\w-]+\.js$/);
 await page.route('**/index.html',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<!doctype html><html><head><script type="module" src="/assets/index-reviewupdate123.js"></script></head><body></body></html>'
 }));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 const notice=page.getByRole('status',{name:'Luqi app update available'});
 await expect(notice).toBeVisible();
 await expect(notice).toContainText('Save or copy unsent messages');
 await expect(notice.getByRole('button',{name:'Refresh Luqi'})).toBeVisible();
 await notice.getByRole('button',{name:'Not now'}).click();
 await expect(notice).not.toBeVisible();
 await expect(page.getByRole('heading',{name:'A useful place to begin.'})).toBeVisible();
 expect(posts).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('unchanged live HTML does not create an update banner',async({page})=>{
 await page.goto('/#/start');
 await expect(page.getByRole('heading',{name:'A useful place to begin.'})).toBeVisible();
 const boot=await page.locator('script[type="module"][src^="/assets/index-"]').first().getAttribute('src');
 expect(boot).toBeTruthy();
 await page.route('**/index.html',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<!doctype html><html><head><script src="'+boot+'" crossorigin type="module"></script></head></html>'
 }));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.getByRole('status',{name:'Luqi app update available'})).toHaveCount(0);
});
