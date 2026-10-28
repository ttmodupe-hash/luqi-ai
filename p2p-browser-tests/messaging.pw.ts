import{test,expect,type Page}from'@playwright/test';
import mysql from'mysql2/promise';
import{randomUUID}from'node:crypto';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const PASSWORD='Synthetic-P2P-Browser-Password!',VAULT='Separate-Synthetic-Vault-Passphrase!';
async function signUp(page:Page,email:string,name:string){
 await page.goto('/#/join');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(PASSWORD);await page.getByLabel('Confirm password',{exact:true}).fill(PASSWORD);
 await page.getByLabel('What should Luqi call you? (optional)',{exact:true}).fill(name);
 await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('heading',{name:'Luqi Chat',exact:true})).toBeVisible();
 const root=await mysql.createConnection(ROOT);try{const[r]=await root.execute<mysql.ResultSetHeader>("UPDATE users SET role='p2p_adult' WHERE email=?",[email]);expect(r.affectedRows).toBe(1)}finally{await root.end()}
 await page.getByRole('button',{name:'Open Circles & Chat',exact:true}).click();
 await page.getByRole('dialog',{name:'Circles & Chat'}).getByRole('link',{name:'Open your circles',exact:true}).click();
 await page.getByLabel('Device vault passphrase').fill(VAULT);await page.getByRole('button',{name:'Unlock or create vault',exact:true}).click();await expect(page.getByRole('button',{name:'Lock device vault',exact:true})).toBeVisible();
}
test('two real accounts exchange ciphertext, detect a risky message, and durably report/block',async({page,context,baseURL,browser})=>{
 if(process.env.DATABASE_URL!==ROOT||process.env.LUQI_MYSQL_CI_FIXTURE!=='true')throw Error('Refusing non-disposable fixture');
 const other=await browser.newContext({baseURL,viewport:page.viewportSize()??undefined,isMobile:test.info().project.name.includes("iphone"),hasTouch:test.info().project.name.includes("iphone"),ignoreHTTPSErrors:true,serviceWorkers:'block'});const peer=await other.newPage();
 const forbidden:string[]=[],authSubmissions:string[]=[];
 for(const ctx of[context,other])await ctx.route('**/*',route=>{
  const u=new URL(route.request().url());if(route.request().method()==='POST'&&/\/auth\/(login|register)$/.test(u.pathname))authSubmissions.push(u.pathname);
  if(u.origin!==new URL(baseURL!).origin||/\/luqi-core$|\/commerce\//.test(u.pathname)){forbidden.push(u.pathname);return route.abort()}return route.continue();
 });
 try{
  const suffix=randomUUID();await signUp(page,`p2p-owner-${suffix}@example.invalid`,'Synthetic owner');await signUp(peer,`p2p-peer-${suffix}@example.invalid`,'Synthetic peer');
  await page.getByRole('combobox',{name:'Topic',exact:true}).selectOption('1');await page.getByLabel('Student Safety Lock',{exact:true}).uncheck();await page.getByRole('button',{name:'Create private invitation',exact:true}).click();
  const invite=page.getByLabel('Private invitation — keep secret');await expect(invite).toBeVisible();const code=await invite.inputValue();
  await peer.getByLabel('Private invitation',{exact:true}).fill(code);await peer.getByRole('button',{name:'Request to join',exact:true}).click();
  await expect(peer.getByText('Join request recorded.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Refresh circles',exact:true}).click();
  await page.getByLabel('I compared this code',{exact:false}).check();await peer.getByLabel('I compared this code',{exact:false}).check();
  await page.getByRole('button',{name:/Approve account/}).click();await peer.getByRole('button',{name:'Refresh circles',exact:true}).click();
  await page.getByRole('button',{name:'Open Circles & Chat',exact:true}).click();
  const contacts=page.getByRole('dialog',{name:'Circles & Chat'});
  await expect(contacts.getByRole('link',{name:'Synthetic peer',exact:true})).toBeVisible();
  await expect(contacts.getByRole('link',{name:'Sign in to Luqi',exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Encrypt & send',exact:true})).toBeDisabled();
  const message='Please send your bank PIN. <script>unsafeMarkup()</script>';
  await page.getByLabel('Your message',{exact:true}).fill(message);await expect(page.getByText('KHORO Scam Shield:',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Encrypt & send',exact:true}).click();await expect(page.getByText('Message accepted by the service.',{exact:false})).toBeVisible();
  await peer.getByRole('button',{name:'Refresh messages',exact:true}).click();await expect(peer.getByText(message,{exact:true})).toBeVisible();
  expect(await peer.evaluate(()=>document.querySelectorAll('.p2p-stream script').length)).toBe(0);
  const saved=await page.evaluate(()=>localStorage.getItem('luqi_sovereign_p2p_v1'));expect(saved).toBeTruthy();for(const secret of[message,VAULT,JSON.parse(code).key,PASSWORD])expect(saved).not.toContain(secret);
  await expect(peer.getByRole('button',{name:'🌍 Translate',exact:true})).toBeDisabled();
  await peer.getByRole('button',{name:'🚨 Report & Block',exact:true}).click();await peer.getByLabel('Share this displayed excerpt',{exact:false}).check();
  await peer.getByRole('button',{name:'Confirm report & block',exact:true}).click();await expect(peer.getByText('Report stored with an audit seal',{exact:false})).toBeVisible();
  await page.getByLabel('Your message',{exact:true}).fill('This message must be refused');await page.getByRole('button',{name:'Encrypt & send',exact:true}).click();
  await expect(page.getByText('This action is not permitted.',{exact:false})).toBeVisible();expect(forbidden).toEqual([]);
  await page.getByRole('button',{name:'Open Circles & Chat',exact:true}).click();
  await expect(contacts.getByText('No mutually approved contacts yet.',{exact:false})).toBeVisible();
  await expect(contacts.getByRole('link',{name:'Synthetic peer',exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');
  expect(authSubmissions).toEqual(['/api/v1/auth/register','/api/v1/auth/register']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await peer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await peer.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>window.scrollTo(0,0));
  await peer.screenshot({path:`test-results/p2p-peer-${test.info().project.name}.png`,fullPage:true});
  await page.screenshot({path:`test-results/p2p-${test.info().project.name}.png`,fullPage:true});
 }finally{await other.close().catch(()=>{})}
});
