import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.route('**/api/**', r => r.fulfill({status:503,json:{code:'SYNTHETIC_UNAVAILABLE'}}));
  await page.route('**/v1/**', r => r.fulfill({json:{status:'configured_not_verified',checks:{persistence:'connected',ai_pilot:'configured_not_verified'}}}));
  await page.route('**/api/v1/auth/login', r=>r.fulfill({json:{token:'interaction-fixture',user:{email:'interaction@example.test',name:'Test learner'}}}));
});
async function signIn(page:Page) {
  await page.goto('/#/chat');
  await page.getByText('Prefer to sign in here?',{exact:true}).click();
  const form=page.getByRole('region',{name:'Sign in to your Luqi account'});
  await form.getByLabel('Email',{exact:true}).fill('interaction@example.test');
  await form.getByLabel('Password',{exact:true}).fill('synthetic-passphrase-only');
  await form.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByLabel('Your question',{exact:true})).toBeVisible();
}
async function openSidebar(page:Page) {
 const open=page.getByRole('button',{name:'Open chat sidebar',exact:true});
 if(await open.isVisible()) await open.click();
}
async function goCivic(page:Page) {
 await page.getByRole('link',{name:'Civic evidence — understand public records and voting information',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Civic Evidence Desk',exact:true})).toBeVisible();
}

test('New chat exits Civic and confirms before discarding an unsent evidence question',async({page})=>{
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/#/chat?civic=1');
 await openSidebar(page);
 await page.locator('.luqi-chat-rail-new').click();
 await expect(page).toHaveURL(/#\/chat$/);
 await page.getByRole('link',{name:/Civic evidence —/}).click();
 await page.getByRole('article').filter({has:page.getByRole('heading',{name:'Reading a clean audit',exact:true})}).getByRole('link',{name:'Ask Luqi about this evidence'}).click();
 await page.getByLabel('Question about this evidence',{exact:true}).fill('Keep my unsent question');
 await openSidebar(page);
 page.once('dialog',d=>d.dismiss());
 await page.locator('.luqi-chat-rail-new').click();
 await expect(page).toHaveURL(/evidence=clean-audit$/);
 page.once('dialog',d=>d.accept());
 await page.locator('.luqi-chat-rail-new').click();
 await expect(page).toHaveURL(/#\/chat$/);expect(posts).toEqual([]);
});

test('choosing a recent conversation from Civic shows that actual conversation without another request',async({page})=>{
 let calls=0;
 await page.route('**/api/v1/luqi-core',r=>{calls++;return r.fulfill({json:{status:'success',response:'Synthetic confirmed study reply.',provider:'gemini',provider_model:'fixture'}});});
 await signIn(page);
 await page.getByLabel('Your question',{exact:true}).fill('Explain a study technique');
 // The approved control is replaced by its confirmation; assert the resulting state.
 await page.getByRole('checkbox',{name:/I understand AI text may go/}).click();
 await expect(page.getByText('AI text sharing approved for this signed-in tab. Each message still needs Send.',{exact:true})).toBeVisible();
 expect(calls).toBe(0);
 await page.getByRole('button',{name:'Send question',exact:true}).click();
 await expect(page.getByText('Synthetic confirmed study reply.',{exact:true})).toBeVisible();
 await goCivic(page);await openSidebar(page);
 await page.getByRole('button',{name:'Explain a study technique',exact:true}).click();
 await expect(page).toHaveURL(/#\/chat$/);
 await expect(page.getByText('Synthetic confirmed study reply.',{exact:true})).toBeVisible();expect(calls).toBe(1);
});

test('consumer handoff preserves selected category and only explicitly copied local draft',async({page})=>{
 let paid=0;await page.route('**/api/v1/luqi-core',r=>{paid++;return r.fulfill({status:503,json:{code:'NO_PROVIDER_TEST'}});});
 await signIn(page);
 const question='My bank debit order is disputed';
 await page.getByLabel('Your question',{exact:true}).fill(question);
 await page.getByRole('button',{name:'Open free consumer rights guide',exact:true}).click();
 await expect(page.getByLabel('What kind of problem is it?')).toHaveValue('UNAUTHORIZED_DEBIT_ORDER');
 await expect(page.getByLabel('What happened? (redact personal details)')).toHaveValue('');
 await page.getByRole('link',{name:'Return to my Chat draft',exact:true}).click();
 await expect(page.getByLabel('Your question',{exact:true})).toHaveValue(question);
 await page.getByRole('checkbox',{name:/Use this question in the free guide/}).check();
 await page.getByRole('link',{name:'Open free source-linked consumer guide',exact:true}).click();
 await expect(page.getByLabel('What happened? (redact personal details)')).toHaveValue(question);
 await expect(page.getByLabel('What kind of problem is it?')).toHaveValue('UNAUTHORIZED_DEBIT_ORDER');
 expect(page.url()).not.toContain('debit');
 const stored=await page.evaluate(()=>JSON.stringify([localStorage,sessionStorage]));expect(stored).not.toContain(question);
 expect(paid).toBe(0);
});

test('Civic sign-in returns to the same record and keeps only the locally approved question',async({page})=>{
 const paid:string[]=[];page.on('request',r=>{if(r.url().includes('/luqi-core') && r.method()==='POST')paid.push(r.url());});
 await page.goto('/#/chat?evidence=clean-audit');
 const form=page.getByRole('form',{name:'Ask the civic evidence supporter'});
 await form.getByLabel('Question about this evidence',{exact:true}).fill('What does a clean audit not prove?');
 await form.getByRole('checkbox',{name:/Keep this question in this tab/}).check();
 await form.getByRole('link',{name:'Sign in to Luqi',exact:true}).click();
 const login=page.getByRole('region',{name:'Sign in to your Luqi account'});
 await login.getByLabel('Email',{exact:true}).fill('interaction@example.test');
 await login.getByLabel('Password',{exact:true}).fill('synthetic-passphrase-only');
 await login.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(/#\/chat\?evidence=clean-audit$/);
 await expect(form.getByLabel('Question about this evidence',{exact:true})).toHaveValue('What does a clean audit not prove?');
 await expect(form.getByRole('checkbox',{name:/I approve sending/})).not.toBeChecked();expect(paid).toEqual([]);
});

test('academy opens a working practice panel and keeps flashcards aligned with the selected course',async({page})=>{
 const paid:string[]=[];page.on('request',r=>{if(r.method()==='POST')paid.push(r.url());});
 await page.goto('/#/cert-academy');
 await expect(page.getByText('What is the broadcast address and number of usable hosts for the subnet containing the host IP address 172.16.85.45/22?',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Spaced Flashcards',exact:true}).click();
 const card=page.getByRole('button',{name:'Flip current flashcard',exact:true});
 const original=await card.innerText();
 await card.focus();await page.keyboard.press('Space');await expect(card).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Enter');await expect(card).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:/Cisco CCNP Enterprise/}).click();
 await expect(card).not.toHaveText(original);
 await expect(card).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'AI Exam Coach',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Try a question with Luqi',exact:true})).toBeVisible();
 expect(paid).toEqual([]);
});

test('CLI non-success and malformed replies preserve input and state without false execution',async({page})=>{
 let count=0;
 await page.route('**/api/v1/cert-academy/cli-eval',r=>{count++;return r.fulfill({status:503,json:{code:'SYNTHETIC_UNAVAILABLE'}});});
 await page.goto('/#/networking-lab');
 const command=page.getByLabel('Practice command',{exact:true});
 await command.fill('definitely-not-a-command');await page.getByRole('button',{name:'Run practice command',exact:true}).click();
 await expect(page.locator('[role="status"]').filter({hasText:'practice result'})).toContainText('practice result could not be confirmed');
 await expect(command).toHaveValue('definitely-not-a-command');
 await expect(page.getByText('% Executed: definitely-not-a-command',{exact:true})).toHaveCount(0);expect(count).toBe(1);
 await page.route('**/api/v1/cert-academy/cli-eval',r=>r.fulfill({json:{output:'Bad success',nextMode:'undefined',prompt:'x'}}));
 await page.getByRole('button',{name:'Run practice command',exact:true}).click();
 await expect(command).toHaveValue('definitely-not-a-command');await expect(page.getByText('Bad success',{exact:true})).toHaveCount(0);
 await page.route('**/api/v1/cert-academy/cli-eval',r=>r.fulfill({json:{output:'',nextMode:'privileged',prompt:'Router#',executedCommand:'enable'}}));
 await command.fill('enable');await page.getByRole('button',{name:'Run practice command',exact:true}).click();
 await expect(command).toHaveValue('');await expect(page.getByText('Router#',{exact:true})).toBeVisible();
});

test('workspace search exposes Civic and balloon tools and desktop navigation fits',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#/');
 await page.getByLabel('Filter workspace tools',{exact:true}).fill('voting');
 await expect(page.getByRole('article').getByRole('heading',{name:'Civic Evidence Desk',exact:true})).toBeVisible();
 await page.getByLabel('Filter workspace tools',{exact:true}).fill('balloon');
 await expect(page.getByRole('article').getByRole('heading',{name:'Consumer rights & complaint help',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
 await page.getByText('More services',{exact:true}).click();
 await expect(page.getByRole('link',{name:'Civic evidence',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('.luqi-more-services')).not.toHaveAttribute('open','');
 await page.screenshot({path:testInfo.outputPath('audit-repaired-navigation.png'),fullPage:false});
});
