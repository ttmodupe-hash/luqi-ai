import { test, expect, type Page } from '@playwright/test';
async function openDrive(page:Page){await page.goto('/#/drive?trail=heritage');await expect(page.getByRole('heading',{name:'Your civic compass.'})).toBeVisible();}
/** Keep the tested width. A taller capture viewport prevents fixed app chrome from covering the component screenshot; no content/styles are hidden. */
async function captureManager(page:Page,path:string){
 const size=page.viewportSize()!;
 const component=page.locator('.civicManager');
 const height=await component.evaluate(el=>el.getBoundingClientRect().height);
 await page.setViewportSize({width:size.width,height:Math.ceil(height+260)});
 await component.evaluate(el=>{
  if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-110),behavior:'instant'});
 });
 await component.screenshot({path});
 await page.setViewportSize(size);
}

test('digital manager presents working tasks and preserves the complete source library',async({page},info)=>{
 await openDrive(page);const civic=page.locator('.civicManager');
 await expect(civic.getByRole('heading',{name:'The right place. The right records.'})).toBeVisible();
 await expect(civic.locator('.cm-library')).not.toHaveAttribute('open');
 await captureManager(page,info.outputPath('civic-manager.png'));
 await civic.getByRole('button',{name:/Know your representatives/}).click();
 await expect(civic.getByRole('heading',{name:'An election result is a starting point.'})).toBeVisible();
 await civic.getByRole('button',{name:/Explore party positions/}).click();
 await expect(civic.getByRole('heading',{name:'Understand the claim. Check the evidence.'})).toBeVisible();
 await civic.getByRole('button',{name:/Follow public money/}).click();
 await expect(civic.getByRole('link',{name:'Auditor-General records (opens in a new tab)'})).toBeVisible();
 await civic.locator('.cm-library>summary').click();
 const sources=civic.locator('.cm-sourceGrid a');await expect(sources).toHaveCount(7);
 await expect(civic.locator('.cm-library')).toContainText('Current ward, councillor and governing coalition are not inferred');
 for(const link of await sources.all()){expect(await link.getAttribute('href')).toMatch(/^https:\/\//);expect(await link.getAttribute('rel')).toBe('noopener noreferrer');}
});

test('320px workspace keeps whole task labels and usable controls without horizontal scrolling',async({page},info)=>{
 await page.setViewportSize({width:320,height:900});await openDrive(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const civic=page.locator('.civicManager');
 for(const button of await civic.locator('.cm-task').all()){
  const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(48);expect(box!.width).toBeGreaterThanOrEqual(200);
 }
 expect(await civic.locator('.cm-taskCopy strong').first().evaluate(el=>getComputedStyle(el).overflowWrap)).toBe('normal');
 await civic.getByRole('button',{name:/Follow public money/}).click();await expect(civic.getByRole('heading',{name:'Look beyond the headline.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await captureManager(page,info.outputPath('civic-manager-320.png'));
});

test('keyboard task changes and reduced motion remain usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await openDrive(page);
 const button=page.getByRole('button',{name:/Explore party positions/});await button.focus();await page.keyboard.press('Enter');
 await expect(button).toHaveAttribute('aria-pressed','true');await expect(button).toBeFocused();
 expect(await page.locator('.cm-focus').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 const outline=await button.evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth}));
 expect(outline.style).not.toBe('none');expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(3);
});

test('preserves the newer saved-place reader, collection and multilingual export',async({page},info)=>{
 await page.addInitScript(()=>localStorage.removeItem('luqi.drive.field-notebook.v1'));
 await openDrive(page);const notebook=page.getByRole('region',{name:'My field guide'});
 await expect(notebook.getByText('A whole country to discover.')).toBeVisible();
 await notebook.getByRole('button',{name:'Save this place',exact:true}).click();
 await expect(notebook.getByRole('button',{name:'Saved to field guide'})).toBeDisabled();
 await expect(notebook.locator('ol li')).toHaveCount(1);
 await notebook.getByRole('button',{name:'Read Tswaing crater',exact:true}).click();
 await notebook.getByLabel('Reading language',{exact:true}).selectOption('setswana');
 await expect(notebook.getByRole('region',{name:'Saved guide: Tswaing crater'}).locator('p')).toHaveAttribute('lang','tn');
 await notebook.screenshot({path:info.outputPath('field-guide-preserved.png')});
 const event=page.waitForEvent('download');await notebook.getByRole('button',{name:'Download field guide (.txt)',exact:true}).click();
 const download=await event;expect(download.suggestedFilename()).toBe('luqi-south-africa-field-guide.txt');
 const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));
 const content=Buffer.concat(chunks).toString('utf8');for(const language of ['English','Sepitori','Setswana','isiZulu'])expect(content).toContain(language);
 await notebook.getByRole('button',{name:/Remove /}).click();await expect(notebook.getByText('A whole country to discover.')).toBeVisible();
});

test('visual layer adds no location requests or external fonts and pages',async({page,baseURL},info)=>{
 const external:string[]=[];page.on('request',r=>{const u=new URL(r.url());if(/^https?:$/.test(u.protocol)&&u.origin!==new URL(baseURL!).origin)external.push(u.origin);});
 await page.addInitScript(()=>{(window as any).__designGps=0;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition(){(window as any).__designGps++;return 1;},getCurrentPosition(){(window as any).__designGps++;},clearWatch(){}}});});
 await page.goto('/#/drive?trail=heritage');await expect(page.getByRole('button',{name:'Use phone GPS'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Your civic compass.'})).toBeVisible();
 await page.getByRole('button',{name:/Explore party positions/}).click();
 expect(await page.evaluate(()=>(window as any).__designGps)).toBe(0);expect(external).toEqual([]);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('drive-integration-overview.png'),fullPage:false});
});
