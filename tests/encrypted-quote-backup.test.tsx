// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createQuote, exportQuoteProject } from '../src/lib/business-desk';
import { sealProject } from '../src/lib/project-vault-crypto';
import EncryptedQuoteBackup from '../src/components/EncryptedQuoteBackup';

const secret = 'A long independent unique passphrase 2026';
const id = 'da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const draft = {
  businessName: 'Soweto Studio', customerName: 'Local Client',
  reference: 'Q-SECURE', rows: [{ description: 'Design', quantity: 2, unitPriceZar: '175.25' }],
};
const quotation = createQuote(draft);
function selectedFile(json: string, name = 'luqi-quote-encrypted.json') {
  const file = new File([json], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => json });
  return file;
}
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('local encrypted quotation backups', () => {
  it('does not offer backup of an unverified quote, never calls a provider and rejects mismatched secrets', () => {
    const request = vi.fn(), onRestore = vi.fn();
    vi.stubGlobal('fetch', request);
    render(<EncryptedQuoteBackup quote={null} onRestore={onRestore} />);
    expect((screen.getByRole('button', { name: 'Download encrypted backup' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/LUQI cannot unlock the file/)).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    cleanup();
    render(<EncryptedQuoteBackup quote={quotation} onRestore={onRestore} />);
    fireEvent.change(screen.getByLabelText('New backup passphrase'), { target: { value: secret } });
    fireEvent.change(screen.getByLabelText('Repeat backup passphrase'), { target: { value: secret + '-different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download encrypted backup' }));
    expect(screen.getByRole('alert').textContent).toContain('do not match');
    expect((screen.getByLabelText('New backup passphrase') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Repeat backup passphrase') as HTMLInputElement).value).toBe('');
    expect(request).not.toHaveBeenCalled();
  });
  it('revalidates a matching encrypted project but requires explicit confirmation before replacing input', async () => {
    const sealed = await sealProject(id, 'quote', exportQuoteProject(draft), secret);
    const payload = JSON.stringify({ format: 'luqi.business.encrypted-backup.v1', kind: 'quote', id, sealed });
    const request = vi.fn(), onRestore = vi.fn();
    vi.stubGlobal('fetch', request);
    render(<EncryptedQuoteBackup quote={quotation} onRestore={onRestore} />);
    const file = selectedFile(payload);
    fireEvent.change(screen.getByLabelText('Select encrypted quotation file (.json)'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText('Backup unlock passphrase'), { target: { value: 'Completely wrong passphrase 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock selected backup' }));
    await screen.findByText(/Unable to unlock that file/);
    expect(onRestore).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Backup unlock passphrase'), { target: { value: secret } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock selected backup' }));
    await screen.findByText('Replace the quotation currently in this tab?');
    expect(onRestore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep current quotation' }));
    expect(onRestore).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Select encrypted quotation file (.json)'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText('Backup unlock passphrase'), { target: { value: secret } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock selected backup' }));
    await screen.findByText('Replace the quotation currently in this tab?');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm replace quotation' }));
    expect(onRestore).toHaveBeenCalledExactlyOnceWith(draft);
    expect((screen.getByLabelText('Backup unlock passphrase') as HTMLInputElement).value).toBe('');
    expect(request).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('rejects malformed wrappers and unsupported project types before decrypting', async () => {
    const onRestore = vi.fn();
    render(<EncryptedQuoteBackup quote={quotation} onRestore={onRestore} />);
    const file = selectedFile(JSON.stringify({format:'unknown',id,kind:'quote'}));
    fireEvent.change(screen.getByLabelText('Select encrypted quotation file (.json)'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText('Backup unlock passphrase'), { target: { value: secret } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock selected backup' }));
    await screen.findByText(/Unable to unlock that file/);
    expect(onRestore).not.toHaveBeenCalled();
  });
});
