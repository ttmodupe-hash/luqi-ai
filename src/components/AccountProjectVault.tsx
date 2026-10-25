/** Feature-gated pilot UI. The authenticated vault API has a separate production-off gate. */
import { useEffect, useRef, useState } from 'react';
import AccountAccessForm from './AccountAccessForm';
import { createQuote, exportQuoteProject, importQuoteProject, type QuoteDraft, type QuoteResult } from '../lib/business-desk';
import { openSealedProject, sealProject } from '../lib/project-vault-crypto';
import { projectVaultClient, ProjectVaultRequestError, type ProjectMetadata, type VaultProject } from '../lib/project-vault-client';
import type { AccountSession } from '../lib/private-conversations';

type Gate = 'idle' | 'checking' | 'ready' | 'disabled' | 'unavailable';
type ConfirmedProject = { id: string; revision: number };

function downloadCiphertext(item: VaultProject) {
  const body = JSON.stringify({ format: 'luqi.business.encrypted-backup.v1',
    kind: 'quote', id: item.id, sealed: item.sealed });
  if (new TextEncoder().encode(body).byteLength > 38_000) throw Error('INVALID_BACKUP');
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json;charset=utf-8' }));
  try {
    const link = document.createElement('a');
    link.download = 'luqi-quote-encrypted.json';
    link.href = url;
    link.click();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 10_000); }
}

