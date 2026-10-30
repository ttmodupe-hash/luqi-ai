import{test,expect,type Page}from'@playwright/test';
import mysql from'mysql2/promise';
import{randomUUID}from'node:crypto';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
async function signup(page:Page,email:string){
 await page.goto('/#/join');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('Synthetic-Business-Test-Password!');await page.getByLabel('Confirm password',{exact:true}).fill('Synthetic-Business-Test-Password!');
 await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('heading',{name:'Luqi Chat',exact:true})).toBeVisible();
}
async function directory(page:Page){
 await page.goto('/#/');
 const menu=page.getByRole('button',{name:'Open navigation',exact:true});if(await menu.isVisible())await menu.click();
 await page.locator('a[href="#/businesses"]:visible').first().click();await expect(page.getByRole('heading',{name:'Find the people behind local services'})).toBeVisible();
 await page.getByRole('link',{name:'Create or manage my business',exact:true}).click();await expect(page.getByRole('heading',{name:'Bring your business into view'})).toBeVisible();
}
test('owner registration, reviewed publication, private contacts, pause and deletion use real MySQL on mobile',async({page,browser,baseURL})=>{
 if(process.env.DATABASE_URL!==ROOT||process.env.LUQI_MYSQL_CI_FIXTURE!=='true')throw Error('Refusing non-disposable business fixture');
 await page.setViewportSize({width:320,height:840});
 const reviewerContext=await browser.newContext({baseURL,ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width:390,height:844}}),guestContext=await browser.newContext({baseURL,ignoreHTTPSErrors:true,serviceWorkers:'block'});
 const reviewer=await reviewerContext.newPage(),guest=await guestContext.newPage(),email='owner-'+randomUUID()+'@example.invalid',reviewEmail='review-'+randomUUID()+'@example.invalid',name='Synthetic Mabopane business '+randomUUID().slice(0,8),privateEmail='private-contact-'+randomUUID()+'@example.com';
 const paid:string[]=[],auth:string[]=[];
 for(const p of[page,reviewer,guest])p.on('request',r=>{if(r.method()==='POST'&&/\/auth\/(login|register)$/.test(new URL(r.url()).pathname))auth.push(new URL(r.url()).pathname);if(/generativelanguage|openai\.com/.test(r.url())||r.method()==='POST'&&/\/api\/v1\/(?:luqi-core|guest-trial|guest-chat|ai-pilot)/.test(r.url()))paid.push(r.url());});
 await signup(reviewer,reviewEmail);const root=await mysql.createConnection(ROOT);try{await root.execute("INSERT INTO luqi_business_reviewers_v1(user_id,active) SELECT id,1 FROM users WHERE email=?",[reviewEmail]);}finally{await root.end();}
 await signup(page,email);await directory(page);
 await page.getByLabel('Business or trading name',{exact:true}).fill(name);await page.getByLabel('Business category',{exact:true}).selectOption('trades');await page.getByLabel('Describe your business',{exact:true}).fill('A synthetic fixture repair business; this is never enrolled in production.');
 await page.getByLabel('Services or products (one per line, up to 12)',{exact:true}).fill('Appliance repairs');await page.getByLabel('Province',{exact:true}).selectOption('GP');await page.getByLabel('Town, township or village',{exact:true}).fill('Mabopane');await page.getByLabel('Service area and useful locality or landmark',{exact:true}).fill('Mabopane by arrangement; no home address');
 await page.getByLabel('Business phone',{exact:true}).fill('+27125550123');await page.getByLabel('Business email',{exact:true}).fill(privateEmail);await page.getByLabel('Make this phone public after review',{exact:true}).check();await page.getByRole('button',{name:'Save private draft',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Private draft saved');await expect(page.getByRole('region',{name:'Business publication controls'}).getByRole('link',{name:'Email business',exact:true})).toHaveCount(0);
 await page.getByLabel(/I am authorised to manage this business/).check();await page.getByRole('button',{name:'Request publication review',exact:true}).click();await expect(page.getByRole('status')).toContainText('Publication review requested');
 await directory(reviewer);await reviewer.getByRole('link',{name:'Review publication requests',exact:true}).click();const item=reviewer.getByRole('region',{name:'Review '+name,exact:true});await expect(item).toBeVisible();await expect(item.getByText(privateEmail,{exact:true})).toHaveCount(0);
 await item.getByLabel(/I reviewed the proposed public information/).check();await item.getByRole('button',{name:'Approve selected public fields',exact:true}).click();await expect(reviewer.getByRole('status')).toContainText('Review decision recorded');
 await page.getByRole('button',{name:'Refresh saved profiles',exact:true}).click();await expect(page.getByRole('link',{name:'Open public profile',exact:true})).toBeVisible();const href=await page.getByRole('link',{name:'Open public profile',exact:true}).getAttribute('href');expect(href).toMatch(/^#\/businesses\/[a-f0-9-]{36}$/);
 await guest.goto('/'+href);await expect(guest.getByRole('heading',{name,exact:true})).toBeVisible();await expect(guest.getByRole('link',{name:'Call +27125550123',exact:true})).toBeVisible();await expect(guest.getByText(privateEmail,{exact:true})).toHaveCount(0);await expect(guest.getByRole('link',{name:/Open public trading address/})).toHaveCount(0);
 await page.getByRole('button',{name:name+' · published',exact:true}).click();await page.getByRole('button',{name:'Pause public listing',exact:true}).click();await expect(page.getByRole('status')).toContainText('Profile paused');await guest.reload();await expect(guest.getByRole('status')).toContainText('not publicly available');
 await page.getByLabel(/Delete this saved profile, its active reports/).check();await page.getByRole('button',{name:'Delete saved business profile',exact:true}).click();await expect(page.getByRole('status')).toContainText('Profile deleted');
 expect(auth).toEqual(['/api/v1/auth/register','/api/v1/auth/register']);expect(paid).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await reviewerContext.close();await guestContext.close();
});
