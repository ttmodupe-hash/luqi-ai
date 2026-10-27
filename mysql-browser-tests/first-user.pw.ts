import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Real production bundle, HTTP server and MySQL. No API response mocks, no
// production account and no provider credentials. External requests are denied.
test('first user registers, saves, reloads, signs in, exports and deletes owned notes', async ({ page, baseURL }) => {
  const external: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) { external.push(url.origin); return route.abort(); }
    return route.continue();
  });
  const email = `ci-browser-${randomUUID()}@example.invalid`;
  const password = 'Synthetic-CI-Browser-Password-2026!';
  const title = 'Synthetic real MySQL browser notes';
  const content = 'Synthetic stored message — Sawubona. <script>plain text</script>';
  const credentials = async () => {
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
  };
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await page.getByRole('link', { name: 'Create your LUQI account' }).click();
  await credentials();
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  const registration = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  expect((await registration).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'LUQIChat' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open saved private notes' })).toBeVisible();
  await page.getByRole('link', { name: 'Open saved private notes' }).click();
  await expect(page.getByLabel('Conversation title')).toBeVisible();
  await page.getByLabel('Conversation title').fill(title);
  await page.getByRole('button', { name: 'Create conversation', exact: true }).click();
  await page.getByLabel('Your message', { exact: true }).fill(content);
  await page.getByRole('button', { name: 'Save message', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Message saved');
  await expect(page.getByText(content, { exact: true })).toBeVisible();
  const otherTitle = 'Second synthetic owned topic', otherContent = 'Another saved CI note';
  await page.getByLabel('Conversation title').fill(otherTitle);
  await page.getByRole('button', { name: 'Create conversation', exact: true }).click();
  await page.getByLabel('Your message', { exact: true }).fill(otherContent);
  await page.getByRole('button', { name: 'Save message', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Message saved');
  await page.reload();
  await expect(page.getByText(content, { exact: true })).toHaveCount(0);
  // A full reload deliberately expires the tab-memory token; Notes now opens
  // its sign-in form directly, with no account creation or AI provider call.
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await credentials();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: title, exact: true }).click();
  await expect(page.getByText(content, { exact: true })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected conversation' }).click();
  const stream = await (await downloading).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(exported.format).toBe('luqi.conversation.v1');
  expect(exported.conversation.title).toBe(title);
  expect(exported.messages).toMatchObject([{ role: 'user', content }]);
  const archiveDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all saved notes' }).click();
  const archive = await archiveDownload;
  expect(archive.suggestedFilename()).toBe('luqi-private-notes.json');
  const archiveStream = await archive.createReadStream();
  const archiveChunks: Buffer[] = [];
  for await (const chunk of archiveStream!) archiveChunks.push(Buffer.from(chunk));
  const allNotes = JSON.parse(Buffer.concat(archiveChunks).toString('utf8'));
  expect(allNotes.format).toBe('luqi.private-notes.v1');
  expect(allNotes.scope).toBe('saved_notes_only');
  expect(allNotes.conversations.map((c: { title: string }) => c.title)).toEqual([title, otherTitle]);
  expect(allNotes.messages.map((m: { content: string }) => m.content)).toEqual([content, otherContent]);
  await expect(page.getByRole('status')).toContainText('All saved notes download started');
  await page.getByRole('button', { name: 'Delete selected conversation' }).click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page.getByRole('status')).toContainText('deleted from active storage');
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: otherTitle, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await credentials();
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('An account already uses this email');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
  expect(await page.evaluate(secret => [...Object.values(localStorage), ...Object.values(sessionStorage)]
    .some(value => value.includes(secret)), password)).toBe(false);
  expect(external).toEqual([]);
});

test('a user changes a known password, signs in again and keeps saved notes', async ({ page, baseURL }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  const email = `ci-password-browser-${randomUUID()}@example.invalid`;
  const password = 'Synthetic-Browser-Old-Password!', replacement = 'Synthetic-Browser-New-Password!';
  await page.goto('/#/join');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'LUQIChat' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open saved private notes' })).toBeVisible();
  await page.getByRole('link', { name: 'Open saved private notes' }).click();
  await expect(page.getByLabel('Conversation title')).toBeVisible();
  await page.getByLabel('Conversation title').fill('Preserved after password change');
  await page.getByRole('button', { name: 'Create conversation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Conversation saved');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  const fill = async (current: string) => {
    await page.getByLabel('Current password', { exact: true }).fill(current);
    await page.getByLabel('New password', { exact: true }).fill(replacement);
    await page.getByLabel('Confirm new password', { exact: true }).fill(replacement);
  };
  await fill('incorrect-current-password');
  await page.getByRole('button', { name: 'Change password and sign out' }).click();
  await expect(page.getByText('Your current password was not accepted. No password was changed.')).toBeVisible();
  await expect(page.getByLabel('Current password', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Preserved after password change', exact: true })).toBeVisible();
  await fill(password);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('password-settings.png'), fullPage: true });
  await page.getByRole('button', { name: 'Change password and sign out' }).click();
  await expect(page.getByRole('status')).toContainText('Password changed. Older sign-ins');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Email or password was not accepted. Please try again.')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(replacement);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preserved after password change', exact: true })).toBeVisible();
  for (const value of [password, replacement]) expect(await page.evaluate(secret => [...Object.values(localStorage), ...Object.values(sessionStorage)]
    .some(item => item.includes(secret)), value)).toBe(false);
});
