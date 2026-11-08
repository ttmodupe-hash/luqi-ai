import { test, expect } from '@playwright/test';
// Freeze reviewed-edition fixtures; independent expiry denial is covered in unit/UI tests.
test.beforeEach(async ({page})=>{ await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z')); });

test('consumer story stays local and options link to original regulators on a 320px display', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (route.request().method() !== 'GET' || url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/v1/')) {
      unexpected.push(route.request().method() + ' ' + url.pathname);
      return route.fulfill({ status: 503, json: { code: 'TEST_PROVIDER_DISABLED' } });
    }
    return route.continue();
  });

  await page.goto('/#/consumer-rights');
  await expect(page.getByRole('heading', { name: 'Consumer rights: understand your options' })).toBeVisible();
  await page.getByLabel('What kind of problem is it?').selectOption('UNAUTHORIZED_DEBIT_ORDER');
  await page.getByLabel('What happened? (redact personal details)')
    .fill('I noticed an unexpected debit order and asked my bank to investigate.');
  await page.getByRole('button', { name: 'Prepare my options locally' }).click();
  await expect(page.getByRole('heading', { name: 'Disputed debit order or bank transaction' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Official legislation and complaint information' })
    .getByRole('link', { name: /National Financial Ombud/ })).toBeVisible();
  const viewport = await page.evaluate(() => {
    const nodes = [...document.body.querySelectorAll('*')];
    const offenders = nodes.map((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className.slice(0, 75) : '',
        x: Math.round(box.x), right: Math.round(box.right), width: Math.round(box.width),
        visible: box.width > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      };
    }).filter(item => item.visible && item.right > window.innerWidth + 1)
      .sort((a, b) => b.right - a.right).slice(0, 14);
    const internalOverflow = nodes.map(element => ({
      tag: element.tagName.toLowerCase(),
      className: typeof element.className === 'string' ? element.className.slice(0, 75) : '',
      client: element.clientWidth, scroll: element.scrollWidth,
    })).filter(item => item.client > 0 && item.scroll > item.client + 2)
      .sort((a, b) => b.scroll - b.client - (a.scroll - a.client)).slice(0, 12);
    return { width: window.innerWidth, scroll: document.documentElement.scrollWidth, offenders, internalOverflow };
  });
  expect(viewport.scroll,
    '320px horizontal overflow. Rects: ' + JSON.stringify(viewport.offenders) +
    '; internal widths: ' + JSON.stringify(viewport.internalOverflow))
    .toBeLessThanOrEqual(viewport.width + 1);
  expect(unexpected, 'consumer complaint preparation must never post user stories to an API').toEqual([]);
});

test('consumer first steps do not require a personal story or provider request', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', req => { if (req.method() === 'POST') posts.push(req.url()); });
  await page.goto('/#/consumer-rights');
  await page.getByRole('region', { name: 'Quick consumer help — three first steps' })
    .getByRole('button', { name: 'Online order / suspected scam' }).click();
  await expect(page.getByRole('heading', { name: 'Late online delivery or suspected scam — three first steps' })).toBeVisible();
  await expect(page.getByText(/Save the advertised delivery promise/)).toBeVisible();
  expect(posts).toEqual([]);
});

test('ICASA provider-first and separate CRM instructions work on keyboard and 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/#/consumer-rights');
  await page.getByRole('button', { name: 'Mobile / internet billing' }).click();
  await expect(page.getByText(/provider 14 working days/i)).toBeVisible();
  await page.getByLabel('What happened? (redact personal details)').fill('My mobile provider charged me twice and gave a complaint reference.');
  await page.getByRole('button', { name: 'Prepare my options locally' }).click();
  await expect(page.getByRole('heading', { name: 'Cellular or internet-service billing' })).toBeVisible();
  const section = page.getByRole('region', { name: 'Official legislation and complaint information' });
  const procedure = section.getByRole('link', { name: /ICASA: Communications service complaints portal/ });
  const crm = section.getByRole('link', { name: /ICASA: CRM Portal profile registration/ });
  await expect(procedure).toHaveAttribute('href', 'https://www.icasa.org.za/pages/consumer-complaints-procedure');
  await expect(crm).toHaveAttribute('href', 'https://www.icasa.org.za/pages/consumer-complaints');
  await expect(crm).toHaveAttribute('rel', /noopener noreferrer/);
  await procedure.focus();
  await page.keyboard.press('Tab');
  await expect(crm).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(posts).toEqual([]);
});


test('NCC filing guidance preserves regulator registration, keyboard links and sector boundaries at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/#/consumer-rights');
  await page.getByRole('button', { name: 'Faulty goods / warranty' }).click();
  await page.getByLabel('What happened? (redact personal details)')
    .fill('The shop refused to explain my appliance repair or provide a complaint reference.');
  await page.getByRole('button', { name: 'Prepare my options locally' }).click();
  await expect(page.getByRole('heading', { name: 'Defective or unsafe goods' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Options to explore' })
    .getByText(/registered and approved profile/)).toBeVisible();
  const nccLink = page.getByRole('region', { name: 'Official legislation and complaint information' })
    .getByRole('link', { name: /National Consumer Commission.*e-Services profile approval/ });
  await expect(nccLink).toHaveAttribute('href', 'https://thencc.org.za/complaints/');
  await expect(nccLink).toHaveAttribute('rel', /noopener noreferrer/);
  await nccLink.focus();
  await expect(nccLink).toBeFocused();
  await page.getByRole('button', { name: 'Disputed bank debit' }).click();
  await page.getByLabel('What happened? (redact personal details)')
    .fill('My bank deducted an amount I do not recognise and gave me a dispute reference.');
  await page.getByRole('button', { name: 'Prepare my options locally' }).click();
  await expect(page.getByRole('heading', { name: 'Disputed debit order or bank transaction' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Official legislation and complaint information' })
    .getByRole('link', { name: /National Consumer Commission.*e-Services profile approval/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(posts).toEqual([]);
});
