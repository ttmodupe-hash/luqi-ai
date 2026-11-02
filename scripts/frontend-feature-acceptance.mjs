import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, webkit, expect } from '@playwright/test';

// Only local built assets are served. All API writes and all external requests
// are blocked before transport; no production origin, account or provider is used.
const feature = process.argv[2];
assert.ok(['moon', 'history'].includes(feature), 'Choose moon or history');
const root = resolve('dist/public');
const output = resolve('artifacts/feature-acceptance', feature);
await mkdir(output, { recursive: true });
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.txt':'text/plain', '.woff2':'font/woff2' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) {res.writeHead(404).end(); return;}
    const bytes = await readFile(file);
    res.writeHead(200, {'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {res.writeHead(404).end('Not found');}
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = { feature, testedRevision: process.env.GITHUB_SHA ?? 'local-unrecorded', at: new Date().toISOString(), cases: [], blockedExternal: 0, blockedWrites: 0 };
async function contextFor(browser, viewport) {
  const context = await browser.newContext({viewport, serviceWorkers:'block'});
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if(url.origin !== origin) {report.blockedExternal++; return route.abort();}
    if(!['GET','HEAD'].includes(request.method())) {report.blockedWrites++; return route.abort();}
    if(/^\/(?:api|auth|v1|health)(?:\/|$)/.test(url.pathname)) return route.fulfill({status:503,contentType:'application/json',body:'{"code":"ISOLATED_ACCEPTANCE"}'});
    return route.continue();
  });
  return context;
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1), 'page must not overflow horizontally');
}
async function moonJourney(page, name) {
  await page.goto(origin+'/#/', {waitUntil:'domcontentloaded'});
  const panel = page.locator('.luqi-moon');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('img')).toHaveAttribute('aria-label', /illuminated/);
  const lunarImage = panel.locator('.luqi-moon-globe');
  await expect(lunarImage).toHaveAttribute('data-moon-view', 'phase');
  await expect(lunarImage).toHaveAttribute('data-moon-detail', 'local');
  // The first paint stays entirely local, even on a low-data handset.
  await expect(lunarImage.locator('image')).toHaveCount(2);
  await expect(lunarImage.locator('image').first()).toHaveAttribute('href', '/moon-luqi-art.webp');
  await panel.getByRole('button', {name:'Explore full surface',exact:true}).click();
  await expect(lunarImage).toHaveAttribute('data-moon-view', 'surface');
  await expect(panel.getByText(/not today’s lunar illumination/)).toBeVisible();
  await panel.getByRole('button', {name:'Show NASA Moon image',exact:true}).click();
  await expect(lunarImage).toHaveAttribute('data-moon-detail', 'lro');
  await expect(lunarImage.locator('image')).toHaveCount(2);
  await expect(lunarImage.locator('image').first()).toHaveAttribute('href', /wikimedia\.org/);
  await panel.getByRole('button', {name:'Use low-data Moon',exact:true}).click();
  await expect(lunarImage).toHaveAttribute('data-moon-detail', 'local');
  await expect(lunarImage.locator('image')).toHaveCount(2);
  await expect(lunarImage.locator('image').first()).toHaveAttribute('href', '/moon-luqi-art.webp');
  await panel.getByRole('button', {name:'Current phase',exact:true}).click();
  await expect(lunarImage).toHaveAttribute('data-moon-view', 'phase');
  await panel.getByText('Enter an area manually', {exact:true}).click();
  await panel.getByRole('button',{name:'Apply area',exact:true}).click();
  await expect(panel.getByRole('status')).toContainText('Enter latitude');
  await panel.getByLabel('Latitude',{exact:true}).fill('-26.2');
  await panel.getByLabel('Longitude',{exact:true}).fill('28.04');
  await panel.getByRole('button',{name:'Apply area',exact:true}).click();
  await expect(panel.getByText('Direction from true north',{exact:true})).toBeVisible();
  await expect(panel.getByText('Next estimated moonrise',{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Pause live updates',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Resume live updates',exact:true})).toHaveAttribute('aria-pressed','true');
  await panel.getByRole('button',{name:'Refresh now',exact:true}).click();
  await panel.getByRole('button',{name:'Resume live updates',exact:true}).click();
  await noOverflow(page);
  await panel.screenshot({path:resolve(output,name+'.png')});
  await panel.getByRole('button',{name:'Clear location',exact:true}).click();
  await expect(panel.getByText('Direction from true north',{exact:true})).toHaveCount(0);
  await expect(panel.getByLabel('Latitude',{exact:true})).toHaveValue('');
}
async function historyJourney(page,name) {
  await page.goto(origin+'/#/comparative-evidence',{waitUntil:'domcontentloaded'});
  const panel=page.locator('.luqi-africa-study');
  await expect(panel).toBeVisible();
  await panel.getByRole('button',{name:'Explore African biblical history',exact:true}).click();
  const topics=panel.getByRole('group',{name:'African biblical study topics'}).getByRole('button');
  await expect(topics).toHaveCount(7);
  for(let i=0;i<7;i++) {
    await topics.nth(i).click();
    for(const layer of ['Read the text','Explore the evidence','Compare interpretations','Reflect and discuss']) {
      await panel.getByRole('button',{name:layer,exact:true}).click();
      await expect(panel.getByRole('article').getByRole('heading',{name:layer,exact:true})).toBeVisible();
    }
  }
  await panel.getByRole('button',{name:'Nimrod and early kingdoms',exact:true}).click();
  await expect(panel.getByRole('article')).toContainText('Cush’s son');
  await panel.getByText('Try four evidence-reading questions',{exact:true}).click();
  await panel.getByRole('radio',{name:'Ham',exact:true}).check();
  await expect(panel.getByRole('status')).toContainText('Review the source');
  await panel.getByRole('radio',{name:'Cush',exact:true}).check();
  await expect(panel.getByRole('status')).toContainText('Supported by the source');
  await panel.getByRole('button',{name:'Reset practice answers',exact:true}).click();
  await expect(panel.getByRole('radio',{name:'Cush',exact:true})).not.toBeChecked();
  await noOverflow(page);
  await panel.screenshot({path:resolve(output,name+'.png')});
  await panel.getByRole('button',{name:'Close African history study',exact:true}).click();
  await expect(panel.getByRole('article')).toHaveCount(0);
}
try {
  if(feature==='moon') assert.ok((await readdir(resolve(root,'assets'))).some(name=>/^MoonNowContent-.*\.js$/.test(name)), 'Moon must be a real separate emitted chunk');
  for(const [browserName,browserType] of [['chromium',chromium],['webkit',webkit]]) {
    const browser=await browserType.launch();
    try {
      for(const viewport of [{width:1366,height:900},{width:390,height:844},{width:320,height:740}]) {
        const name=`${feature}-${browserName}-${viewport.width}`;
        const context=await contextFor(browser,viewport);
        try {
          const page=await context.newPage();page.setDefaultTimeout(20000);
          const errors=[];page.on('pageerror',e=>errors.push(e.message));
          await (feature==='moon'?moonJourney:historyJourney)(page,name);
          assert.deepEqual(errors,[], 'no unhandled browser errors on the working journey');
          report.cases.push({name,passed:true}); console.log('PASS',name);
        } finally {await context.close();}
      }
      if(feature==='moon') {
        const context=await contextFor(browser,{width:390,height:844});
        try {
          const pattern='**/assets/MoonNowContent-*.js';
          await context.route(pattern,route=>route.fulfill({status:404,contentType:'text/javascript',body:''}));
          const page=await context.newPage();page.setDefaultTimeout(20000);
          await page.goto(origin+'/#/',{waitUntil:'domcontentloaded'});
          const recovery=page.getByRole('region',{name:'Moon tracker recovery'});
          await expect(recovery.getByRole('alert')).toContainText('other Luqi tools are still available');
          await expect(page.getByRole('heading',{level:1})).toBeVisible();
          await page.getByRole('searchbox',{name:'Filter workspace tools'}).fill('physics');
          await expect(page.getByRole('heading',{name:'Physics lab',exact:true})).toBeVisible();
          await expect(recovery).toContainText('Copy important drafts first');
          await noOverflow(page);
          await recovery.screenshot({path:resolve(output,`moon-${browserName}-missing-chunk.png`)});
          await context.unroute(pattern);
          await Promise.all([page.waitForEvent('load'),recovery.getByRole('button',{name:'Reload page',exact:true}).click()]);
          await expect(page.locator('.luqi-moon')).toBeVisible();
          await expect(page.getByRole('searchbox',{name:'Filter workspace tools'})).toHaveValue('');
          const name=`moon-${browserName}-missing-chunk-manual-reload`;
          report.cases.push({name,passed:true});console.log('PASS',name);
        } finally {await context.close();}
      }
    } finally {await browser.close();}
  }
  assert.equal(report.blockedWrites,0,'the public feature journey must not attempt an account or paid-provider write');
  report.passed=true;
} catch(error) {
  report.passed=false;report.failure=String(error);process.exitCode=1;console.error(error);
} finally {
  await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');
  await new Promise(ok=>server.close(ok));
  console.log(JSON.stringify(report));
}
