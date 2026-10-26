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

test('persistent Ask LUQI link is visible and usable at narrow iPhone width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 690 });
  await page.goto('/#/omega-tasks');
  const chat = page.getByRole('link', { name: 'Ask LUQI' });
  await expect(chat).toBeVisible();
  await chat.click();
  await expect(page.getByRole('heading', { name: /Tell LUQI what you need/i })).toBeVisible();
});

test('long chat tool status wraps inside the 320px viewport without clipping other tools', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/');
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Ask LUQI', exact: true }) });
  const pill = card.locator('.luqi-status-pill');
  await expect(card).toBeVisible();
  await expect(pill).toContainText('Local guidance');
  const bounds = await pill.evaluate(element => {
    const pill = element.getBoundingClientRect();
    const parent = element.closest('.luqi-tool-card')!.getBoundingClientRect();
    const computed = getComputedStyle(element);
    return { pillLeft: pill.left, pillRight: pill.right, parentLeft: parent.left, parentRight: parent.right,
      viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
      whiteSpace: computed.whiteSpace, overflowWrap: computed.overflowWrap };
  });
  expect(bounds.whiteSpace).toBe('normal');
  expect(bounds.overflowWrap).toBe('anywhere');
  expect(bounds.pillLeft).toBeGreaterThanOrEqual(bounds.parentLeft);
  expect(bounds.pillRight).toBeLessThanOrEqual(bounds.parentRight);
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewport + 1);
});
