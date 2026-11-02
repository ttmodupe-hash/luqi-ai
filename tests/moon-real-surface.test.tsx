// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import MoonNowContent from '../src/components/MoonNowContent';
import MoonDisc, { LRO_MOON_IMAGE, LRO_MOON_SOURCE, LUQI_MOON_ART } from '../src/components/MoonDisc';
import { readFileSync } from 'node:fs';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('renders a cratered lunar surface with real LRO image and a calculated phase clip', () => {
  const { container } = render(<MoonDisc id="fixture" fraction={0.33} rotation={27.2}
    view="phase" detailed label="Current Moon phase" />);
  const moon = screen.getByRole('img', { name: 'Current Moon phase' });
  expect(moon.getAttribute('data-moon-view')).toBe('phase');
  expect(moon.getAttribute('data-moon-detail')).toBe('lro');
  expect(container.querySelectorAll('g[aria-hidden="true"] circle').length).toBeGreaterThan(25);
  const photo = container.querySelector('image');
  expect(photo?.getAttribute('href')).toBe(LRO_MOON_IMAGE);
  const phase = container.querySelector('clipPath[id$="-lit"] path');
  expect(phase?.getAttribute('d')).toContain('M');
  expect(phase?.getAttribute('transform')).toContain('27.2');
  expect(LRO_MOON_SOURCE).toContain('usgs.gov');
});

it('retains a completely local near-side illustration when detailed images are disabled', () => {
  const { container, rerender } = render(<MoonDisc id="fixture" fraction={0.66} rotation={-55}
    view="phase" detailed={false} label="Moon without downloads" />);
  expect(screen.getByRole('img', { name: 'Moon without downloads' }).getAttribute('data-moon-detail')).toBe('local');
  expect([...container.querySelectorAll('image')].map(x => x.getAttribute('href')))
    .toEqual([LUQI_MOON_ART, LUQI_MOON_ART]);
  const path = container.querySelector('clipPath[id$="-lit"] path')!.getAttribute('d');
  rerender(<MoonDisc id="fixture" fraction={0.12} rotation={-55}
    view="phase" detailed={false} label="Moon without downloads" />);
  expect(container.querySelector('clipPath[id$="-lit"] path')!.getAttribute('d')).not.toBe(path);
  rerender(<MoonDisc id="fixture" fraction={0.12} rotation={-55}
    view="surface" detailed={false} label="Full near-side map" />);
  expect(screen.getByRole('img', { name: 'Full near-side map' }).getAttribute('data-moon-view')).toBe('surface');
});

it('makes full near-side surface visible on request without claiming it is the current phase', () => {
  vi.spyOn(globalThis, 'fetch'); // no paid model or data API calls should occur
  render(<MoonNowContent />);
  const image = screen.getByRole('img');
  expect(image.getAttribute('data-moon-view')).toBe('phase');
  expect(image.getAttribute('data-moon-detail')).toBe('local');
  // The homepage must not load any image from a third-party host without a click.
  expect([...image.querySelectorAll('image')].map(x => x.getAttribute('href')))
    .toEqual([LUQI_MOON_ART, LUQI_MOON_ART]);
  fireEvent.click(screen.getByRole('button', { name: 'Explore full surface' }));
  expect(image.getAttribute('data-moon-view')).toBe('surface');
  expect(screen.getByText(/not today’s lunar illumination/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show NASA Moon image' }));
  expect(image.getAttribute('data-moon-detail')).toBe('lro');
  expect([...image.querySelectorAll('image')].map(x => x.getAttribute('href')))
    .toEqual([LRO_MOON_IMAGE, LRO_MOON_IMAGE]);
  fireEvent.click(screen.getByRole('button', { name: 'Use low-data Moon' }));
  expect(image.getAttribute('data-moon-detail')).toBe('local');
  expect([...image.querySelectorAll('image')].map(x => x.getAttribute('href')))
    .toEqual([LUQI_MOON_ART, LUQI_MOON_ART]);
  fireEvent.click(screen.getByRole('button', { name: 'Current phase' }));
  expect(image.getAttribute('data-moon-view')).toBe('phase');
  expect(screen.getByRole('link', { name: 'NASA LRO surface source' }).getAttribute('href')).toBe(LRO_MOON_SOURCE);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('bundles the local Moon artwork as a small same-origin WebP file', () => {
  const bytes = readFileSync('public/moon-luqi-art.webp');
  expect(bytes.byteLength).toBeLessThan(10_000);
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
  expect(LUQI_MOON_ART).toBe('/moon-luqi-art.webp');
});

it('keeps the Moon content, styling and photorealistic layer mirrored across both Luqi entrypoints', () => {
  for (const name of ['MoonDisc.tsx', 'MoonNowContent.tsx', 'moon-now.css']) {
    expect(readFileSync('src/components/' + name, 'utf8'))
      .toBe(readFileSync('app/src/components/' + name, 'utf8'));
  }
  expect(readFileSync('src/home-cinematic.css', 'utf8'))
    .toBe(readFileSync('app/src/home-cinematic.css', 'utf8'));
});
