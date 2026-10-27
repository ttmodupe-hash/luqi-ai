import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });

test('anonymous visitors can prepare a clearer request on 320px phones without metered AI calls', async ({ page, baseURL }) => {
  let paidCalls = 0;
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: {
      checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
    } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: {
      token: 'synthetic-anonymous-coach-account', user: { email: 'coach@example.invalid' },
    } });
    if (url.pathname === '/api/v1/luqi-core') { paidCalls++; return route.abort(); }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Tell Luqi what you need' }).click();
  await expect(page).toHaveURL(/#\/ask$/);
  const need = page.getByLabel('What would you like help with?');
  await need.fill('Plese help me plan my small business');
  await expect(need).toHaveAttribute('spellcheck', 'true');
  await page.getByRole('button', { name: 'Apply suggestion' }).click();
  await expect(need).toHaveValue('Please help me plan my small business');
  await page.locator('section.luqi-guide-hero details.luqi-prompt-coach > summary').click();
  await page.getByLabel('What would help most?').selectOption('plan');
  await page.getByLabel('How should Luqi answer?').selectOption('steps');
  await page.getByRole('button', { name: 'Suggest a clearer question' }).click();
  await expect(page.getByLabel('Review the suggested question')).toHaveValue(/practical next steps/);
  await page.getByRole('button', { name: 'Use this question' }).click();
  await expect(page.getByText(/Your reviewed draft is ready in optional AI Chat below/)).toBeVisible();
  expect(paidCalls).toBe(0);
  await page.getByLabel('Email', { exact: true }).fill('coach@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Synthetic-2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Your question', { exact: true })).toHaveValue(/practical next steps/);
  await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
  expect(paidCalls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('emergencies do not get directed to the AI prompting helper', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', req => { if (req.method() === 'POST') writes.push(req.url()); });
  await page.goto('/#/ask');
  await page.getByLabel('What would you like help with?').fill('Emergency, I need an ambulance now.');
  await page.locator('section.luqi-guide-hero details.luqi-prompt-coach > summary').click();
  await expect(page.getByRole('button', { name: 'Suggest a clearer question' })).toBeDisabled();
  await page.getByRole('button', { name: 'Find my next step' }).click();
  await expect(page.getByRole('heading', { name: 'Your safety comes first' })).toBeVisible();
  expect(writes).toEqual([]);
});
