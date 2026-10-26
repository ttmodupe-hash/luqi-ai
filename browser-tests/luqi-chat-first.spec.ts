import { expect, test, type Page } from '@playwright/test';

async function openCustomerTool(page: Page, label: string) {
  const desktop = page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: label, exact: true });
  if (await desktop.isVisible()) { await desktop.click(); return; }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: label, exact: true }).click();
}


test('visitor finds the chat-first Africa guide on real browser engines without paid calls', async ({ page }) => {
  const paidRequests: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core(?:\?|$)/.test(request.url())) {
      paidRequests.push(request.url());
    }
  });
  await page.goto('/#/chat');
  await expect(page.getByRole('heading', { name: /Tell LUQI what you need/i })).toBeVisible();
  await expect(page.getByLabel('What would you like help with?')).toBeVisible();
  await page.getByRole('button', { name: 'Find somewhere to stay' }).click();
  await expect(page.getByRole('heading', { name: 'Know exactly what you are booking' })).toBeVisible();
  await expect(page.getByText('Booking and checkout unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: /Book now|Pay now|Confirm reservation/i })).toHaveCount(0);
  expect(paidRequests).toHaveLength(0);
});

test('traveller can describe a need and is directed to a real local tool', async ({ page }) => {
  await page.goto('/#/chat');
  await page.getByLabel('What would you like help with?').fill('Help me prepare for my exam');
  await page.getByRole('button', { name: 'Find my next step' }).click();
  await expect(page.getByRole('heading', { name: 'Make learning more practical' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open study desk' })).toHaveAttribute('href', '#/study-desk');
});

test('persistent Ask LUQI link is visible and usable at narrow iPhone width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 690 });
  await page.goto('/#/omega-tasks');
  const chat = page.getByRole('link', { name: 'Ask LUQI' });
  await expect(chat).toBeVisible();
  await chat.click();
  await expect(page.getByRole('heading', { name: /Tell LUQI what you need/i })).toBeVisible();
});


test('one LUQI login works for private Notes, Chat and Omega without repeated credentials or paid calls', async ({ page }) => {
  const auth: string[] = [], paid: string[] = [];
  await page.route('**/api/v1/auth/login', route => {
    auth.push(route.request().url());
    return route.fulfill({ json: { token: 'synthetic-session', user: { email: 'single-session@example.invalid' } } });
  });
  await page.route('**/api/v1/companion/conversations?*', route =>
    route.fulfill({ json: { conversations: [] } }));
  await page.route('**/api/v1/omega/tasks/status', route =>
    route.fulfill({ json: { intake: 'disabled', execution: 'disabled', workerVerified: false, handlers: [] } }));
  await page.route('**/v1/readiness', route =>
    route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } }));
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core(?:\?|$)/.test(request.url())) paid.push(request.url());
  });
  await page.goto('/#/companion');
  await page.getByLabel('Email', { exact: true }).fill('single-session@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh saved history' })).toBeVisible();
  await page.getByRole('link', { name: 'Ask LUQI', exact: true }).click();
  await expect(page.getByLabel('Your question')).toBeVisible();
  await expect(page.getByText(/Signed in as single-session@example.invalid/)).toBeVisible();
  await openCustomerTool(page, 'Omega tasks');
  await expect(page.getByRole('heading', { name: 'Tasks are not enabled yet' })).toBeVisible();
  await openCustomerTool(page, 'Private notes');
  await expect(page.getByRole('button', { name: 'Refresh saved history' })).toBeVisible();
  expect(auth).toHaveLength(1);
  expect(paid).toHaveLength(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('link', { name: 'Ask LUQI', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to your LUQI account' })).toBeVisible();
  expect(auth).toHaveLength(1);
});

test('one goal-first Chat journey leads to optional AI on mobile; Notes remain optional', async ({ page }) => {
  const paid: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core(?:\?|$)/.test(request.url())) paid.push(request.url());
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/chat');
  const primary = page.getByRole('heading', { name: 'Chat with LUQI', exact: true });
  const ai = page.getByRole('heading', { name: 'Try a question with LUQI' });
  const local = page.getByRole('heading', { name: /Tell LUQI what you need/ });
  await expect(primary).toBeVisible();
  await expect(ai).toBeVisible();
  await expect(local).toBeVisible();
  const first = await local.boundingBox(), second = await ai.boundingBox();
  expect(first).not.toBeNull(); expect(second).not.toBeNull();
  expect(first!.y).toBeLessThan(second!.y);
  await page.getByRole('button', { name: 'Go straight to AI Chat' }).click();
  await expect(page.getByRole('heading', { name: 'Continue with AI Chat' })).toBeVisible();
  await expect(page.getByText(/Notes are optional/).first()).toBeVisible();
  expect(paid).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('visitor can turn a travel goal into a usable provider enquiry without booking or paid calls', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/chat');
  await page.getByRole('button', { name: 'Find somewhere to stay' }).click();
  await expect(page.getByRole('heading', { name: "Here's a useful way forward" })).toBeVisible();
  await page.getByPlaceholder('Cape Town, South Africa').fill('Cape Town');
  await page.getByPlaceholder('10–15 December').fill('10–15 December');
  await page.getByRole('button', { name: 'Prepare provider enquiry' }).click();
  const draft = page.getByLabel('Your editable-by-copy draft (not a booking)');
  await expect(draft).toContainText('DRAFT TRAVEL ENQUIRY');
  await expect(draft).toContainText('Destination: Cape Town');
  await expect(page.getByText('Booking and checkout unavailable')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(writes).toEqual([]);
});
