import{test,expect,type Page}from'@playwright/test';
import mysql from'mysql2/promise';
import{randomUUID}from'node:crypto';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
async function signup(page:Page,email:string){
 await page.goto('/#/join');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('Synthetic-Preview-Test-Password!');await page.getByLabel('Confirm password',{exact:true}).fill('Synthetic-Preview-Test-Password!');
 await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('heading',{name:'Luqi Chat',exact:true})).toBeVisible();
}
test('private owner preview uses the same login, isolates scripts and saves a device-only brief',async({page,browser,baseURL})=>{
 if(process.env.DATABASE_URL!==ROOT||process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.GITHUB_ACTIONS!=='true')throw Error('Refusing non-disposable preview fixture');
 const owner='private-preview-owner@example.invalid',other='private-preview-other-'+randomUUID()+'@example.invalid';
 const root=await mysql.createConnection(ROOT);const strangerContext=await browser.newContext({baseURL,ignoreHTTPSErrors:true,serviceWorkers:'block'});const stranger=await strangerContext.newPage();
 const remote:string[]=[];page.on('request',r=>{if(/openai\.com|generativelanguage|\/ai-pilot\//.test(r.url()))remote.push(r.url());});
 try{
  await page.setViewportSize({width:320,height:840});
  await page.goto('/#/business-connect/preview');await expect(page.getByRole('link',{name:'Use my Luqi login'})).toBeVisible();await expect(page.locator('iframe[title="Private Luqi Business Connect interactive preview"]')).toHaveCount(0);
  await signup(stranger,other);await stranger.goto('/#/business-connect/preview');await expect(stranger.getByRole('alert')).toContainText('configured Luqi owner');await expect(stranger.locator('iframe[title="Private Luqi Business Connect interactive preview"]')).toHaveCount(0);
  await signup(page,owner);await page.goto('/#/business-connect/preview');
  const element=page.locator('iframe[title="Private Luqi Business Connect interactive preview"]');await expect(element).toBeVisible();
  const frame=page.frameLocator('iframe[title="Private Luqi Business Connect interactive preview"]');await expect(frame.locator('.brand')).toBeVisible();
  await frame.locator('[data-service="build"]').first().click();await frame.locator('[name="businessName"]').fill('Synthetic Bakery');await frame.locator('[name="goal"]').fill('Let local customers request catering and browse the menu.');await frame.locator('[name="localConsent"]').check();await frame.getByRole('button',{name:'Save project request draft',exact:true}).click();await expect(frame.getByRole('heading',{name:'Synthetic Bakery',exact:true})).toBeVisible();
  expect(await frame.locator('html').evaluate(()=>{try{void parent.document.body;return false;}catch{return true;}})).toBe(true);
  const values=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('luqi:private-business-preview:v2:')).map(k=>localStorage.getItem(k)));
  expect(values.length).toBe(1);expect(values[0]).toContain('Synthetic Bakery');expect(values[0]).not.toContain('Bearer');
  await frame.locator('#mainDialog .dialog-header [data-action="close"]').click();await frame.locator('#language').selectOption('nso');await expect(frame.locator('html')).toHaveAttribute('lang','nso');
  expect(await frame.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(remote).toEqual([]);
 }finally{
  await strangerContext.close();
  // Fixed disposable database, exact synthetic identities; no production cleanup path.
  await root.execute("DELETE FROM users WHERE email IN (?,?) AND role='user'",[owner,other]);await root.end();
 }
});
