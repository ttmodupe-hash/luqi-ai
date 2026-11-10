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

test('funding hub brings South African, pan-African and global publishers together at 320px',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  const writes:string[]=[];
  page.on('request',request=>{if(request.method()!=='GET')writes.push(request.url());});
  await page.goto('/#/african-radar');
  await expect(page.getByText('8 of 8 reviewed programme references match your filters.')).toBeVisible();
  await page.getByRole('combobox',{name:'Project location'}).selectOption('KE');
  await page.getByRole('combobox',{name:'Funding geography'}).selectOption('PAN_AFRICA');
  await expect(page.getByRole('article',{name:'Tony Elumelu Foundation Entrepreneurship Programme'})).toBeVisible();
  await expect(page.getByRole('article',{name:'AECF Enterprise Challenge Finance'})).toBeVisible();
  await expect(page.getByRole('article',{name:'AFAWA Partner Finance'})).toBeVisible();
  await expect(page.getByRole('article',{name:'TIA Seed Fund'})).toHaveCount(0);
  await page.getByRole('combobox',{name:'Funding geography'}).selectOption('GLOBAL');
  await expect(page.getByRole('article',{name:'Global Innovation Fund'})).toBeVisible();
  await expect(page.getByRole('article',{name:'MIT Solve Global Challenges'})).toBeVisible();
  await page.getByRole('textbox',{name:'Search funding programmes'}).fill('MIT');
  await expect(page.getByText('1 of 8 reviewed programme references match your filters.')).toBeVisible();
  const mit=page.getByRole('article',{name:'MIT Solve Global Challenges'});
  await page.getByRole('combobox',{name:'Project stage'}).selectOption('IDEA');
  await expect(mit).toContainText('Concept-stage ideas are reviewed only under the Indigenous Communities Fellowship');
  await expect(mit).toContainText('6 November 2026 at 12:00 EST (19:00 SAST)');
  await expect(mit).toContainText('Check programme criteria');
  await page.getByRole('combobox',{name:'Project stage'}).selectOption('MVP');
  await expect(mit).not.toContainText('Concept-stage ideas are reviewed only under');
  await mit.getByRole('button',{name:'Prepare review draft'}).click();
  await expect(page.getByRole('textbox',{name:'Funding preparation draft text'}))
    .toHaveValue(/Project location: Kenya[\s\S]*CURRENT FUNDING WINDOW: NOT VERIFIED/);
  await page.getByRole('combobox',{name:'Funding geography'}).selectOption('ALL');
  await page.getByRole('textbox',{name:'Search funding programmes'}).fill('');
  await page.getByRole('combobox',{name:'Funding type'}).selectOption('GRANT');
  await expect(page.getByRole('article',{name:'Tony Elumelu Foundation Entrepreneurship Programme'})).toBeVisible();
  await expect(page.getByRole('article',{name:'Global Innovation Fund'})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(writes).toEqual([]);
});
