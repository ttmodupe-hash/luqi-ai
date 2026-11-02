import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// All requests stay on the local synthetic preview. No accounts or providers.
test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen', 'true'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
      return route.fulfill({ status: 503, json: { code: 'TEST_UNAVAILABLE' } });
    }
    return route.continue();
  });
});

test('homepage readability CSS and imports remain identical in both frontend trees', () => {
  for (const file of ['home-readability.css', 'components/HeroAiChatConsole.tsx']) {
    expect(readFileSync('app/src/' + file, 'utf8')).toBe(readFileSync('src/' + file, 'utf8'));
  }
  expect(readFileSync('src/components/HeroAiChatConsole.tsx', 'utf8')).toContain('import "../home-readability.css"');
});

for (const width of [320, 390, 768, 1280]) {
  test(`homepage text, compact country card and keyboard selection are usable at ${width}px`, async ({ page }) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/');
    const heading = page.getByRole('heading', { name: /^Knowledge\. People\.\s*A Stronger Africa\.$/ });
    await expect(heading).toBeVisible();
    expect((await heading.boundingBox())!.y).toBeLessThan(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    // Mobile hides the explicit line break; sentences must still stay separated.
    await expect(page.locator('#chat-availability-heading')).toContainText('need. Find');

    const compact = page.locator('.luqi-home .luqi-region-compact .luqi-region-head');
    const intro = await compact.locator(':scope > div').boundingBox();
    const label = await compact.locator(':scope > label').boundingBox();
    const head = await compact.boundingBox();
    expect(intro).not.toBeNull();
    expect(label).not.toBeNull();
    expect(head).not.toBeNull();
    expect(intro!.width).toBeGreaterThanOrEqual(head!.width - 2);
    expect(label!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height + 10);
    if (width === 1280) {
      const copy = (await page.locator('.luqi-hero-copy').boundingBox())!;
      const card = (await page.locator('.luqi-chat-card').boundingBox())!;
      expect(Math.abs(copy.y - card.y)).toBeLessThanOrEqual(2);
    }

    const ratios = await page.evaluate(() => {
      const luminance = (color: string) => {
        const components = color.match(/[\d.]+/g);
        if (!components || components.length < 3) throw new Error('Unrecognised computed colour');
        const [r, g, b] = components.slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (foreground: string, background: string) => {
        const a = luminance(foreground), b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const home = document.querySelector('.luqi-home')!;
      const background = getComputedStyle(home).backgroundColor;
      const nodes = [...home.querySelectorAll('.luqi-hero-onboarding, .luqi-hero-onboarding a')];
      if (nodes.length < 6) throw new Error('Expected all homepage help text and links');
      const result = nodes.map(node => contrast(getComputedStyle(node).color, background));
      const select = home.querySelector('#luqi-country-home')!;
      const style = getComputedStyle(select);
      result.push(contrast(style.color, style.backgroundColor));
      return result;
    });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);

    // The nested label includes option text; the accessible control name does not.
    const country = page.getByRole('combobox', { name: 'Country and continental view', exact: true });
    await country.focus();
    await expect(country).toBeFocused();
    const next = await country.locator('option').nth(1).getAttribute('value');
    expect(next).toBeTruthy();
    await country.selectOption(next!);
    await expect(country).toHaveValue(next!);
    await expect(page.locator('.luqi-region-note')).not.toContainText('No country selected');
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`home-readable-${width}.png`), fullPage: true, scale: 'css' });
  });
}
