import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('Luqi has a shareable Android and iPhone install page from the homepage', async ({ page }) => {
  const paid: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET') paid.push(request.url());
  });
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Install Luqi on your phone' }).click();
  await expect(page).toHaveURL(/#\/install$/);
  await expect(page.getByRole('heading', { name: 'Take Luqi with you.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'On Android' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'On iPhone or iPad' })).toBeVisible();
  await expect(page.getByText(/browser may create its own managed Android package/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Huawei, Xiaomi, Oppo and other Android phones' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep Luqi up to date' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Luqi Chat' })).toHaveAttribute('href', '#/chat');
  expect(paid).toEqual([]);
});

test('install guidance works without a browser prompt on a 320px phone and never offers a sideload', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/download');
  await expect(page.getByRole('heading', { name: 'Take Luqi with you.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install Luqi now' })).toHaveCount(0);
  const safety = page.getByRole('region', { name: 'Install safely on your phone' });
  await expect(safety).toContainText('Do not choose “Install anyway”, switch off Play Protect or other protections');
  await expect(safety).toContainText('Website or connection warning');
  await expect(safety).toContainText('Browser or phone restriction');
  await expect(page.getByText(/If neither Install nor Add to Home screen is offered/)).toBeVisible();
  expect(await page.locator('a[href$=".apk"], a[download]').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(writes).toEqual([]);
});

test('only a user click opens a synthetic browser install prompt', async ({ page }) => {
  await page.goto('/#/install');
  await expect(page.getByRole('button', { name: 'Install Luqi now' })).toHaveCount(0);
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', { value: async () => {
      document.body.dataset.luqiInstallPromptCalled = 'yes';
    } });
    Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(event);
  });
  const button = page.getByRole('button', { name: 'Install Luqi now' });
  await expect(button).toBeVisible();
  await expect(page.locator('body')).not.toHaveAttribute('data-luqi-install-prompt-called', 'yes');
  await button.click();
  await expect(page.locator('body')).toHaveAttribute('data-luqi-install-prompt-called', 'yes');
  await expect(page.getByText('Installation not completed.', { exact: false })).toBeVisible();
});

test('only the browser appinstalled event confirms an installation', async ({ page }) => {
  await page.goto('/#/install');
  await expect(page.getByText(/Luqi is running as an installed app/)).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.getByText(/Luqi is running as an installed app/)).toBeVisible();
});
