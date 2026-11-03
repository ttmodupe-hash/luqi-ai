import {test,expect} from '@playwright/test';

test('320px Capital Intelligence prepares a real local document and blocks false NYDA R&D matches',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  const risky:string[]=[];
  page.on('request',request=>{
    if(request.method()==='POST'||/\/api\/v1\/sensing\//.test(request.url()))risky.push(request.url());
  });
  await page.goto('/#/opportunities');
  await page.getByRole('link',{name:'Prepare a funding shortlist'}).click();
  await expect(page).toHaveURL(/#\/african-radar$/);
  await expect(page.getByRole('heading',{name:'Luqi Capital Intelligence'})).toBeVisible();
  const nyda=page.getByRole('article',{name:'NYDA Grant Programme'});
  await expect(nyda).toContainText('Not currently aligned');
  await page.getByLabel('Funding purpose').selectOption('BUSINESS_GROWTH');
  await page.getByLabel('Founder age (optional, checked locally)').fill('23');
  await expect(nyda).toContainText('Potential programme to explore');
  await page.getByLabel('Founder age (optional, checked locally)').fill('42');
  await expect(nyda).toContainText('Not currently aligned');
  await page.getByLabel('Project name').fill('Community Innovation');
  await page.getByLabel('Project summary').fill('Offline-first education for local schools');
  await page.getByLabel('Business plan').check();
  const tia=page.getByRole('article',{name:'TIA Seed Fund'});
  await expect(tia).toContainText('Suggested documents prepared: 33%');
  await tia.getByRole('button',{name:'Prepare review draft'}).click();
  const field=page.getByRole('textbox',{name:'Funding preparation draft text'});
  await expect(field).toHaveValue(/Community Innovation/);
  await expect(field).toHaveValue(/No application has been submitted/);
  await expect(field).toHaveValue(/CURRENT FUNDING WINDOW: NOT VERIFIED/);
  await expect(page.getByRole('link',{name:'Download preparation worksheet'}))
    .toHaveAttribute('download','luqi-funding-preparation.txt');
  expect(risky).toEqual([]);
  const viewportReport=await page.evaluate(()=>({
    viewport:window.innerWidth,
    pageWidth:document.documentElement.scrollWidth,
    // Keep the actual 320px assertion. Report culprits if width still breaks.
    excessNodes:Array.from(document.querySelectorAll('main *'))
      .filter(el=>el.getBoundingClientRect().right>window.innerWidth+1)
      .slice(0,8)
      .map(el=>({tag:el.tagName,
        role:el.getAttribute('aria-label')||'',
        className:el.getAttribute('class')||'',
        right:Math.round(el.getBoundingClientRect().right)})),
  }));
  expect(viewportReport.pageWidth,JSON.stringify(viewportReport)).toBeLessThanOrEqual(viewportReport.viewport+1);
});
test('Capital Intelligence requires a recheck when publisher review expires',async({page})=>{
  await page.clock.setFixedTime(new Date('2027-01-10T12:00:00+02:00'));
  await page.goto('/#/african-radar');
  await expect(page.getByRole('article',{name:'TIA Seed Fund'})).toContainText('Publisher source recheck overdue');
  await expect(page.getByRole('article',{name:'TIA Seed Fund'})).toContainText('Check programme criteria');
});
