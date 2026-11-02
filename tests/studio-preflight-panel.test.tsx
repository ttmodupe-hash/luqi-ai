// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import StudioPreflightPanel from '../src/components/StudioPreflightPanel';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('zero-credit studio preflight in the real LUQI editor', () => {
  it('requires five planning fields and an explicit replacement confirmation, with no provider calls', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const apply = vi.fn(), exportBrief = vi.fn();
    render(<StudioPreflightPanel disabled={false} onApply={apply} onExport={exportBrief} />);
    expect(screen.getByText(/0 of 5 planning details complete/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preview six-scene replacement' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Creative template' }), { target: { value: 'kota' } });
    expect(screen.getByText(/5 of 5 planning details complete/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Preview six-scene replacement' }));
    expect(screen.getByRole('region', { name: 'Review scene replacement' })).toBeTruthy();
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep existing storyboard' }));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Preview six-scene replacement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace current storyboard' }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0]).toHaveLength(6);
    expect(screen.getByText(/Six editable scenes applied/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Download creative production brief' }));
    expect(exportBrief).toHaveBeenCalledTimes(1);
    expect(exportBrief.mock.calls[0][0]).toContain('LUQI STUDIO — LOCAL PRE-FLIGHT PRODUCTION BRIEF');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('previews and exports a max-length ready brief without a false success state or paid requests', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const apply = vi.fn(), exportBrief = vi.fn();
    render(<StudioPreflightPanel disabled={false} onApply={apply} onExport={exportBrief} />);
    for (const [label, value] of [
      ['Subject and action', 'S'.repeat(96)],
      ['Camera and framing', 'C'.repeat(80)],
      ['Lighting', 'L'.repeat(80)],
      ['Motion', 'M'.repeat(80)],
      ['Setting', 'P'.repeat(80)],
    ]) {
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } });
    }
    fireEvent.click(screen.getByText('Audience, call to action and continuity (optional)'));
    for (const [label, value] of [
      ['Audience', 'A'.repeat(64)],
      ['Call to action', 'T'.repeat(96)],
      ['Visual continuity note', 'V'.repeat(96)],
    ]) {
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } });
    }
    expect(screen.getByText(/5 of 5 planning details complete/).textContent).toContain('Ready to draft six scenes');
    const preview = screen.getByRole('button', { name: 'Preview six-scene replacement' });
    const exportButton = screen.getByRole('button', { name: 'Download creative production brief' });
    expect(preview.hasAttribute('disabled')).toBe(false);
    expect(exportButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(preview);
    const review = screen.getByRole('region', { name: 'Review scene replacement' });
    expect(review.textContent).toContain('A'.repeat(64));
    expect(review.textContent).toContain('T'.repeat(96));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(exportButton);
    expect(exportBrief).toHaveBeenCalledTimes(1);
    expect(exportBrief.mock.calls[0][0]).toContain('Audience: ' + 'A'.repeat(64));
    expect(exportBrief.mock.calls[0][0]).toContain('Call to action: ' + 'T'.repeat(96));
    expect(screen.getByText(/Local production brief prepared for download/)).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep existing storyboard' }));
    expect(apply).not.toHaveBeenCalled();
  });
  it('prevents storyboard changes during recording and discards preview when source changes', () => {
    const apply = vi.fn();
    const { rerender } = render(<StudioPreflightPanel disabled={false} onApply={apply} onExport={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Creative template' }), { target: { value: 'solar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview six-scene replacement' }));
    expect(screen.getByRole('region', { name: 'Review scene replacement' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject and action' }), { target: { value: 'Test an original solar pitch' } });
    expect(screen.queryByRole('region', { name: 'Review scene replacement' })).toBeNull();
    rerender(<StudioPreflightPanel disabled onApply={apply} onExport={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Preview six-scene replacement' }).hasAttribute('disabled')).toBe(true);
    expect(apply).not.toHaveBeenCalled();
  });
});
