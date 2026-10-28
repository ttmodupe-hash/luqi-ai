import { test, expect } from '@playwright/test';

function tinyWav(): Buffer {
  // Original 0.5-second quiet test signal; not copyrighted media.
  const samples = 4000, sampleRate = 8000;
  const data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24); data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    data.writeInt16LE(Math.round(200 * Math.sin(2 * Math.PI * 200 * i / sampleRate)), 44 + i * 2);
  return data;
}

test('local Studio audio rights, preview, mobile layout and zero paid calls', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', req => { if (req.method() !== 'GET') writes.push(req.url()); });
  await page.setViewportSize({ width: 320, height: 790 });
  await page.goto('/#/content-studio');
  await expect(page.getByRole('heading', { name: 'Voiceovers and your licensed music' })).toBeVisible();
  const music = page.getByLabel('Choose licensed music');
  await expect(music).toBeDisabled();
  await page.getByRole('checkbox', { name: /I own this music or have permission/ }).check();
  await music.setInputFiles({ name: 'original-license-fixture.wav', mimeType: 'audio/wav', buffer: tinyWav() });
  await expect(page.getByText('Selected music: original-license-fixture.wav')).toBeVisible();
  await expect(page.getByLabel('Music preview')).toBeVisible();
  await page.getByLabel('Background music volume').fill('40');
  await expect(page.getByText('Background music volume: 40%')).toBeVisible();
  const recording = page.getByRole('button', { name: 'Record 90-second animation with sound' });
  await expect(recording).toBeVisible();
  await expect(page.getByRole('link', { name: /Download 90-second video/ })).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('style', /overflow: hidden/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Remove music' }).click();
  await expect(page.getByText('Selected music: original-license-fixture.wav')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Record 90-second animation', exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('microphone is allowed for first-party Studio only, never captured on page load', async ({ page }) => {
  const response = await page.goto('/#/content-studio');
  expect(response?.headers()['permissions-policy']).toContain('microphone=(self)');
  expect(response?.headers()['permissions-policy']).toContain('camera=()');
  const record = page.getByRole('button', { name: 'Record my voiceover' });
  await expect(record).toBeVisible();
  await expect(page.getByText(/Microphone permission is requested only when you choose Record/)).toBeVisible();
  await expect(page.getByLabel('Recorded voiceover preview')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop and keep voiceover' })).toHaveCount(0);
});
