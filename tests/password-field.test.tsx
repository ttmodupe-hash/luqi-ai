// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import PasswordField from '../src/components/PasswordField';
import AccountAccessForm from '../src/components/AccountAccessForm';
import AccountPasswordForm from '../src/components/AccountPasswordForm';

const fixture = 'synthetic-visibility-fixture';
const input = (label = 'Password') => screen.getByLabelText(label, { exact: true }) as HTMLInputElement;
const props = { label: 'Password', value: fixture, onChange: vi.fn(), autoComplete: 'current-password' as const };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('local password visibility', () => {
  it('starts masked with password-manager and mobile input semantics intact', () => {
    render(<PasswordField {...props} />);
    expect(input().type).toBe('password');
    expect(input().autocomplete).toBe('current-password');
    expect(input().getAttribute('autocapitalize')).toBe('none');
    expect(input().getAttribute('autocorrect')).toBe('off');
    expect(input().getAttribute('spellcheck')).toBe('false');
    expect(input().required).toBe(true);
  });
  it('uses a named non-submit control linked to the exact input', () => {
    const submitted = vi.fn();
    render(<form onSubmit={event => { event.preventDefault(); submitted(); }}><PasswordField {...props} /></form>);
    const button = screen.getByRole('button', { name: 'Show password', exact: true }) as HTMLButtonElement;
    expect(button.type).toBe('button'); expect(button.getAttribute('aria-controls')).toBe(input().id);
    fireEvent.click(button);
    expect(input().type).toBe('text'); expect(input().value).toBe(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Hide password', exact: true }));
    expect(input().type).toBe('password'); expect(submitted).not.toHaveBeenCalled();
  });
  it('never copies the credential into text, browser storage or a network call', () => {
    const request = vi.fn(), store = vi.spyOn(Storage.prototype, 'setItem'); vi.stubGlobal('fetch', request);
    const { container } = render(<PasswordField {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    expect(container.textContent).not.toContain(fixture); expect(store).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });
  it('retains the same input node and accepts value changes while revealed', () => {
    function Controlled() { const [value, setValue] = useState(fixture); return <PasswordField {...props} value={value} onChange={setValue} />; }
    render(<Controlled />); const original = input();
    fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    fireEvent.change(input(), { target: { value: 'pasted-fixture-unchanged' } });
    expect(input()).toBe(original); expect(input().value).toBe('pasted-fixture-unchanged'); expect(input().type).toBe('text');
  });
  it('keeps visibility while moving to its own button and masks when leaving the field', () => {
    render(<PasswordField {...props} />);
    const button = screen.getByRole('button', { name: 'Show password', exact: true }); fireEvent.click(button);
    fireEvent.blur(input(), { relatedTarget: button }); expect(input().type).toBe('text');
    fireEvent.blur(button, { relatedTarget: document.body }); expect(input().type).toBe('password');
  });
  it('masks when focus leaves without an available related target', () => {
    render(<PasswordField {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    fireEvent.blur(input(), { relatedTarget: null }); expect(input().type).toBe('password');
  });
  it('masks on Escape without changing the credential', () => {
    render(<PasswordField {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    fireEvent.keyDown(input(), { key: 'Escape' }); expect(input().type).toBe('password'); expect(input().value).toBe(fixture);
  });
  it('masks when the window loses focus', () => {
    render(<PasswordField {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    fireEvent(window, new Event('blur')); expect(input().type).toBe('password');
  });
  it('masks on a hidden document and does not reveal again on return', () => {
    render(<PasswordField {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange')); expect(input().type).toBe('password');
    hidden.mockReturnValue(false); fireEvent(document, new Event('visibilitychange')); expect(input().type).toBe('password');
  });
  it('masks immediately when disabled and stays masked when re-enabled', () => {
    const { rerender } = render(<PasswordField {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    rerender(<PasswordField {...props} disabled />);
    expect(input().type).toBe('password'); expect(input().disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Show password', exact: true }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<PasswordField {...props} />); expect(input().type).toBe('password');
  });
  it('clearing the field resets visibility for the next credential', () => {
    const { rerender } = render(<PasswordField {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    rerender(<PasswordField {...props} value="" />); rerender(<PasswordField {...props} value="another-fixture" />);
    expect(input().type).toBe('password');
  });
  it('gives separate fields unique ids, correct hints and individual visibility', () => {
    render(<><PasswordField {...props} /><PasswordField {...props} label="Confirm password" autoComplete="new-password" describedBy="fixture-help" maxLength={72} /><p id="fixture-help">Fixture guidance</p></>);
    expect(input().id).not.toBe(input('Confirm password').id);
    expect(input('Confirm password').getAttribute('aria-describedby')).toBe('fixture-help');
    expect(input('Confirm password').maxLength).toBe(72); expect(input('Confirm password').autocomplete).toBe('new-password');
    fireEvent.click(screen.getByRole('button', { name: 'Show confirm password', exact: true }));
    expect(input().type).toBe('password'); expect(input('Confirm password').type).toBe('text');
  });
});

describe('account-form integration', () => {
  it('clears and masks the password when changing account mode', () => {
    render(<AccountAccessForm onAuthenticated={vi.fn()} />);
    fireEvent.change(input(), { target: { value: fixture } });
    fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Create an account', exact: true }));
    expect(input().value).toBe(''); expect(input().type).toBe('password'); expect(input('Confirm password').type).toBe('password');
  });
  it('masks pending authentication and clears both value and visibility on cancellation', async () => {
    const request = vi.fn(() => new Promise<Response>(() => {})), accepted = vi.fn(); vi.stubGlobal('fetch', request);
    render(<AccountAccessForm onAuthenticated={accepted} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'fixture@example.invalid' } });
    fireEvent.change(input(), { target: { value: fixture } });
    fireEvent.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    expect(input().type).toBe('password'); expect(input().disabled).toBe(true);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel request', exact: true })); });
    expect(input().value).toBe(''); expect(input().type).toBe('password'); expect(request).toHaveBeenCalledTimes(1); expect(accepted).not.toHaveBeenCalled();
  });
  it('offers honest local recovery guidance without posting or claiming a reset', () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request); render(<AccountAccessForm onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByText('Forgot your password?'));
    expect(screen.getByText(/Automatic password-reset emails are unavailable in this pilot/)).toBeTruthy();
    expect(screen.getByText(/Opening this help does not send an email or change your account/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Read account recovery guidance' }).getAttribute('href')).toBe('#/contact');
    expect(request).not.toHaveBeenCalled();
  });
  it('applies the same controls to all password-change fields and clears them on close', () => {
    render(<AccountPasswordForm token="synthetic-token" email="fixture@example.invalid" disabled={false} onBusyChange={vi.fn()} onSessionEnd={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change password', exact: true }));
    for (const label of ['Current password', 'New password', 'Confirm new password']) {
      expect(input(label).type).toBe('password'); fireEvent.change(input(label), { target: { value: fixture } });
      fireEvent.click(screen.getByRole('button', { name: `Show ${label.toLowerCase()}`, exact: true })); expect(input(label).type).toBe('text');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Close password settings', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Change password', exact: true }));
    for (const label of ['Current password', 'New password', 'Confirm new password']) { expect(input(label).value).toBe(''); expect(input(label).type).toBe('password'); }
  });
});
