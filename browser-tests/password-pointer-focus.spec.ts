import { test, expect, type Locator } from '@playwright/test';

test('mouse and touch Hide actions remain masked after leaving the revealed input', async ({ page }, testInfo) => {
  const requests: string[] = [];
  await page.route('**/api/**', async route => { requests.push(route.request().url()); await route.abort(); });
  await page.goto('/#/login');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('synthetic-pointer-fixture');
  const activate = async (control: Locator) => {
    if (testInfo.project.use.hasTouch) await control.tap(); else await control.click();
  };
  await activate(page.getByRole('button', { name: 'Show password', exact: true }));
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide password', exact: true })).toBeFocused();
  await password.focus();
  await activate(page.getByRole('button', { name: 'Hide password', exact: true }));
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('synthetic-pointer-fixture');
  expect(requests).toEqual([]);
});
