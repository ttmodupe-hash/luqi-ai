import { test, expect, type Route } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
// All accounts and persistence below are local fixtures. The actual built client
// and UI perform their requests; no provider or production database is accessed.
for (const operation of ['save', 'export'] as const) {
  test(`stalled notes ${operation} unlocks safely without retry or partial download at 320px`, async ({ page, baseURL }) => {
    await page.clock.install();
    await page.setViewportSize({ width: 320, height: 820 });
    let held: Route | undefined;
    let attempts = 0;
    const unexpected: string[] = [], downloads: string[] = [];
    const draft = 'A retained synthetic note';
    page.on('download', download => downloads.push(download.suggestedFilename()));
    await page.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== new URL(baseURL!).origin) { unexpected.push('external'); return route.abort(); }
      // Embedded Contacts performs a bounded first-party read after sign-in.
      if (url.pathname === '/api/v1/p2p/status' && request.method() === 'GET') return route.fulfill({ json: { enabled: false, userId: 7, eligibility: 'verification_needed', circles: [], blockedPeers: [] } });
      if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: {
        token: 'synthetic-browser-token', user: { email: 'browser@example.invalid' },
      } });
      if (url.pathname.startsWith('/api/v1/companion/conversations')) {
        if ((operation === 'save' && request.method() === 'POST') ||
            (operation === 'export' && url.pathname.endsWith('/4/export'))) {
          attempts++; held = route;
          // Deliberately leave headers pending; the built client must time out.
          return;
        }
        if (request.method() !== 'GET') { unexpected.push(request.method()); return route.abort(); }
        const messages = [{ id: 2, role: 'user', content: 'Previously saved fixture', createdAt: null }];
        // Model a committed save whose acknowledgement was lost. Only an
        // explicit history refresh can reveal it; the client must not resend.
        if (operation === 'save' && attempts) messages.push({ id: 3, role: 'user', content: draft, createdAt: null });
        return route.fulfill({ json: url.pathname.endsWith('/messages') ? { messages } : {
          conversations: [{ id: 4, title: 'Browser notes', personalityId: 1 }],
        } });
      }
      if (/^\/(api|v1)\//.test(url.pathname)) {
        unexpected.push(url.pathname); return route.fulfill({ status: 503, json: { code: 'TEST_UNAVAILABLE' } });
      }
      return route.continue();
    });
    try {
      await page.goto('/#/companion');
      await page.getByLabel('Email', { exact: true }).fill('browser@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill('fixture-password');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.getByRole('button', { name: 'Browser notes', exact: true }).click();
      await expect(page.getByText('Previously saved fixture', { exact: true })).toBeVisible();
      // Use the textbox's accessible name, not the wrapping label's text content,
      // which also contains the controlled textarea's nonempty text node.
      const messageInput = page.getByRole('textbox', { name: 'Your message', exact: true });
      if (operation === 'save') {
        await messageInput.fill(draft);
        await page.getByRole('button', { name: 'Save message', exact: true }).click();
      } else await page.getByRole('button', { name: 'Export selected conversation', exact: true }).click();
      await expect.poll(() => attempts).toBe(1);
      await expect(page.getByRole('button', { name: 'Refresh saved history' })).toBeDisabled();
      await page.clock.fastForward(15_001);
      await expect(page.getByRole('status')).toContainText(operation === 'save'
        ? 'Save could not be confirmed' : 'Export could not be completed');
      await expect(page.getByRole('button', { name: 'Refresh saved history' })).toBeEnabled();
      if (operation === 'save') {
        await expect(messageInput).toHaveValue(draft);
        await expect(page.getByRole('button', { name: 'Save message', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Refresh saved history' }).click();
        await expect(page.getByRole('status')).toContainText('Saved history refreshed');
        await expect(page.getByText('user · saved #3', { exact: true })).toBeVisible();
        await expect(messageInput).toHaveValue(draft);
      } else {
        await expect(page.getByRole('status')).toContainText('No file was downloaded');
        await expect(page.getByRole('button', { name: 'Export selected conversation', exact: true })).toBeEnabled();
      }
      await page.clock.fastForward(30_000);
      expect(attempts).toBe(1); expect(downloads).toEqual([]); expect(unexpected).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`notes-${operation}-deadline.png`), fullPage: true });
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(page.getByText('Previously saved fixture', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
    } finally { if (held) await held.abort().catch(() => {}); }
  });
}