/** Quote-only UI; sales-board sync and subscriptions are not enabled by this milestone. */
export default function AccountProjectVault({ quote, onRestoreQuote }: {
  quote: QuoteResult | null;
  onRestoreQuote: (project: QuoteDraft) => void;
}) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [gate, setGate] = useState<Gate>('idle');
  const [records, setRecords] = useState<ProjectMetadata[]>([]);
  const [selected, setSelected] = useState<VaultProject | null>(null);
  const [candidate, setCandidate] = useState<QuoteDraft | null>(null);
  const [edit, setEdit] = useState<ConfirmedProject | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [hold, setHold] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const createPassphrase = useRef<HTMLInputElement>(null);
  const repeatPassphrase = useRef<HTMLInputElement>(null);
  const unlockPassphrase = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const locked = useRef(false);

  function clearPhrases() {
    if (createPassphrase.current) createPassphrase.current.value = '';
    if (repeatPassphrase.current) repeatPassphrase.current.value = '';
    if (unlockPassphrase.current) unlockPassphrase.current.value = '';
  }
  useEffect(() => () => {
    generation.current++;
    pending.current?.abort();
    if (createPassphrase.current) createPassphrase.current.value = '';
    if (repeatPassphrase.current) repeatPassphrase.current.value = '';
    if (unlockPassphrase.current) unlockPassphrase.current.value = '';
  }, []);
  function message(value: string, isError = false) { setNotice(value); setFailed(isError); }
  function signOut(reason = '') {
    generation.current++;
    pending.current?.abort(); pending.current = null;
    locked.current = false; clearPhrases();
    setSession(null); setGate('idle'); setRecords([]); setSelected(null);
    setCandidate(null); setEdit(null); setRemoveConfirm(false); setHold(null);
    setBusy(false); message(reason, !!reason);
  }
  async function work(task: (signal: AbortSignal, stillCurrent: () => boolean) => Promise<void>,
                      failure: string, mutation = false, holdId?: string) {
    if (locked.current) return;
    locked.current = true; setBusy(true); message('');
    const version = generation.current;
    const controller = new AbortController();
    pending.current = controller;
    const current = () => version === generation.current && !controller.signal.aborted;
    try { await task(controller.signal, current); }
    catch (error) {
      if (!current()) return;
      if (error instanceof ProjectVaultRequestError && [401, 403].includes(error.status)) {
        signOut('Session invalid or expired. Sign in again. If a write was in flight, verify the outcome independently.');
      } else if (mutation) {
        // A lost reply or 503 can occur after a transaction commits. Never repeat it.
        setHold(holdId ?? 'unconfirmed operation');
        message(failure + ' No automatic retry. Refresh the saved list and independently review the outcome before starting a new session.', true);
      } else message(failure, true);
    } finally {
      if (version === generation.current) {
        locked.current = false; pending.current = null; setBusy(false);
      }
    }
  }
  function refresh(active: AccountSession) {
    void work(async (signal, current) => {
      setGate('checking'); setSelected(null); setCandidate(null);
      setRemoveConfirm(false); clearPhrases();
      const api = projectVaultClient(active.token);
      let state;
      try { state = await api.status(signal); }
      catch (error) { if (current()) setGate('unavailable'); throw error; }
      if (!current()) return;
      if (state.availability === 'disabled') {
        setGate('disabled'); setRecords([]);
        message('Account sync is disabled. Free local quotation tools are unaffected.');
        return;
      }
      let list;
      try { list = await api.list(signal); }
      catch (error) { if (current()) setGate('unavailable'); throw error; }
      if (!current()) return;
      setRecords(list); setGate('ready');
      message('Encrypted project metadata refreshed. This does not certify backup recoverability.');
    }, 'Unable to verify private vault readiness. No project writes are available.');
  }
  function signedIn(value: AccountSession) {
    generation.current++; pending.current?.abort(); locked.current = false;
    clearPhrases(); setSession(value); setSelected(null);
    setCandidate(null); setRecords([]); setEdit(null); setHold(null);
    refresh(value);
  }
  function load(item: ProjectMetadata) {
    if (!session || gate !== 'ready') return;
    void work(async (signal, current) => {
      setCandidate(null); setSelected(null); setEdit(null); setRemoveConfirm(false); clearPhrases();
      const value = await projectVaultClient(session.token).get(item.id, signal);
      if (!current()) return;
      if (value.kind !== 'quote' || value.revision !== item.revision) {
        message('This project changed after the list was loaded. Refresh before opening it.', true);
        return;
      }
      setSelected(value);
      message('Encrypted quotation opened. Its plaintext is not accessible until the correct passphrase is entered.');
    }, 'Could not load the encrypted quotation. No local quotation was replaced.');
  }
  function unlock() {
    if (!selected || gate !== 'ready') return;
    const id = selected.id, sealed = selected.sealed;
    const passphrase = unlockPassphrase.current?.value ?? '';
    clearPhrases();
    void work(async (_signal, current) => {
      setCandidate(null);
      const text = await openSealedProject(id, 'quote', sealed, passphrase);
      if (!current()) return;
      const draft = importQuoteProject(text);
      createQuote(draft);
      setCandidate(draft);
      message('Quotation decrypted in this tab only. Confirm before replacing the current draft.');
    }, 'Unable to decrypt the quotation. Check the project passphrase. No local fields were replaced.');
  }
  function restore() {
    if (!candidate || !selected || busy) return;
    // The existing BusinessDeskPage restore handler invalidates older file imports.
    onRestoreQuote(candidate);
    setEdit({ id: selected.id, revision: selected.revision });
    setCandidate(null); clearPhrases();
    message('Draft restored. Prepare the updated quotation before saving a new encrypted revision.');
  }
  function save(update: boolean) {
    if (!session || gate !== 'ready' || busy || hold || !quote || (update && !edit)) return;
    const phrase = createPassphrase.current?.value ?? '';
    const confirmation = repeatPassphrase.current?.value ?? '';
    clearPhrases();
    if (phrase !== confirmation) {
      message('Project passphrases do not match. No network save was started.', true);
      return;
    }
    const target = update && edit ? edit : { id: crypto.randomUUID(), revision: 0 };
    void work(async (signal, current) => {
      let sealed;
      try { sealed = await sealProject(target.id, 'quote', exportQuoteProject(quote), phrase); }
      catch {
        if (current()) message('Local encryption failed; no save request was sent.', true);
        return;
      }
      if (!current()) return;
      const api = projectVaultClient(session.token);
      try {
        const outcome = await api.save(target.id, 'quote', target.revision, sealed, signal);
        if (!current()) return;
        setEdit({ id: outcome.id, revision: outcome.revision });
        setSelected(null); setCandidate(null); setRemoveConfirm(false);
        message('Confirmed encrypted ' + (outcome.created ? 'project' : 'revision') +
          ' saved. Project ID: ' + outcome.id + '. Revision ' + outcome.revision + '. Refresh to verify it in your list.');
      } catch (error) {
        if (!current()) return;
        if (error instanceof ProjectVaultRequestError && error.status === 409) {
          setHold(target.id);
          message('Revision conflict: saved project may have changed on another device. Project ID ' +
            target.id + '. Refresh and reconcile, do not overwrite blindly.', true);
          return;
        }
        if (error instanceof ProjectVaultRequestError && error.status === 429) {
          message('Owner project limit reached. No successful new save was reported.', true);
          return;
        }
        throw error;
      }
    }, 'Encrypted save outcome is unconfirmed for project ' + target.id + '.', true, target.id);
  }
  function remove() {
    if (!session || gate !== 'ready' || busy || hold || !selected || !removeConfirm) return;
    const target = selected;
    setRemoveConfirm(false);
    void work(async (signal, current) => {
      const client = projectVaultClient(session.token);
      try {
        await client.remove(target.id, target.revision, signal);
      } catch (error) {
        if (!current()) return;
        if (error instanceof ProjectVaultRequestError && [404, 409].includes(error.status)) {
          setHold(target.id);
          message('Project missing or changed since inspection. Refresh and reconcile revision ' +
            target.revision + ' before doing anything else.', true);
          return;
        }
        throw error;
      }
      if (!current()) return;
      setRecords(previous => previous.filter(item => item.id !== target.id));
      if (edit?.id === target.id) setEdit(null);
      setSelected(null); setCandidate(null);
      message('Project removed from active storage with confirmed acknowledgement. Backups and exported files remain separate.');
    }, 'Project removal outcome is unconfirmed for ' + target.id + '.', true, target.id);
  }
  function backup() {
    if (!selected || busy) return;
    try { downloadCiphertext(selected); message('Encrypted backup download requested. Check your device and protect the file and passphrase separately.'); }
    catch { message('Encrypted backup download could not be confirmed. Nothing was deleted.', true); }
  }

  return <section className="luqi-private-vault" aria-labelledby="luqi-project-vault-title">
    <p className="luqi-eyebrow">OPT-IN TEST COHORT · NO SUBSCRIPTIONS</p>
    <h2 id="luqi-project-vault-title">Account-owned encrypted projects</h2>
    <p>This optional pilot workflow stores ciphertext, not your quotation text or passphrase.
      Cross-device reopening requires your own separate project passphrase.
      <strong> If you lose it, LUQI cannot unlock the project.</strong></p>
    <p className="luqi-business-note">Requires separately approved operator rollout, isolated restore and privacy review.
      There is no automatic sync, provider request, paid entitlement, or certified recovery.
      The local Business Desk remains available and free.</p>
    {notice && <p role={failed ? 'alert' : 'status'}
      className={failed ? 'luqi-business-error' : 'luqi-business-note'}>{notice}</p>}
    {!session ? <AccountAccessForm purpose="vault" onAuthenticated={signedIn} /> : <>
      <div className="luqi-business-actions">
        <span className="luqi-vault-email">Signed in: {session.user.email}</span>
        <button className="luqi-business-small" type="button" onClick={() => signOut()}>Sign out of vault</button>
        <button className="luqi-business-small" type="button" disabled={busy}
          onClick={() => refresh(session)}>Refresh saved projects</button>
      </div>
      {gate !== 'ready' ? <p role="status">{gate === 'checking' ? 'Checking account vault…'
        : gate === 'disabled' ? 'Account project sync is disabled; no storage writes are available.'
        : 'Account project sync has not been verified; no writes are available.'}</p> : <>
        {hold && <p role="alert" className="luqi-business-error">
          Write or revision outcome needs independent review for project {hold}.
          This session will not automatically retry or start another write. Save any current draft locally and sign out after reviewing the server state.
        </p>}
        <div className="luqi-vault-grid">
          <div>
            <h3>Saved project metadata</h3>
            <p className="luqi-business-note">20 records maximum across quotes and sales.
              Your encrypted content stays closed until unlocked in this browser.</p>
            {records.length === 0 ? <p>No saved projects reported for this account.</p> :
              <ul className="luqi-vault-list">{records.map(record => <li key={record.id}>
                <span>{record.kind === 'quote' ? 'Quotation' : 'Sales (not supported by this UI)'}
                  {' · '}rev {record.revision}{' · '}<time>{record.updatedAt.slice(0, 10)}</time></span>
                <button className="luqi-business-small" type="button"
                  disabled={busy || record.kind !== 'quote'}
                  onClick={() => load(record)}>Open encrypted quotation</button>
              </li>)}</ul>}
          </div>
          <div>
            <h3>{edit ? 'Update a restored quotation' : 'Save a new quotation'}</h3>
            <p className="luqi-business-note">First prepare a valid quotation above. A new passphrase is required for each save;
              existing entries use the exact version you restored. Save copies locally before editing on another device.</p>
            <label>Project passphrase (14–128 characters)
              <input ref={createPassphrase} type="password" minLength={14} maxLength={128}
                autoComplete="off" disabled={busy || !!hold} />
            </label>
            <label>Repeat project passphrase
              <input ref={repeatPassphrase} type="password" minLength={14} maxLength={128}
                autoComplete="off" disabled={busy || !!hold} />
            </label>
            <div className="luqi-business-actions">
              <button type="button" className="luqi-business-small"
                disabled={busy || !!hold || !quote} onClick={() => save(false)}>Save new encrypted project</button>
              {edit && <button type="button" className="luqi-business-small"
                disabled={busy || !!hold || !quote} onClick={() => save(true)}>Save exact revision {edit.revision + 1}</button>}
            </div>
          </div>
        </div>
        {selected && <div className="luqi-vault-selected">
          <h3>Selected encrypted quotation</h3>
          <p>Project ID: <code>{selected.id}</code>. Revision {selected.revision}.</p>
          <div className="luqi-business-actions">
            <button type="button" className="luqi-business-small" disabled={busy}
              onClick={backup}>Download selected encrypted backup</button>
          </div>
          <label>Project unlock passphrase
            <input ref={unlockPassphrase} type="password" minLength={14} maxLength={128}
              autoComplete="off" disabled={busy} />
          </label>
          <button type="button" className="luqi-business-small" disabled={busy}
            onClick={unlock}>Unlock in this tab</button>
          {candidate && <div className="luqi-business-import-confirm">
            <p>Replace the current quotation with <strong>{candidate.businessName}</strong>,
              reference <strong>{candidate.reference}</strong>? Save your current draft first.</p>
            <div className="luqi-business-actions">
              <button type="button" className="luqi-business-small"
                onClick={() => { setCandidate(null); message('Current quotation kept.'); }}>Keep current draft</button>
              <button type="button" className="luqi-business-small"
                onClick={restore}>Confirm replace draft</button>
            </div>
          </div>}
          <div className="luqi-vault-danger">
            <label><input type="checkbox" checked={removeConfirm} disabled={busy || !!hold}
              onChange={event => setRemoveConfirm(event.target.checked)} />
              I understand active vault deletion does not erase backups or downloaded files.</label>
            <button type="button" className="luqi-business-small"
              disabled={busy || !!hold || !removeConfirm}
              onClick={remove}>Confirm delete exact revision</button>
          </div>
        </div>}
      </>}
    </>}
  </section>;
}
