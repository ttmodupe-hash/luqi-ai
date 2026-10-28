import { test, expect } from '@playwright/test';

// Use only a local preview, synthetic session and synthetic confirmed AI reply.
// Never run a paid provider or write an account record in release CI.
test('approved toddler gravity idea flows from Luqi Chat into a real 30-second local Studio video', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const requests: string[] = [];
  let paidCalls = 0;
  await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen', 'true'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { requests.push(url.origin); return route.abort(); }
    if (url.pathname === '/v1/readiness') return route.fulfill({
      json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } },
    });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({
      json: { token: 'studio-synthetic-token', user: { email: 'studio@example.invalid', name: 'Kea' } },
    });
    if (url.pathname === '/api/v1/luqi-core') {
      paidCalls++;
      const input = route.request().postDataJSON();
      expect(input.user_input).toContain('gravity');
      expect(route.request().headers().authorization).toBe('Bearer studio-synthetic-token');
      return route.fulfill({ json: {
        status: 'success', provider: 'gemini', provider_model: 'fixture-model',
        response: 'Here is a gentle video plan for a toddler. We will use a ball, an apple and bright shapes. We should review each scene before rendering.',
      } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) { requests.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/chat');
  await page.getByText('Prefer to sign in here?').click();
  await page.getByLabel('Email', { exact: true }).fill('studio@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('fixture-safe-password-2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const question = 'I want to create a video explaining the laws of gravity for my 2 year old child.';
  await page.getByLabel('Your question').fill(question);
  await page.getByRole('checkbox', { name: /I understand AI text may go/ }).check();
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('region', { name: 'Video production proposal' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Proposed video scenes' }).getByRole('listitem')).toHaveCount(6);
  await expect(page.getByText(/30 seconds · Animated gravity demonstration/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve and generate silent video in Studio' })).toBeEnabled();
  await expect(page).toHaveURL(/#\/chat$/);
  expect(paidCalls).toBe(1);

  // Explicit approval is the only action that transfers content and begins
  // a local recording when the browser has a supported media encoder.
  await page.getByRole('button', { name: 'Approve and generate silent video in Studio' }).click();
  await expect(page).toHaveURL(/#\/content-studio$/);
  await expect(page.getByRole('region', { name: 'Approved Chat project' })).toContainText(question);
  await expect(page.getByLabel('Scene title', { exact: true })).toHaveValue('Hello, little explorer!');
  await expect(page.getByRole('button', { name: 'Record 30-second animation', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Illustrative motion graphics/ })).toBeVisible();
  const cancel = page.getByRole('button', { name: 'Cancel recording', exact: true });
  if (await cancel.count()) {
    await expect(cancel).toBeVisible();
    await cancel.click();
    await expect(page.getByRole('status', { name: 'Studio export status' })).toContainText('partial recording was discarded');
  } else {
    await expect(page.getByRole('status', { name: 'Studio export status' })).toContainText('Recording is unsupported here');
  }
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download storyboard', exact: true }).click();
  const file = await download;
  const chunks: Buffer[] = [];
  const reader = await file.createReadStream();
  for await (const chunk of reader!) chunks.push(Buffer.from(chunk));
  const story = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  expect(story.format).toBe('luqi.storyboard.v3');
  expect(story.durationSeconds).toBe(30);
  expect(story.visualTheme).toBe('gravity');
  expect(story.audio).toBe('none');
  expect(story.scenes).toHaveLength(6);
  expect(paidCalls).toBe(1);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('a confirmed video reply does not create a video until separately approved', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  let inference = 0;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: {
      checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
    } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: {
      token: 'synthetic-video', user: { email: 'video@example.invalid' },
    } });
    if (url.pathname === '/api/v1/luqi-core') {
      inference++;
      return route.fulfill({ json: { status: 'success', response: 'Six scene ideas for a fun nature video.',
        provider: 'gemini', provider_model: 'fixture-model' } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/chat');
  await page.getByText('Prefer to sign in here?').click();
  await page.getByLabel('Email').fill('video@example.invalid');
  await page.getByLabel('Password').fill('fixture-Password2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Your question').fill('Please create a video about trees for my students.');
  await page.getByRole('checkbox', { name: /I understand AI text may go/ }).check();
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('region', { name: 'Video production proposal' })).toBeVisible();
  await page.getByRole('button', { name: 'Change the plan with Luqi' }).click();
  await expect(page.getByLabel('Your question')).toHaveValue(/Please revise this video plan/);
  await expect(page).toHaveURL(/#\/chat$/);
  expect(inference).toBe(1);
  await page.goto('/#/content-studio');
  await expect(page.getByRole('region', { name: 'Approved Chat project' })).toHaveCount(0);
  await expect(page.getByLabel('Scene title', { exact: true })).toHaveValue('Make room for curiosity.');
});
