import { expect, test } from '@playwright/test';

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
