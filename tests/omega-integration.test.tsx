// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import OmegaDomainGuide from '../src/components/OmegaDomainGuide';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('identifies all six Omega domains without claiming live providers or worker activity', () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  render(<OmegaDomainGuide />);
  fireEvent.click(screen.getByText('Explore all six Omega areas and what is available'));
  const list = screen.getByRole('list', { name: 'Omega Six capability availability' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(6);
  expect(within(list).getAllByText('Local calculation available')).toHaveLength(2);
  expect(within(list).getAllByText('Not available to customers')).toHaveLength(4);
  for (const title of ['Workflow Engine', 'Weather Africa', 'Travel Africa',
    'Universities & scholarships', 'Vehicle service planner', 'Water & sanitation']) {
    expect(within(list).getByRole('heading', { name: title })).toBeTruthy();
  }
  expect(screen.getByText(/A local result is not proof of live data or autonomous AI/)).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});
