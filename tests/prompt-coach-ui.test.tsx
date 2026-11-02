// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LuqiPromptCoach from '../src/components/LuqiPromptCoach';
afterEach(() => cleanup());
describe('Luqi prompt coach: local deliberate changes', () => {
  it('does not make any request while reviewing and requires an explicit click to replace wording', () => {
    const apply = vi.fn();
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    render(<LuqiPromptCoach draft="I need plese help with my business" disabled={false} onApply={apply} />);
    expect(screen.getByText(/Possible English spelling/)).toBeTruthy();
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply suggestion' }));
    expect(apply).toHaveBeenCalledWith('I need please help with my business');
    fireEvent.click(screen.getByText(/Help me ask Luqi/));
    fireEvent.change(screen.getByLabelText('What would help most?'), { target: { value: 'plan' } });
    fireEvent.change(screen.getByLabelText('How should Luqi answer?'), { target: { value: 'steps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suggest a clearer question' }));
    const preview = screen.getByLabelText('Review the suggested question') as HTMLTextAreaElement;
    expect(preview.value).toContain('Suggest practical next steps');
    expect(preview.value).toContain('Use short practical steps.');
    // Only the visitor's next click applies; this component cannot send an AI request.
    expect(apply).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Use this question' }));
    expect(apply).toHaveBeenCalledTimes(2);
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('respects disabled state and never rewrites a non-English draft', () => {
    const apply = vi.fn();
    render(<LuqiPromptCoach draft="Ngiyacela, ngifuna ulwazi" disabled onApply={apply} />);
    expect(screen.queryByRole('button', { name: 'Apply suggestion' })).toBeNull();
    fireEvent.click(screen.getByText(/Help me ask Luqi/));
    expect((screen.getByRole('button', { name: 'Suggest a clearer question' }) as HTMLButtonElement).disabled).toBe(true);
    expect(apply).not.toHaveBeenCalled();
  });
});
