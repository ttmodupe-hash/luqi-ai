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
  await page.getByRole('link', { name: 'Create your notes account' }).click();
  await credentials();
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  const registration = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/register'));
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  expect((await registration).status()).toBe(201);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Use an existing account' }).click();
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
