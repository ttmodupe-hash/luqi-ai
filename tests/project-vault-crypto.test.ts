import { afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { exportQuoteProject } from '../src/lib/business-desk';
import { serializeSalesFile } from '../src/lib/business-pipeline';
import { openSealedProject, sealProject } from '../src/lib/project-vault-crypto';
const id = 'da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const quote = exportQuoteProject({ businessName: 'Soweto Studio', customerName: 'Client nickname',
  reference: 'Q-1', rows: [{ description: 'Logo design', quantity: 2, unitPriceZar: '100.25' }] });
const secret = 'Local-Project-Secret-Only-For-This-Fixture';
afterEach(() => vi.unstubAllGlobals());
describe('private project client encryption', () => {
  it('recovers an exact quote only with the correct local passphrase', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const sealed = await sealProject(id, 'quote', quote, secret);
    expect(sealed.format).toBe('luqi.vault.sealed.v1');
    expect(JSON.stringify(sealed)).not.toContain('Soweto Studio');
    expect(JSON.stringify(sealed)).not.toContain(secret);
    expect(await openSealedProject(id, 'quote', sealed, secret)).toBe(quote);
    await expect(openSealedProject(id, 'quote', sealed, 'Different-Local-Secret-2026')).rejects.toThrow('PROJECT_SEAL_UNAVAILABLE');
    await expect(openSealedProject(id, 'sales', sealed, secret)).rejects.toThrow('PROJECT_SEAL_UNAVAILABLE');
    await expect(openSealedProject('ba9c1eb2-62f6-45fb-b7f9-a989521270ae', 'quote', sealed, secret)).rejects.toThrow('PROJECT_SEAL_UNAVAILABLE');
  });
  it('works with bounded sales files and detects ciphertext tampering', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const sales = serializeSalesFile([{ id, alias: 'Customer alias', valueZar: '300.00',
      stage: 'sent', followUpDate: '2026-10-25' }]);
    const sealed = await sealProject(id, 'sales', sales, secret);
    expect(await openSealedProject(id, 'sales', sealed, secret)).toBe(sales);
    await expect(openSealedProject(id, 'sales',
      { ...sealed, ciphertext: sealed.ciphertext.slice(0, -4) + 'AAAA' }, secret))
      .rejects.toThrow('PROJECT_SEAL_UNAVAILABLE');
  });
  it('rejects unbounded or unverifiable data before asking for encryption', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    vi.stubGlobal('crypto', webcrypto);
    await expect(sealProject(id, 'quote', '{"format":"unknown"}', secret)).rejects.toThrow();
    await expect(sealProject(id, 'quote', quote, 'short')).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
