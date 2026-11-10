import { test, expect } from '@playwright/test';

test('quantum lab calculates locally, runs real worker primitives and exports an honest notebook', async ({ page, baseURL }, info) => {
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin || /^\/(api|auth|v1)\//.test(url.pathname)) {
      unexpected.push(url.origin + url.pathname); return route.abort();
    }
    return route.continue();
  });
  await page.goto('/#/quantum-lab');
  await expect(page.getByRole('heading', { name: 'Quantum & PQC Lab', exact: true })).toBeVisible();
  await expect(page.getByText('Entanglement entropy', { exact: true }).locator('..')).toContainText('1.000000 bits');
  await page.getByLabel('Circuit preset', { exact: true }).selectOption('uniform');
  await expect(page.getByText('Entanglement entropy', { exact: true }).locator('..')).toContainText('0.000000 bits');
  await expect(page.getByText('Basis measurement entropy', { exact: true }).locator('..')).toContainText('2.000000 bits');
  await page.getByLabel('Circuit preset', { exact: true }).selectOption('grover');
  await page.getByLabel('Marked basis state', { exact: true }).selectOption('2');
  expect(Number(await page.getByRole('meter', { name: 'Probability of 10' }).getAttribute('value'))).toBeCloseTo(1, 12);
  await page.getByLabel('Grover iterations', { exact: true }).fill('2');
  expect(Number(await page.getByRole('meter', { name: 'Probability of 10' }).getAttribute('value'))).toBeCloseTo(0.25, 12);
  await page.getByRole('button', { name: 'Scan p=1 parameter grid' }).click();
  await expect(page.getByText(/Compared 225 parameter pairs/)).toBeVisible();
  await page.getByLabel('Code distance', { exact: true }).selectOption('3');
  await expect(page.getByText('Patch qubits', { exact: true }).locator('..')).toContainText('17 (9 data + 8 syndrome)');
  await page.getByLabel('Physical error probability', { exact: true }).fill('0.1');
  await expect(page.getByText('Outside below-threshold model', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run public-message PQC checks' }).click();
  await expect(page.getByRole('status', { name: 'PQC experiment status' })).toHaveText('Public-message checks passed', { timeout: 15000 });
  await expect(page.getByText('ML-KEM public key / ciphertext:', { exact: false })).toContainText('1568 / 1568');
  await expect(page.getByText('ML-KEM public key / ciphertext:', { exact: false })).toContainText('2592 / 4627');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download experiment notebook' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('luqi-quantum-lab-v18.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const notebook = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(notebook.productionProtectionChanged).toBe(false);
  expect(notebook.pqcExperimentScope).toContain('not a signature over this notebook');
  expect(notebook.optimization.exactAllocation.selected).toEqual(['Tools', 'Training']);
  expect(notebook.optimization.exactTour.cost).toBe(18);
  expect(notebook.pqcExperiment.signatureVerified).toBe(true);
  expect(notebook.pqcExperiment.fipsValidated).toBe(false);
  expect(notebook).not.toHaveProperty('secretKey');
  expect(unexpected).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('quantum-lab.png'), fullPage: true });
});
