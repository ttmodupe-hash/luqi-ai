import { test, expect } from '@playwright/test';
test('local install diagnostics work at 320px with no writes or private URLs',async({page})=>{
 const writes:string[]=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
 await page.setViewportSize({width:320,height:800});await page.goto('/#/install?private=do-not-report');
 const panel=page.getByRole('region',{name:'Check this browser before installing'});
 await panel.getByRole('button',{name:'Check this browser',exact:true}).click();
 await panel.getByRole('button',{name:'Show browser-check report'}).click();
 const report=panel.getByRole('textbox');await expect(report).toBeVisible();
 await expect(report).toHaveValue(/NOT a security certification/);
 expect(await report.inputValue()).not.toContain('do-not-report');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(writes).toEqual([]);await panel.getByRole('button',{name:'Hide browser-check report'}).click();await expect(report).toHaveCount(0);
});
test('a tender left open across its deadline becomes historical without losing selected draft',async({page})=>{
 await page.clock.install({time:new Date('2026-11-02T08:58:00Z')});
 await page.goto('/#/tenders');await page.getByRole('button',{name:'Sources & history',exact:true}).click();await page.getByLabel('Search tender notices').fill('regional and continental');
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Study on enhancing MSME access to regional and continental markets'})});
 await expect(card).toBeVisible();await card.getByRole('button',{name:'Prepare bidder worksheet for this tender'}).click();
 await page.getByLabel('Bidder trading name').fill('Synthetic example');
 await page.clock.fastForward(121000);
 await page.getByRole('button',{name:'Sources & history',exact:true}).click();
 await expect(card).toHaveCount(0);
 await page.getByRole('button',{name:'Prepare a response',exact:true}).click();
 await expect(page.getByLabel('Bidder trading name')).toHaveValue('Synthetic example');
 await expect(page.getByRole('button',{name:'Export human-approved preparation pack'})).toBeDisabled();
 await page.getByRole('button',{name:'Sources & history',exact:true}).click();
 await page.getByLabel(/Show expired tenders and those with a past compulsory briefing/).check();
 await expect(card).toContainText('Published closing time passed. Historical only.');
});
