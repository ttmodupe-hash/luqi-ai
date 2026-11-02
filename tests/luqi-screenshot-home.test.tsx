// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { workspaceTools } from '../src/components/workspace-catalog';

vi.mock('../src/components/MoonNowPanel', () => ({ default: () => <section aria-label="Moon now">Local Moon calculation</section> }));
vi.mock('../src/components/HomeExtras', () => ({ default: () => <div>Preserved discovery tools</div> }));
vi.mock('../src/components/HeroAiChatConsole', () => ({ default: () => <div>Consent-gated AI trial information</div> }));
import Home from '../src/pages/Home';
function Target() {
  const location = useLocation();
  return <div data-testid="destination" data-route={location.pathname}>{JSON.stringify(location.state)}</div>;
}
function draw() {
  return render(<MemoryRouter initialEntries={['/']}><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/ask" element={<Target />} />
    <Route path="/comparative-evidence" element={<Target />} />
    <Route path="/driver-rights" element={<Target />} />
  </Routes></MemoryRouter>);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('retains the approved full headline, real moon position and three source-linked history sections', () => {
  const view = draw();
  expect(screen.getByRole('heading', {level:1, name:/Knowledge. People. A Stronger Africa./})).toBeTruthy();
  expect(view.container.querySelector('.luqi-panorama-top .luqi-pano-moon')).toBeTruthy();
  expect(screen.getByRole('heading',{name:/African Peoples and Historical Evidence in Biblical Narratives/})).toBeTruthy();
  expect(view.container.querySelectorAll('.luqi-history-card')).toHaveLength(3);
  expect(screen.getByText('Preserved discovery tools')).toBeTruthy();
  expect(screen.getByRole('searchbox',{name:'Filter workspace tools'})).toBeTruthy();
});
it('passes the real typed question into private navigation state without a URL query or AI POST', () => {
  const request = vi.spyOn(globalThis, 'fetch');
  draw();
  fireEvent.change(screen.getByRole('textbox', {name:'Ask Luqi anything'}), {target:{value:'Help me understand a traffic fine'}});
  fireEvent.click(screen.getByRole('button',{name:'Explore my question with Luqi'}));
  const target = screen.getByTestId('destination');
  expect(target.getAttribute('data-route')).toBe('/ask');
  expect(target.textContent).toContain('Help me understand a traffic fine');
  expect(request).not.toHaveBeenCalled();
});
it('rejects an empty question without navigating or inventing an answer', () => {
  draw();
  fireEvent.click(screen.getByRole('button',{name:'Explore my question with Luqi'}));
  expect(screen.getByRole('alert').textContent).toMatch(/Enter a question/);
  expect(screen.queryByTestId('destination')).toBeNull();
});
it('opens the real African study directly and selects source-backed topic', () => {
  draw();
  fireEvent.click(screen.getByRole('link',{name:/Compare text and evidence/}));
  const target = screen.getByTestId('destination');
  expect(target.textContent).toContain('"openAfricanStudy":true');
  expect(target.textContent).toContain('"africanTopic":"ebed"');
  expect(target.getAttribute('data-route')).toBe('/comparative-evidence');
});
it('opens the four-question practice from the approved history banner', () => {
  draw();
  fireEvent.click(screen.getByRole('link',{name:/Study questions/}));
  expect(screen.getByTestId('destination').textContent).toContain('"africanPractice":true');
});
it('renders only real ready Luqi destinations in the tool strip', () => {
  const view = draw();
  const links = [...view.container.querySelectorAll<HTMLAnchorElement>('.luqi-pano-tools a')];
  expect(links.length).toBeGreaterThanOrEqual(10);
  for (const link of links) {
    const matching = workspaceTools.find(tool => tool.ready && tool.path === link.getAttribute('href'));
    expect(matching, link.outerHTML).toBeTruthy();
  }
  expect(view.container.querySelector('.luqi-tool-grid')).toBeTruthy();
});
