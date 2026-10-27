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
  await expect(page.getByText(/not a signed Android APK or an App Store iOS download/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Luqi Chat' })).toHaveAttribute('href', '#/chat');
  expect(paid).toEqual([]);
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
