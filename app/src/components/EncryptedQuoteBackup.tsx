import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createQuote, exportQuoteProject, importQuoteProject, type QuoteDraft, type QuoteResult } from '../lib/business-desk';
import { openSealedProject, sealProject, type SealedProject } from '../lib/project-vault-crypto';

const BACKUP_FORMAT = 'luqi.business.encrypted-backup.v1';
const MAX_FILE_BYTES = 38_000;
const keysMatch = (object: unknown, fields: string[]): object is Record<string, unknown> =>
  !!object && typeof object === 'object' && !Array.isArray(object) &&
  Object.keys(object).sort().join('|') === [...fields].sort().join('|');

function downloadEncrypted(text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'luqi-quote-encrypted.json';
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** Offline, user-owned encrypted backups. Not a payment, account or cloud vault. */
export default function EncryptedQuoteBackup({
  quote, onRestore,
}: {
  quote: QuoteResult | null;
  onRestore: (project: QuoteDraft) => void;
}) {
  const createPassphrase = useRef<HTMLInputElement>(null);
  const repeatPassphrase = useRef<HTMLInputElement>(null);
  const openPassphrase = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [candidate, setCandidate] = useState<QuoteDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => () => { generation.current++; }, []);
  function clearSecrets() {
    if (createPassphrase.current) createPassphrase.current.value = '';
    if (repeatPassphrase.current) repeatPassphrase.current.value = '';
    if (openPassphrase.current) openPassphrase.current.value = '';
  }
  function notice(text: string, isError = false) {
    setMessage(text);
    setFailed(isError);
  }
  async function encrypt() {
    if (!quote || busy) return;
    const passphrase = createPassphrase.current?.value ?? '';
    const confirmation = repeatPassphrase.current?.value ?? '';
    clearSecrets();
    setCandidate(null);
    if (passphrase !== confirmation) {
      notice('The two backup passphrases do not match. No file was generated.', true);
      return;
    }
    const epoch = ++generation.current;
    setBusy(true); notice('');
    try {
      const id = crypto.randomUUID();
      const sealed = await sealProject(id, 'quote', exportQuoteProject(quote), passphrase);
      if (epoch !== generation.current) return;
      const wrapper = JSON.stringify({ format: BACKUP_FORMAT, kind: 'quote', id, sealed });
      if (new TextEncoder().encode(wrapper).length > MAX_FILE_BYTES) throw Error('INVALID_BACKUP');
      downloadEncrypted(wrapper);
      notice('Encrypted quotation backup prepared. Keep the file and its passphrase separately. LUQI cannot recover a lost passphrase.');
    } catch {
      if (epoch === generation.current)
        notice('Encryption could not complete. No valid backup was confirmed. Your quotation remains unchanged.', true);
    } finally {
      if (epoch === generation.current) setBusy(false);
    }
  }
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    generation.current++;
    clearSecrets();
    setCandidate(null); setFile(selected); notice('');
  }
  async function unlock() {
    if (!file || busy) return;
    const passphrase = openPassphrase.current?.value ?? '';
    clearSecrets();
    const epoch = ++generation.current;
    setBusy(true); setCandidate(null); notice('');
    try {
      if (!file.name.toLowerCase().endsWith('.json') ||
          file.size < 1 || file.size > MAX_FILE_BYTES) throw Error('INVALID_BACKUP');
      const raw = await file.text();
      if (epoch !== generation.current) return;
      if (new TextEncoder().encode(raw).length > MAX_FILE_BYTES) throw Error('INVALID_BACKUP');
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { throw Error('INVALID_BACKUP'); }
      if (!keysMatch(parsed, ['format', 'kind', 'id', 'sealed']) ||
          parsed.format !== BACKUP_FORMAT || parsed.kind !== 'quote' ||
          typeof parsed.id !== 'string' ||
          !keysMatch(parsed.sealed, ['format', 'kdf', 'salt', 'nonce', 'ciphertext'])) {
        throw Error('INVALID_BACKUP');
      }
      const plaintext = await openSealedProject(parsed.id, 'quote',
        parsed.sealed as unknown as SealedProject, passphrase);
      if (epoch !== generation.current) return;
      const draft = importQuoteProject(plaintext);
      createQuote(draft);
      setCandidate(draft);
      notice('Backup unlocked in this tab. Review the replacement warning and confirm before loading it into your quotation.');
    } catch {
      if (epoch === generation.current) notice('Unable to unlock that file. Check the backup format and passphrase. Your current quotation has not been changed.', true);
    } finally {
      if (epoch === generation.current) setBusy(false);
    }
  }
  function apply() {
    if (!candidate || busy) return;
    const ready = candidate;
    generation.current++;
    setCandidate(null); setFile(null);
    clearSecrets();
    onRestore(ready);
    notice('Unlocked quotation restored into the form. Review it and save your next changes separately.');
  }

  return <section className="luqi-business-encrypted" aria-labelledby="encrypted-quote-title">
    <h3 id="encrypted-quote-title">Protect a quotation backup</h3>
    <p>Encrypt and reopen your editable quotation using a passphrase you control. This stays in your browser: it does not sync across devices or upload to LUQI.</p>
    <p className="luqi-business-note">Use a long, unique passphrase (at least 14 characters), not your LUQI login password. <strong>If you lose it, LUQI cannot unlock the file.</strong> A local encrypted backup is not a substitute for safe storage.</p>
    <div className="luqi-business-encrypted-grid">
      <div className="luqi-business-encrypted-part">
        <h4>Save an encrypted backup</h4>
        <p className="luqi-business-note">First prepare a valid quotation above.</p>
        <label>New backup passphrase
          <input type="password" ref={createPassphrase} minLength={14} maxLength={128}
            autoComplete="off" disabled={busy} />
        </label>
        <label>Repeat backup passphrase
          <input type="password" ref={repeatPassphrase} minLength={14} maxLength={128}
            autoComplete="off" disabled={busy} />
        </label>
        <button className="luqi-business-small" type="button" disabled={busy || !quote}
          onClick={() => void encrypt()}>Download encrypted backup</button>
      </div>
      <div className="luqi-business-encrypted-part">
        <h4>Unlock a backup</h4>
        <label>Select encrypted quotation file (.json)
          <input type="file" accept=".json,application/json" onChange={chooseFile} disabled={busy} />
        </label>
        <label>Backup unlock passphrase
          <input type="password" ref={openPassphrase} minLength={14} maxLength={128}
            autoComplete="off" disabled={busy} />
        </label>
        <button className="luqi-business-small" type="button" disabled={!file || busy}
          onClick={() => void unlock()}>Unlock selected backup</button>
      </div>
    </div>
    {message && <p role={failed ? 'alert' : 'status'}
      className={failed ? 'luqi-business-error' : 'luqi-business-note'}>{message}</p>}
    {candidate && <div className="luqi-business-import-confirm" aria-label="Confirm encrypted quotation restore">
      <h4>Replace the quotation currently in this tab?</h4>
      <p>The unlocked file is for <strong>{candidate.businessName}</strong>, reference <strong>{candidate.reference}</strong>. Loading it replaces the current quotation fields; save your current work first.</p>
      <div className="luqi-business-actions">
        <button type="button" className="luqi-business-small"
          onClick={() => { setCandidate(null); setFile(null); notice('Backup restore cancelled. The current quotation is unchanged.'); }}>
          Keep current quotation
        </button>
        <button type="button" className="luqi-business-small" onClick={apply}>
          Confirm replace quotation
        </button>
      </div>
    </div>}
  </section>;
}
