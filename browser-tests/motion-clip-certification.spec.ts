import { test, expect } from '@playwright/test';
test('Luqi Motion Studio records actual animated video, or clearly exposes supported fallback', async ({page}) => {
 const writes: string[] = [];
 page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
 await page.setViewportSize({width:390,height:840});
 await page.goto('/#/content-studio');
 await page.getByRole('button',{name:'Open Luqi Motion Studio'}).click();
 const studio=page.getByRole('region',{name:'Luqi Motion Studio'});
 await expect(studio.getByRole('heading',{name:'Build original character motion'})).toBeVisible();
 const exportPanel=studio.getByRole('region',{name:'Luqi character video export'});
 await studio.getByLabel('Motion character').selectOption('engineer');
 await studio.getByLabel('Motion preset').selectOption('walk');
 const record=exportPanel.getByRole('button',{name:'Record 4-second character video',exact:true});
 await expect(record).toBeVisible();
 if (await record.isDisabled()) {
   await expect(exportPanel).toContainText('Video recording is unavailable');
 } else {
   await record.click();
   await expect(exportPanel.getByRole('status',{name:'Character video status'}))
    .toContainText(/character video is ready|moving character video is ready/i,{timeout:16000});
   const preview=exportPanel.getByRole('video',{name:'Completed character video preview'});
   await expect(preview).toBeVisible();
   const metadata=await preview.evaluate(async element => {
     const video=element as HTMLVideoElement;
     if (video.readyState === 0) await new Promise<void>((resolve,reject) => {
       video.addEventListener('loadedmetadata',()=>resolve(),{once:true});
       video.addEventListener('error',()=>reject(Error('video metadata missing')),{once:true});
     });
     return {width:video.videoWidth,height:video.videoHeight,seconds:video.duration};
   });
   expect(metadata.width).toBeGreaterThan(0);
   expect(metadata.height).toBeGreaterThan(0);
   const pending=page.waitForEvent('download');
   await exportPanel.getByRole('link',{name:/Download 4-second character video/}).click();
   const output=await pending; expect(output.suggestedFilename()).toMatch(/luqi-motion-character-4s\.(webm|mp4)$/);
   const stream=await output.createReadStream();let bytes=0;
   for await (const chunk of stream) bytes+=chunk.length;
   expect(bytes).toBeGreaterThan(1024);
 }
 expect(writes).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
});
test('source-linked Cisco and PeopleCert exam facts are accessible without banner fatigue',async ({page}) => {
 await page.goto('/#/cert-academy');
 await expect(page.getByRole('heading',{name:'Learn the skills. Follow the official certification pathway.'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Official exam details/})).toHaveAttribute('href',/cisco\.com/);
 await expect(page.getByText(/Current version through 2 February 2027/)).toBeVisible();
 await page.getByRole('button',{name:/Cisco Service Provider Advanced Routing/}).click();
 await expect(page.getByText(/former CCIP designation retired in October 2012/)).toBeVisible();
 await expect(page.getByRole('link',{name:/Official exam details/})).toHaveAttribute('href',/cisco\.com.*spri/);
 await page.getByRole('button',{name:/ITIL AI Governance/}).click();
 await expect(page.getByText(/PeopleCert lists a 40-question exam with a 70% minimum passing score/)).toBeVisible();
 await expect(page.getByRole('link',{name:/Official exam details/})).toHaveAttribute('href',/peoplecert\.org/);
 expect(await page.locator('p.rounded-xl.border-amber-700').count()).toBe(0);
});
