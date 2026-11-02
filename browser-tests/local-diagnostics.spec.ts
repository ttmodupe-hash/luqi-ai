import { expect, test } from '@playwright/test';
test.use({ serviceWorkers:'block' });

test('consented 320px local telemetry observes the homepage journey, never uploads analytics', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const writes: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!['GET','HEAD'].includes(request.method())) writes.push(request.method()+' '+new URL(request.url()).pathname);
  });
  await page.route('**/*', route => {
    const request=route.request(), url=new URL(request.url());
    if (url.origin!==origin) return route.abort();
    if (url.pathname==='/v1/readiness') return route.fulfill({ json:{
      status:'configured_not_verified',
      checks:{ runtime:'up',persistence:'connected',ai_pilot:'configured_not_verified' },
    } });
    if (/^\/(?:api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({width:320,height:800});
  await page.goto('/#/telemetry');
  const toggle=page.getByRole('checkbox',{name:'Enable private in-tab diagnostics'});
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText(/Diagnostics off. Nothing measured or transmitted/)).toBeVisible();
  await toggle.check();
  await expect(page.getByLabel('Homepage goals submitted')).toHaveText('0');
  await page.evaluate(() => { location.hash='#/'; });
  await page.getByRole('textbox',{name:'Ask Luqi anything'}).fill('Help me prepare a business quotation');
  await page.getByRole('button',{name:'Find my next step with Luqi'}).click();
  await expect(page.getByRole('heading',{name:'Put a practical idea to work'})).toBeVisible();
  await page.evaluate(() => { location.hash='#/telemetry'; });
  await expect(page.getByLabel('Homepage goals submitted')).toHaveText('1');
  await expect(page.getByLabel('Local next steps recorded')).toHaveText('1');
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole('button',{name:'Clear local measurements'}).click();
  await expect(page.getByLabel('Homepage goals submitted')).toHaveText('0');
  await toggle.uncheck();
  await expect(page.getByText(/Diagnostics off. Nothing measured or transmitted/)).toBeVisible();
  await toggle.check();
  await expect(page.getByLabel('Homepage goals submitted')).toHaveText('0');
  expect(writes).toEqual([]);
});
