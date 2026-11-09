import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
async function openWorkspace(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin, writes: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin || /^\/(api|v1)\//.test(url.pathname)) {
      if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
      return route.abort();
    }
    return route.continue();
  });
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/#/township-economy');
  await page.getByRole('button', { name: 'Start my business workbench' }).click();
  await expect(page.getByRole('heading', { name: 'Your business workbench' })).toBeVisible();
  return writes;
}
test('complete price and quotation work without losing the source information or sending inputs', async ({ page, baseURL }, info) => {
  const writes = await openWorkspace(page, baseURL!);
  const sources = page.getByRole('region', { name: 'Township official programmes' });
  await expect(sources.getByRole('link', { name: 'Open original official source' })).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Download my private action plan' })).toHaveCount(1);
  await page.getByLabel('Workbench business name', { exact: true }).fill('Ubuntu Salon');
  await page.getByLabel('What you sell and who you serve').fill('Hair styling for local clients');
  await page.getByLabel('Workbench selling price (ZAR)').fill('150');
  await page.getByLabel('Workbench direct cost per sale (ZAR)').fill('100');
  await page.getByLabel('Workbench fixed costs for the period (ZAR)').fill('1000');
  await page.getByRole('button', { name: 'Calculate my sales target' }).click();
  await expect(page.getByRole('status', { name: 'Workbench pricing result' })).toContainText('20');
  await expect(page.getByRole('status', { name: 'Workbench pricing result' })).toContainText('33.33%');
  await page.getByLabel('Workbench customer name').fill('Example client');
  await page.getByLabel('Workbench item 1 description').fill('Hair styling');
  await page.getByLabel('Workbench item 1 quantity').fill('3');
  await page.getByLabel('Workbench item 1 unit price (ZAR)').fill('100.25');
  await page.getByRole('button', { name: 'Add quote item' }).click();
  await page.getByLabel('Workbench item 2 description').fill('Extra item');
  await page.getByLabel('Workbench item 2 unit price (ZAR)').fill('0.10');
  await page.getByRole('button', { name: 'Prepare my quotation' }).click();
  await expect(page.getByRole('status', { name: 'Workbench quotation result' })).toContainText('300.85');
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my quotation' }).click()]);
  expect(file.suggestedFilename()).toBe('luqi-township-quotation.txt');
  expect(readFileSync((await file.path())!, 'utf8')).toContain('SUBTOTAL (EXCLUDING TAXES): R 300.85');
  await page.getByLabel('Workbench item 1 unit price (ZAR)').fill('101');
  await expect(page.getByRole('button', { name: 'Download my quotation' })).toHaveCount(0);
  await expect(sources.getByRole('link', { name: 'Open original official source' })).toHaveCount(8);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Start my business workbench' }).click();
  await page.screenshot({ path: info.outputPath('township-workbench.png') });
});
test('unfinished project download restores context and progress only after confirmation', async ({ page, baseURL }) => {
  await openWorkspace(page, baseURL!);
  await page.getByLabel('Township business sector').selectOption('beauty');
  await page.getByLabel('Workbench business name', { exact: true }).fill('Saved salon');
  await page.getByLabel('My next actions and questions').fill('Get an equipment quote');
  await page.getByRole('region', { name: 'Business preparation workspace' }).getByRole('checkbox').first().check();
  await page.getByLabel('Workbench item 1 description').fill('Unfinished line');
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save editable business project' }).click()]);
  const buffer = readFileSync((await file.path())!);
  expect(JSON.parse(buffer.toString()).completedSteps).toHaveLength(1);
  await page.reload();
  await page.getByLabel('Restore business project (.json)').setInputFiles({ name: file.suggestedFilename(), mimeType: 'application/json', buffer });
  await expect(page.getByLabel('Workbench business name', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Restore this project' }).click();
  await expect(page.getByLabel('Township business sector')).toHaveValue('beauty');
  await expect(page.getByLabel('Workbench business name', { exact: true })).toHaveValue('Saved salon');
  await expect(page.getByLabel('My next actions and questions')).toHaveValue('Get an equipment quote');
  await expect(page.getByRole('region', { name: 'Business preparation workspace' }).getByRole('checkbox').first()).toBeChecked();
  await expect(page.getByRole('status', { name: 'Workbench quotation result' })).toHaveCount(0);
  await page.getByLabel('Township business sector').selectOption('food');
  await page.getByLabel('Workbench business name', { exact: true }).fill('Second business');
  await page.getByLabel('Township business sector').selectOption('beauty');
  await expect(page.getByLabel('Workbench business name', { exact: true })).toHaveValue('Saved salon');
  const tampered = { ...JSON.parse(buffer.toString()), verified: true };
  await page.getByLabel('Restore business project (.json)').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(tampered)) });
  await expect(page.getByRole('alert')).toContainText('Your current work was not replaced');
  await expect(page.getByLabel('Workbench business name', { exact: true })).toHaveValue('Saved salon');
});
test('late file reads never replace edits, and restore may be cancelled', async ({ page, baseURL }) => {
  await openWorkspace(page, baseURL!);
  await page.getByLabel('Workbench business name', { exact: true }).fill('Original');
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save editable business project' }).click()]);
  const buffer = readFileSync((await file.path())!);
  await page.getByLabel('Restore business project (.json)').setInputFiles({ name: file.suggestedFilename(), mimeType: 'application/json', buffer });
  await page.getByRole('button', { name: 'Cancel restore' }).click();
  await expect(page.getByRole('button', { name: 'Restore this project' })).toHaveCount(0);
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function() {
      const file = this;
      return new Promise<string>(resolve => { (window as unknown as { finishFileRead: () => void }).finishFileRead = () => { void original.call(file).then(resolve); }; });
    };
  });
  await page.getByLabel('Restore business project (.json)').setInputFiles({ name: file.suggestedFilename(), mimeType: 'application/json', buffer });
  await page.getByLabel('Workbench business name', { exact: true }).fill('Newer edit');
  await page.evaluate(() => (window as unknown as { finishFileRead: () => void }).finishFileRead());
  await expect(page.getByRole('button', { name: 'Restore this project' })).toHaveCount(0);
  await expect(page.getByLabel('Workbench business name', { exact: true })).toHaveValue('Newer edit');
});
test('keyboard task navigation and invalid economics remain usable on narrow screens', async ({ page, baseURL }) => {
  await openWorkspace(page, baseURL!);
  const action = page.getByRole('button', { name: 'Check pricing', exact: true });
  await action.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Workbench pricing calculator' })).toBeFocused();
  await page.getByLabel('Workbench selling price (ZAR)').fill('150');
  await page.getByLabel('Workbench direct cost per sale (ZAR)').fill('170');
  await page.getByLabel('Workbench fixed costs for the period (ZAR)').fill('1000');
  await page.getByRole('button', { name: 'Calculate my sales target' }).click();
  await expect(page.getByRole('status', { name: 'Workbench pricing result' })).toContainText('Not achievable at this price');
  await page.getByLabel('Workbench selling price (ZAR)').fill('-1');
  await expect(page.getByRole('status', { name: 'Workbench pricing result' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Calculate my sales target' }).click();
  await expect(page.getByRole('alert')).toContainText('nonnegative ZAR');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
