import {test,expect} from '@playwright/test';
const fixture='tests/fixtures/tenders/treasury-revised-sbd1.docx';
test('guided original-form fields keep answers and route corrections at 320px',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:840});
 const writes:string[]=[];page.on('request',request=>{if(request.method()!=='GET')writes.push(request.method()+' '+request.url());});
 await page.goto('/#/tenders');await page.getByRole('button',{name:'Prepare a response',exact:true}).click();const panel=page.getByRole('region',{name:'Original government form assistance'});
 await panel.getByRole('checkbox',{name:/I authorise local processing/}).check();
 await panel.getByLabel('Import original tender document').setInputFiles(fixture);
 await expect(panel.getByLabel('SBD 1 Name of bidder')).toBeVisible();
 await panel.getByRole('button',{name:'Guide me step by step'}).click();
 await expect(panel.getByLabel('SBD 1 Name of bidder')).toBeFocused();
 await panel.getByLabel('SBD 1 Name of bidder').fill('Synthetic guided bidder');
 await panel.getByRole('button',{name:'Next contact field'}).click();
 await expect(panel.getByLabel('SBD 1 Postal address')).toBeFocused();
 await panel.getByLabel('SBD 1 Postal address').fill('Synthetic postal address');
 await panel.getByRole('button',{name:'Show all contact fields'}).click();
 await expect(panel.getByLabel('SBD 1 Name of bidder')).toHaveValue('Synthetic guided bidder');
 await expect(panel.getByLabel('SBD 1 Postal address')).toHaveValue('Synthetic postal address');
 await panel.getByLabel('SBD 1 Email address').fill('invalid');
 await panel.getByRole('button',{name:'Guide me step by step'}).click();
 await panel.getByRole('button',{name:'Go to Email address'}).click();
 await expect(panel.getByLabel('SBD 1 Email address')).toBeFocused();
 await panel.getByLabel('SBD 1 Email address').fill('synthetic@example.test');
 await expect(panel.getByRole('button',{name:'Go to Email address'})).toHaveCount(0);
 await expect(panel.getByText('3 of 7 supported contact fields have valid-format entries.')).toBeVisible();
 await panel.getByRole('button',{name:'Review all contact fields'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await panel.screenshot({path:testInfo.outputPath('tender-guided-fields.png')});
 await panel.getByRole('button',{name:'Clear private document work'}).click();
 await expect(panel.getByRole('button',{name:'Guide me step by step'})).toHaveCount(0);
 expect(writes).toEqual([]);
});

test('optional SBD 1 blanks can be reviewed by keyboard at 320px without guessing or sending answers',async({page})=>{
 await page.setViewportSize({width:320,height:840});
 const writes:string[]=[],leaks:string[]=[];
 const synthetic='Synthetic mobile bidder';
 page.on('request',request=>{
   if(request.method()!=='GET')writes.push(request.method()+' '+request.url());
   const transmitted=request.url().replace(/\+/g,' ')+' '+(request.postData()??'');
   if(transmitted.includes(synthetic)||transmitted.includes(encodeURIComponent(synthetic)))leaks.push(request.method());
 });
 await page.goto('/#/tenders');
 await page.getByRole('button',{name:'Prepare a response',exact:true}).click();
 const panel=page.getByRole('region',{name:'Original government form assistance'});
 await panel.getByRole('checkbox',{name:/I authorise local processing/}).check();
 await panel.getByLabel('Import original tender document').setInputFiles(fixture);
 await expect(panel.getByLabel('SBD 1 Name of bidder')).toBeVisible();
 await panel.getByLabel('SBD 1 Name of bidder').fill(synthetic);
 const persisted=await page.evaluate(needle=>[localStorage,sessionStorage].some(store=>
   Array.from({length:store.length},(_,i)=>{const key=store.key(i)??'';return key.includes(needle)||(store.getItem(key)??'').includes(needle);}).some(Boolean)
 ),synthetic);
 expect(persisted).toBe(false);
 const review=panel.getByText('Review 6 blank optional contact fields');
 await expect(review).toBeVisible();
 await review.focus();await page.keyboard.press('Enter');
 const jump=panel.getByRole('button',{name:'Go to Email address'});
 await expect(jump).toBeVisible();
 await expect(panel.getByText(/optional for Luqi's partial export only/)).toBeVisible();
 await panel.getByRole('button',{name:'Guide me step by step'}).click();
 await jump.focus();await page.keyboard.press('Enter');
 await expect(panel.getByLabel('SBD 1 Email address')).toBeFocused();
 await expect(panel.getByLabel('SBD 1 Email address')).toHaveValue('');
 await expect(panel.getByText('No answer entered. This contact field stays blank in the partial export; check whether the issuer requires it.')).toBeVisible();
 await expect(panel.getByLabel('SBD 1 Email address')).toHaveAttribute('aria-describedby',/-blank/);
 await expect(panel.getByText('1 of 7 supported contact fields have valid-format entries.')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(writes).toEqual([]);
 expect(leaks).toEqual([]);
 // Clear is a privacy boundary: a second applicant must never inherit the prior values.
 await panel.getByRole('button',{name:'Clear private document work'}).click();
 await expect(panel.getByLabel('SBD 1 Name of bidder')).toHaveCount(0);
 await panel.getByRole('checkbox',{name:/I authorise local processing/}).check();
 await panel.getByLabel('Import original tender document').setInputFiles(fixture);
 await expect(panel.getByLabel('SBD 1 Name of bidder')).toHaveValue('');
 await expect(panel.getByText('0 of 7 supported contact fields have valid-format entries.')).toBeVisible();
 const leakedAfterClear=await page.evaluate(needle=>[localStorage,sessionStorage].some(store=>
   Array.from({length:store.length},(_,i)=>{const key=store.key(i)??'';return key.includes(needle)||(store.getItem(key)??'').includes(needle);}).some(Boolean)
 ),synthetic);
 expect(leakedAfterClear).toBe(false);
 expect(writes).toEqual([]);
 expect(leaks).toEqual([]);
});
