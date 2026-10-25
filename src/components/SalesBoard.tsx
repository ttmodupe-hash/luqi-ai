import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  MAX_SALES_FILE_BYTES, MAX_SALES_RECORDS,
  parseSalesFile, serializeSalesFile, summarizeSales, validateSalesRecords,
  type SalesRecord, type SalesStage,
} from '../lib/business-pipeline';
import { asZar, toCents } from '../lib/business-desk';

interface SuggestedQuote { alias: string; amountZar: string }
const stages: readonly SalesStage[] = ['draft', 'sent', 'followup', 'won', 'lost'];
const labels: Record<SalesStage, string> = {
  draft: 'Draft', sent: 'Quote sent', followup: 'Follow up', won: 'Won', lost: 'Lost',
};
function todayLocal(): string {
  const now = new Date();
  return [String(now.getFullYear()).padStart(4, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')].join('-');
}
function downloadJson(value: string) {
  const url = URL.createObjectURL(new Blob([value], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'luqi-sales-board.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function SalesBoard({ suggestedQuote }: { suggestedQuote?: SuggestedQuote | null }) {
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [alias, setAlias] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [stage, setStage] = useState<SalesStage>('sent');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingImport, setPendingImport] = useState<SalesRecord[] | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const summary = summarizeSales(records, todayLocal());
  const due = records.filter(r =>
    r.stage !== 'won' && r.stage !== 'lost' &&
    r.followUpDate !== null && r.followUpDate <= todayLocal());

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      const current: SalesRecord = {
        id: crypto.randomUUID(),
        alias: alias.trim(),
        valueZar: asZar(toCents(value.trim())),
        stage,
        followUpDate: stage === 'won' || stage === 'lost' ? null : date || null,
      };
      setRecords(previous => validateSalesRecords([...previous, current]));
      setAlias(''); setValue(''); setDate(''); setStage('sent');
      setNotice('Record added to this tab. Download an updated copy to keep it.');
    } catch {
      setError('Check the alias, ZAR value and follow-up date. Use a short client nickname; no contact details are required.');
    }
  }
  function updateRecord(id: string, patch: Partial<SalesRecord>) {
    setError(''); setNotice('');
    try {
      const updated = validateSalesRecords(records.map(record =>
        record.id === id ? { ...record, ...patch } : record));
      setRecords(updated);
      setNotice('Board changed in this tab. Export again to keep this update.');
    } catch {
      setError('That update was invalid. No change was saved to the board.');
    }
  }
  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setPendingImport(null); setError(''); setNotice('');
    if (file.size > MAX_SALES_FILE_BYTES) {
      setError('File too large. LUQI accepts a 32 KiB maximum JSON board.');
      return;
    }
    try {
      const incoming = parseSalesFile(await file.text());
      setPendingImport(incoming);
      setNotice('File checked. Confirm replacement before your current in-tab board is changed.');
    } catch {
      setError('This is not a valid LUQI sales-board JSON file. Your current board has not changed.');
    }
  }
  return <section className="luqi-business-panel luqi-sales-board" aria-labelledby="luqi-sales-heading">
    <h2 id="luqi-sales-heading">Follow up on quotations</h2>
    <p>Track up to 50 local opportunities, which quotes need attention and which ones you mark as won. Use nicknames instead of private contact details. This is not a payment ledger or sales forecast.</p>
    <p className="luqi-business-note">No automatic cloud save or reminders. Your board stays only in this tab until you explicitly export a JSON file. That file is not encrypted; keep it secure and reopen it on your next visit.</p>
    <div className="luqi-sales-stats" aria-label="Sales-board summary">
      <div><strong>{summary.openCount}</strong><span>Open opportunities</span></div>
      <div><strong>{summary.dueCount}</strong><span>Due for follow-up</span></div>
      <div><strong>R {summary.openValueZar}</strong><span>Open quote value, not income</span></div>
      <div><strong>R {summary.wonValueZar}</strong><span>Marked won, not cash received</span></div>
    </div>
    <form className="luqi-business-form" onSubmit={addRecord}>
      <div className="luqi-business-item-heading">
        <h3>Add a prospect</h3>
        <span>{records.length} of {MAX_SALES_RECORDS} in this board</span>
      </div>
      {suggestedQuote && <button type="button" className="luqi-business-small luqi-sales-suggestion"
        onClick={() => { setAlias(suggestedQuote.alias); setValue(suggestedQuote.amountZar); setNotice('Quote values copied into this form only. Review before adding.'); setError(''); }}>
        Use current quotation details
      </button>}
      <div className="luqi-business-two">
        <label>Client nickname
          <input required maxLength={60} value={alias} placeholder="For example: Bakery client"
            onChange={e => setAlias(e.target.value)} />
        </label>
        <label>Quote amount (ZAR)
          <input required type="text" maxLength={11} inputMode="decimal" value={value} placeholder="250.00"
            onChange={e => setValue(e.target.value)} />
        </label>
        <label>Sales stage
          <select value={stage} onChange={e => setStage(e.target.value as SalesStage)}>
            {stages.map(value => <option key={value} value={value}>{labels[value]}</option>)}
          </select>
        </label>
        <label>Next follow-up date (optional)
          <input type="date" min="1900-01-01" max="2099-12-31" value={date}
            onChange={e => setDate(e.target.value)}
            disabled={stage === 'won' || stage === 'lost'} />
        </label>
      </div>
      <button type="submit" className="luqi-primary" disabled={records.length >= MAX_SALES_RECORDS}>Add to local board</button>
    </form>
    {error && <p className="luqi-business-error" role="alert">{error}</p>}
    {notice && <p className="luqi-sales-notice" role="status">{notice}</p>}
    {due.length > 0 && <div className="luqi-sales-due" aria-label="Due follow-ups">
      <h3>Due now or overdue</h3>
      <ul>{due.map(item => <li key={item.id}>{item.alias} — {item.followUpDate}</li>)}</ul>
    </div>}
    {records.length > 0 && <ul className="luqi-sales-records" aria-label="Local prospect records">
      {records.map(record => <li key={record.id}>
        <div className="luqi-sales-card-title"><strong>{record.alias}</strong><span>R {record.valueZar}</span></div>
        <div className="luqi-business-two">
          <label>Stage for {record.alias}
            <select value={record.stage} onChange={e => updateRecord(record.id, {
              stage: e.target.value as SalesStage,
              followUpDate: e.target.value === 'won' || e.target.value === 'lost' ? null : record.followUpDate,
            })}>
              {stages.map(value => <option key={value} value={value}>{labels[value]}</option>)}
            </select>
          </label>
          <label>Follow-up date for {record.alias}
            <input type="date" min="1900-01-01" max="2099-12-31"
              value={record.followUpDate ?? ''}
              disabled={record.stage === 'won' || record.stage === 'lost'}
              onChange={e => updateRecord(record.id, { followUpDate: e.target.value || null })} />
          </label>
        </div>
        {removeId !== record.id ? <button type="button" className="luqi-business-small"
          onClick={() => setRemoveId(record.id)}>Remove local record</button> :
          <div className="luqi-business-actions">
            <button type="button" className="luqi-business-small" onClick={() => setRemoveId(null)}>Keep record</button>
            <button type="button" className="luqi-business-small" onClick={() => {
              setRecords(old => old.filter(item => item.id !== record.id));
              setRemoveId(null);
              setNotice('Record removed from this tab. Previous exported files are unchanged.');
            }}>Confirm local removal</button>
          </div>}
      </li>)}
    </ul>}
    <div className="luqi-sales-files">
      <button type="button" className="luqi-business-download" disabled={!records.length}
        onClick={() => {
          try { downloadJson(serializeSalesFile(records)); setNotice('Download requested. Check your device for luqi-sales-board.json.'); }
          catch { setError('Could not prepare the file. The current board remains in this tab.'); }
        }}>Download board JSON</button>
      <label>Open a previous LUQI board (JSON, max 32 KiB)
        <input type="file" accept=".json,application/json" onChange={event => { void uploadFile(event); }} />
      </label>
    </div>
    {pendingImport !== null && <div className="luqi-sales-import" role="group" aria-label="Confirm board replacement">
      <p>Replace this in-tab board with {pendingImport.length} verified records? Export your current board first if needed.</p>
      <div className="luqi-business-actions">
        <button type="button" className="luqi-business-small" onClick={() => { setPendingImport(null); setNotice('Current board kept.'); }}>Keep current board</button>
        <button type="button" className="luqi-business-small" onClick={() => {
          setRecords(pendingImport); setPendingImport(null); setRemoveId(null);
          setNotice('Verified board opened in this tab. Download again after edits.');
        }}>Confirm replace board</button>
      </div>
    </div>}
    <p className="luqi-business-note">No payment collection, customer messaging, email reminders, verified cash receipts, merchant checkout or subscriber entitlement is connected to this board.</p>
  </section>;
}
