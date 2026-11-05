import { test, expect } from '@playwright/test';

test('Academy is searchable from the workspace and preserves the advanced practice link', async ({page}) => {
  await page.goto('/#/');await page.getByLabel('Filter workspace tools').fill('Universal Academy');
  const card = page.locator('.luqi-tool-card').filter({has:page.getByRole('heading',{name:'Universal Academy',exact:true})});
  await expect(card).toBeVisible();await card.getByRole('link').click();
  await expect(page.getByRole('heading',{name:'Universal Academy',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Existing Cisco / ITIL advanced practice'})).toHaveAttribute('href',/#\/cert-academy\/legacy$/);
});

test('six tracks and hands-on maths work at 320 pixels without external requests', async ({page,baseURL},testInfo) => {
  await page.setViewportSize({width:320,height:840});
  const unexpected:string[]=[];const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{const u=new URL(request.url());if((u.protocol==='http:'||u.protocol==='https:')&&u.origin!==new URL(baseURL!).origin)unexpected.push(u.origin);if(request.method()==='POST')unexpected.push(u.pathname);});
  await page.goto('/#/academy');
  const tracks=page.getByRole('navigation',{name:'Academy tracks'});await expect(tracks.getByRole('button')).toHaveCount(6);await expect(page.locator('iframe')).toHaveCount(0);
  for(const name of ['Security+ and Cyber Defence','AWS Cloud Practitioner','Python and AI Engineering','Solar PV, K53 and Business Foundations','Grade 12 Maths and Physical Sciences']){
    await tracks.getByRole('button',{name,exact:true}).click();await expect(tracks.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
  }
  await page.getByRole('button',{name:'Hands-on lab',exact:true}).click();await page.getByRole('button',{name:'Analyse quadratic'}).click();
  await expect(page.getByText(/Real roots: 2, 3/)).toBeVisible();await page.getByRole('button',{name:'Calculate locally',exact:true}).click();
  await expect(page.locator('pre').filter({hasText:'"netWorkJ": 16'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);expect(unexpected).toEqual([]);
  await testInfo.attach('academy-matric-320px',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('local Cisco configuration and Python traces never execute external operations', async ({page}) => {
  await page.goto('/#/academy');await page.getByRole('button',{name:'Hands-on lab',exact:true}).click();
  for(const command of ['enable','conf t','interface gi0/1','ip address 192.0.2.1 255.255.255.0','no shutdown','end','show ip interface brief']){
    await page.getByLabel('Practice command').fill(command);await page.getByRole('button',{name:'Run locally',exact:true}).click();
  }
  await expect(page.getByLabel('Local terminal transcript')).toContainText('192.0.2.1 admin enabled (link not simulated)');
  await page.getByRole('button',{name:'Python and AI Engineering',exact:true}).click();await page.getByRole('button',{name:'Hands-on lab',exact:true}).click();
  await page.getByLabel('Practice command').fill('print(2 + 3 * 4)');await page.getByRole('button',{name:'Run locally',exact:true}).click();
  await expect(page.getByLabel('Local terminal transcript')).toContainText('Teaching trace result: 14');
});

test('custom course export retains learner topics but makes no verification claim', async ({page}) => {
  await page.goto('/#/academy');await page.getByRole('button',{name:'Build custom course',exact:true}).click();
  await page.getByLabel('Subject',{exact:true}).fill('Water systems');await page.getByLabel('What should the learner be able to demonstrate?').fill('Explain a safe filter model');
  await page.getByLabel('Topics, one per line (1-20)').fill('Flow\nMaterials');await page.getByRole('button',{name:'Build local course outline'}).click();
  await expect(page.getByText('Module 1: Flow',{exact:true})).toBeVisible();
  const ready=page.waitForEvent('download');await page.getByRole('button',{name:'Download course plan'}).click();const download=await ready;
  expect(download.suggestedFilename()).toBe('luqi-custom-course.json');const stream=await download.createReadStream();const chunks:Buffer[]=[];
  for await(const chunk of stream!)chunks.push(Buffer.from(chunk));const plan=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(plan.subject).toBe('Water systems');expect(plan.modules).toHaveLength(2);expect(plan.status).toContain('need review');
});

test('study choices stay local and notebook download contains real attempts', async ({page}) => {
  await page.goto('/#/academy');await page.getByRole('button',{name:'Practice and feedback',exact:true}).click();
  await page.getByLabel(/Your answer/).fill('-100');await page.getByRole('button',{name:'Check and record attempt'}).click();await page.getByRole('button',{name:'Study method and notebook',exact:true}).click();
  await page.getByLabel('Language for your next tutor request').selectOption('Sepitori');
  await expect(page.getByLabel('Prepared tutor request (copy only what you choose)')).toHaveValue(/Sepitori/);
  await page.getByLabel('What did you misunderstand, and what changed?').fill('I counted network and broadcast as ordinary hosts.');
  const ready=page.waitForEvent('download');await page.getByRole('button',{name:'Download notebook'}).click();const download=await ready;
  const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(data.attempts).toHaveLength(1);expect(data.attempts[0].correct).toBe(false);expect(data.reflection).toContain('broadcast');expect(data.warning).toContain('not a certificate');
});
