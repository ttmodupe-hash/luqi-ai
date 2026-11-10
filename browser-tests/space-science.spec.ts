import { test, expect } from '@playwright/test';

test('science hub is searchable and the chosen tool opens',async({page})=>{
 await page.goto('/#/');
 await page.getByLabel('Filter workspace tools').fill('Space Science');
 const card=page.locator('.luqi-tool-card').filter({has:page.getByRole('heading',{name:'Space & Science Hub'})});
 await expect(card).toBeVisible();await card.getByRole('link').click();
 await expect(page.getByRole('heading',{name:'Space & Science Hub'})).toBeVisible();
});
test('radio/delay calculations work at 320px without external/provider calls',async({page,baseURL})=>{
 await page.setViewportSize({width:320,height:840});
 const unwanted:string[]=[];
 page.on('request',request=>{const u=new URL(request.url());if((u.protocol==='http:'||u.protocol==='https:')&&u.origin!==new URL(baseURL!).origin)unwanted.push(u.origin);if(request.method()==='POST')unwanted.push(u.pathname);});
 await page.goto('/#/space-science');
 await expect(page.getByText('0.214137 m',{exact:true})).toBeVisible();
 await page.getByLabel('Frequency',{exact:true}).fill('100');await page.getByLabel('Unit',{exact:true}).selectOption('MHz');
 await expect(page.getByText('2.99792 m',{exact:true})).toBeVisible();
 await page.getByLabel('One-way path length (km)').fill('299792.458');
 await expect(page.getByText('1.000000 s one-way',{exact:true})).toBeVisible();
 await expect(page.getByText('2.000000 s round-trip',{exact:true})).toBeVisible();
 await page.getByLabel('Frequency',{exact:true}).fill('Infinity');
 await expect(page.getByRole('button',{name:'Download my study notes'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(unwanted).toEqual([]);
});
test('filters and local practice respond to actual selections',async({page})=>{
 await page.goto('/#/space-science');await page.getByLabel('Topic',{exact:true}).selectOption('Space weather');
 await expect(page.getByRole('article')).toHaveCount(1);
 await page.getByLabel('Search science sources').fill('MeerKAT');await expect(page.getByRole('article')).toHaveCount(0);
 await page.getByRole('button',{name:'Reset source filters'}).click();await expect(page.getByRole('article')).toHaveCount(6);
 const group=page.getByRole('group',{name:/what happens to wavelength/});
 await group.getByLabel('It halves',{exact:true}).check();await group.getByRole('button',{name:'Check answer'}).click();
 await expect(page.getByText('1 of 3 practice answers correct.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Reset practice'}).click();await expect(page.getByText('0 of 3 practice answers correct.',{exact:true})).toBeVisible();
});
test('a downloaded notebook includes calculations, provenance and limitations',async({page})=>{
 await page.goto('/#/space-science');await page.getByLabel('One-way path length (km)').fill('299792.458');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download my study notes'}).click();
 const download=await downloadPromise;expect(download.suggestedFilename()).toBe('luqi-space-science-notes.txt');
 const stream=await download.createReadStream();expect(stream).toBeTruthy();const chunks:Buffer[]=[];
 for await(const chunk of stream!)chunks.push(Buffer.from(chunk));const text=Buffer.concat(chunks).toString('utf8');
 expect(text).toContain('1.0000000 s');expect(text).toContain('not live telemetry');expect(text).toContain('2026-11-01');expect(text).toContain('physics.nist.gov');
});

test('in-page learning shortcuts do not replace the hash-router location',async({page})=>{
 await page.goto('/#/space-science');
 for(const [label,heading] of [['Try an experiment','Experiment with radio and distance'],['Explore original sources','Discover the original publishers'],['Check your understanding','Check your understanding']]){
  await page.getByRole('navigation',{name:'Space learning shortcuts'}).getByRole('link',{name:label,exact:true}).click();
  await expect(page).toHaveURL(/#\/space-science$/);await expect(page.getByRole('heading',{name:heading,exact:true})).toBeFocused();
 }
});


test('frequency and source selection also work with the keyboard',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/#/space-science');
 const unit=page.getByLabel('Unit',{exact:true});
 await unit.focus();await expect(unit).toBeFocused();
 await unit.press('Home');await unit.press('ArrowDown');await unit.press('Enter');
 await expect(unit).toHaveValue('kHz');
 await expect(page.getByText('214137 m',{exact:true})).toBeVisible();
 const topic=page.getByLabel('Topic',{exact:true});
 await topic.focus();await topic.press('Home');await topic.press('ArrowDown');await topic.press('Enter');
 await expect(topic).toHaveValue('Radio astronomy');await expect(page.getByRole('article')).toHaveCount(3);
 expect(errors).toEqual([]);
});


test('SKAO deep dive is keyboard-accessible, grounded and remains within 320px',async({page,baseURL})=>{
 await page.setViewportSize({width:320,height:840});
 const requests:string[]=[];
 page.on('request',request=>{
  const url=new URL(request.url());
  if((url.protocol==='http:'||url.protocol==='https:')&&url.origin!==new URL(baseURL!).origin)requests.push(url.origin);
  if(request.method()==='POST')requests.push(url.pathname);
 });
 await page.goto('/#/space-science');
 const details=page.locator('details.luqi-space-deep-dive');
 await expect(details).toHaveCount(1);
 const toggle=details.locator('summary');
 await toggle.focus();await toggle.press('Enter');
 await expect(details).toHaveAttribute('open','');
 await expect(details.getByText(/maximum baseline of 150 km/)).toBeVisible();
 await expect(details.getByText(/not a verified count of dishes installed or operating today/)).toBeVisible();
 await details.getByRole('button',{name:'Explore wavelength in the calculator above'}).click();
 await expect(page.getByRole('heading',{name:'Experiment with radio and distance'})).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByLabel('Topic',{exact:true}).selectOption('Space weather');
 await expect(details).toHaveCount(0);
 expect(requests).toEqual([]);
});
