// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createQuote, exportQuoteProject } from '../src/lib/business-desk';
import { ProjectVaultRequestError } from '../src/lib/project-vault-client';
import AccountProjectVault from '../src/components/AccountProjectVault';

const mocks = vi.hoisted(() => ({
  status: vi.fn(), list: vi.fn(), get: vi.fn(), save: vi.fn(), remove: vi.fn(),
  seal: vi.fn(), open: vi.fn(),
}));
vi.mock('../src/components/AccountAccessForm', () => ({
  default: ({ onAuthenticated }: { onAuthenticated: (session: unknown) => void }) =>
    React.createElement('button', { type: 'button', onClick: () => onAuthenticated({
      token: 'test-credential-memory-only', user: { email: 'pilot@example.invalid' },
    }) }, 'Fixture sign in'),
}));
vi.mock('../src/lib/project-vault-client', async original => ({
  ...(await original<typeof import('../src/lib/project-vault-client')>()),
  projectVaultClient: () => ({
    status: mocks.status, list: mocks.list, get: mocks.get, save: mocks.save, remove: mocks.remove,
  }),
}));
vi.mock('../src/lib/project-vault-crypto', () => ({
  sealProject: mocks.seal, openSealedProject: mocks.open,
}));

const id = 'da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const metadata = { id, kind: 'quote', revision: 2, updatedAt: '2026-10-25T12:00:00.000000Z' };
const sealed = { format: 'luqi.vault.sealed.v1', kdf: 'PBKDF2-SHA256-310000',
  salt: 'BwcHBwcHBwcHBwcHBwcHBw==', nonce: 'CAgICAgICAgICAgI', ciphertext: 'CQkJCQkJCQkJCQkJCQkJCQkJCQk=' };
const draft = { businessName: 'Pretoria Works', customerName: 'Client alias',
  reference: 'Q-2026', rows: [{ description: 'Design job', quantity: 1, unitPriceZar: '125.00' }] };
const quote = createQuote(draft);
const restore = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('crypto', { randomUUID: () => id });
  mocks.status.mockResolvedValue({ availability: 'configured', storage: 'connected',
    encryptedPayloadOnly: true, ownerLimit: 20, subscriptionActive: false });
  mocks.list.mockResolvedValue([metadata]);
  mocks.get.mockResolvedValue({ ...metadata, sealed });
  mocks.seal.mockResolvedValue(sealed);
  mocks.open.mockResolvedValue(exportQuoteProject(quote));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function signIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Fixture sign in' }));
  await screen.findByRole('button', { name: 'Refresh saved projects' });
}
describe('optional quote vault UI fails closed and never invents paid entitlement', () => {
  it('requires explicit sign-in, respects a disabled backend and never sends a write', async () => {
    mocks.status.mockResolvedValueOnce({ availability: 'disabled', syncing: false, subscriptionActive: false });
    render(<AccountProjectVault quote={quote} onRestoreQuote={restore} />);
    expect(mocks.status).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
    await signIn();
    await screen.findByText(/Account project sync is disabled/);
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('decrypts only on explicit action and requires confirmation to replace an in-tab draft', async () => {
    render(<AccountProjectVault quote={quote} onRestoreQuote={restore} />);
    await signIn();
    await screen.findByRole('button', { name: 'Open encrypted quotation' });
    fireEvent.click(screen.getByRole('button', { name: 'Open encrypted quotation' }));
    await screen.findByRole('button', { name: 'Unlock in this tab' });
    expect(mocks.open).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Project unlock passphrase'), { target: {
      value: 'private-different-passphrase',
    } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock in this tab' }));
    await screen.findByRole('button', { name: 'Confirm replace draft' });
    expect(restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm replace draft' }));
    expect(restore).toHaveBeenCalledOnce();
    expect(restore.mock.calls[0][0]).toEqual(draft);
    expect(screen.getByRole('button', { name: 'Save exact revision 3' })).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('saves ciphertext once, verifies server acknowledgement, and never retries a 503 automatically', async () => {
    mocks.save.mockRejectedValue(new ProjectVaultRequestError(503));
    render(<AccountProjectVault quote={quote} onRestoreQuote={restore} />);
    await signIn();
    await screen.findByRole('button', { name: 'Save new encrypted project' });
    fireEvent.change(screen.getByLabelText('Project passphrase (14–128 characters)'), {
      target: { value: 'Independent project passphrase 2026' },
    });
    fireEvent.change(screen.getByLabelText('Repeat project passphrase'), {
      target: { value: 'Independent project passphrase 2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save new encrypted project' }));
    await screen.findByText(/No automatic retry/);
    expect(mocks.seal).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith(id, 'quote', 0, sealed, expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'Save new encrypted project' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh saved projects' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(restore).not.toHaveBeenCalled();
  });

  it('refuses deletion until acknowledgement and confirmation of the exact revision', async () => {
    mocks.remove.mockResolvedValue({ removed: true, id });
    render(<AccountProjectVault quote={quote} onRestoreQuote={restore} />);
    await signIn();
    await screen.findByRole('button', { name: 'Open encrypted quotation' });
    fireEvent.click(screen.getByRole('button', { name: 'Open encrypted quotation' }));
    await screen.findByRole('button', { name: 'Confirm delete exact revision' });
    expect(screen.getByRole('button', { name: 'Confirm delete exact revision' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByLabelText(/I understand active vault deletion/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete exact revision' }));
    await screen.findByText(/Project removed from active storage/);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(id, 2, expect.any(AbortSignal));
    expect(screen.queryByRole('button', { name: 'Confirm delete exact revision' })).toBeNull();
    expect(restore).not.toHaveBeenCalled();
  });
});
