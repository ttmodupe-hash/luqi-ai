import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import { checkPricing, createQuote, exportQuoteProject, importQuoteProject, type QuoteResult, type PricingResult } from '../lib/business-desk';
import SalesBoard from '../components/SalesBoard';
import '../business-desk.css';

interface DraftRow { description: string; quantity: string; unitPriceZar: string }
const freshRow = (): DraftRow => ({ description: '', quantity: '1', unitPriceZar: '' });
function integer(value: string): number {
  return /^[0-9]{1,4}$/.test(value) ? Number(value) : NaN;
}
function downloadDraft(body: string, filename = 'luqi-draft-quotation.txt', type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function BusinessDeskPage() {
  const [businessName, setBusinessName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [reference, setReference] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([freshRow()]);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const importEpoch = useRef(0);
  useEffect(() => () => { importEpoch.current++; }, []);
  const [selling, setSelling] = useState('');
  const [cost, setCost] = useState('');
  const [fixed, setFixed] = useState('');
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [pricingError, setPricingError] = useState('');

  function editQuote() { importEpoch.current++; setQuote(null); setQuoteError(''); }
  function setRow(index: number, field: keyof DraftRow, value: string) {
    setRows(previous => previous.map((row, i) => i === index ? { ...row, [field]: value } : row));
    editQuote();
  }
  function prepareQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    editQuote();
    try {
      const result = createQuote({
        businessName, customerName, reference,
        rows: rows.map(row => ({
          description: row.description, quantity: integer(row.quantity),
          unitPriceZar: row.unitPriceZar.trim(),
        })),
      });
      setQuote(result);
    } catch {
      setQuoteError('Check the business, customer, reference and 1–12 item lines. Use positive whole quantities and ZAR amounts with no more than two decimal places.');
    }
  }

  async function loadProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    // Every new intent invalidates an earlier import. A late read cannot
    // overwrite edits or switch an account/session.
    const epoch = ++importEpoch.current;
    setQuote(null); setQuoteError('');
    try {
      if (!file.name.toLowerCase().endsWith('.json') || file.size < 1 || file.size > 16_384)
        throw new Error('INVALID_BUSINESS_INPUT');
      const raw = await file.text();
      if (epoch !== importEpoch.current) return;
      const project = importQuoteProject(raw);
      setBusinessName(project.businessName);
      setCustomerName(project.customerName);
      setReference(project.reference);
      setRows(project.rows.map(row => ({
        description: row.description, quantity: String(row.quantity),
        unitPriceZar: row.unitPriceZar,
      })));
      setQuote(createQuote(project));
      setQuoteError('');
    } catch {
      if (epoch === importEpoch.current) {
        setQuoteError('The selected file is not a valid LUQI editable quotation project (maximum 16 KB). Your existing details were not replaced.');
      }
    }
  }

  function preparePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPricing(null); setPricingError('');
    try {
      setPricing(checkPricing({
        sellingPriceZar: selling.trim(), directCostZar: cost.trim(), monthlyFixedZar: fixed.trim(),
      }));
    } catch {
      setPricingError('Enter nonnegative ZAR amounts with up to two decimal places. This planner does not provide tax or accounting advice.');
    }
  }

  return <main className="luqi-business">
    <header className="luqi-business-heading">
      <p className="luqi-eyebrow">PRACTICAL TOOLS FOR INDEPENDENT WORK</p>
      <h1>Business desk</h1>
      <p>Prepare a draft client quotation and work out how many sales could cover your stated fixed costs. Both tools run in your browser—no sign-in, AI credits, external services or subscription required.</p>
      <p className="luqi-business-note">Your entries stay in this tab. Nothing is sent to LUQI or saved to your account. Download the text quotation or an editable project before leaving if you want to keep it.</p>
    </header>
    <div className="luqi-business-grid">
      <section className="luqi-business-panel" aria-labelledby="luqi-quote-heading">
        <h2 id="luqi-quote-heading">Create a draft quotation</h2>
        <p>Use your own client details and item prices. A quotation is not a receipt, tax invoice or guarantee of payment.</p>
        <form onSubmit={prepareQuote} className="luqi-business-form">
          <div className="luqi-business-two">
            <label>Business name
              <input required maxLength={90} value={businessName} onChange={e => { setBusinessName(e.target.value); editQuote(); }} autoComplete="organization" />
            </label>
            <label>Customer name
              <input required maxLength={90} value={customerName} onChange={e => { setCustomerName(e.target.value); editQuote(); }} />
            </label>
          </div>
          <label>Quote reference
            <input required maxLength={45} value={reference} onChange={e => { setReference(e.target.value); editQuote(); }} placeholder="For example: Q-001" />
          </label>
          <div className="luqi-business-item-heading">
            <h3>Items</h3>
            <span>Up to 12 lines · ZAR only</span>
          </div>
          {rows.map((row, index) => <fieldset className="luqi-business-row" key={index}>
            <legend>Item {index + 1}</legend>
            <label>Item {index + 1} description
              <input required maxLength={120} value={row.description}
                onChange={e => setRow(index, 'description', e.target.value)} placeholder="Service or product" />
            </label>
            <div className="luqi-business-two">
              <label>Item {index + 1} quantity
                <input required type="number" min={1} max={1000} step={1} value={row.quantity}
                  onChange={e => setRow(index, 'quantity', e.target.value)} />
              </label>
              <label>Item {index + 1} unit price (ZAR)
                <input required type="text" inputMode="decimal" maxLength={11} value={row.unitPriceZar}
                  onChange={e => setRow(index, 'unitPriceZar', e.target.value)} placeholder="125.00" />
              </label>
            </div>
            {rows.length > 1 && <button className="luqi-business-small" type="button"
              onClick={() => { setRows(previous => previous.filter((_, i) => i !== index)); editQuote(); }}>
              Remove item {index + 1}
            </button>}
          </fieldset>)}
          <div className="luqi-business-actions">
            <button className="luqi-business-small" type="button" disabled={rows.length >= 12}
              onClick={() => { setRows(previous => [...previous, freshRow()]); editQuote(); }}>
              Add another line
            </button>
            <button className="luqi-primary" type="submit">Prepare quotation</button>
          </div>
        </form>
        <div className="luqi-business-project-actions">
          <label className="luqi-business-project-upload">
            Restore editable quotation (.json)
            <input type="file" accept=".json,application/json" onChange={loadProject} />
          </label>
          <p className="luqi-business-note">Choose a LUQI project you previously saved. It is opened locally, not uploaded. A valid file replaces this tab's draft; save your current one first if needed.</p>
        </div>
        {quoteError && <p className="luqi-business-error" role="alert">{quoteError}</p>}
        {quote && <section className="luqi-business-result" aria-label="Draft quotation result" role="status">
          <h3>Draft quotation ready</h3>
          <p className="luqi-business-money">R {quote.subtotalZar}</p>
          <p>Subtotal before any taxes or transaction fees.</p>
          <pre>{quote.textDraft}</pre>
          <div className="luqi-business-actions">
            <button type="button" className="luqi-business-download" onClick={() => downloadDraft(quote.textDraft)}>Download text draft</button>
            <button type="button" className="luqi-business-download" onClick={() => downloadDraft(exportQuoteProject(quote), 'luqi-quote-project.json', 'application/json;charset=utf-8')}>Save editable project</button>
          </div>
          <p className="luqi-business-result-note">Review your business identity, price, applicable taxes and terms before you share it. LUQI does not issue tax invoices or collect payment.</p>
        </section>}
      </section>
      <section className="luqi-business-panel" aria-labelledby="luqi-pricing-heading">
        <h2 id="luqi-pricing-heading">Check a selling price</h2>
        <p>Estimate gross profit per sale and how many sales may cover the fixed costs you enter. No sales or income is guaranteed.</p>
        <form className="luqi-business-form" onSubmit={preparePricing}>
          <label>Selling price per sale (ZAR)
            <input required type="text" inputMode="decimal" maxLength={11} value={selling}
              onChange={e => { setSelling(e.target.value); setPricing(null); setPricingError(''); }} placeholder="150.00" />
          </label>
          <label>Direct cost per sale (ZAR)
            <input required type="text" inputMode="decimal" maxLength={11} value={cost}
              onChange={e => { setCost(e.target.value); setPricing(null); setPricingError(''); }} placeholder="100.00" />
          </label>
          <label>Fixed costs to cover (ZAR, same period)
            <input required type="text" inputMode="decimal" maxLength={11} value={fixed}
              onChange={e => { setFixed(e.target.value); setPricing(null); setPricingError(''); }} placeholder="1000.00" />
          </label>
          <button className="luqi-primary" type="submit">Calculate break-even sales</button>
        </form>
        {pricingError && <p role="alert" className="luqi-business-error">{pricingError}</p>}
        {pricing && <section className="luqi-business-result" aria-label="Selling price result" role="status">
          <h3>{pricing.coversDirectCost ? 'Price covers the entered direct cost' : 'Price does not cover the entered direct cost'}</h3>
          <dl>
            <dt>Gross profit per sale</dt><dd>R {pricing.grossProfitPerSaleZar}</dd>
            <dt>Gross margin</dt><dd>{pricing.marginPercent === null ? 'Not positive' : pricing.marginPercent + '%'}</dd>
            <dt>Sales needed to cover fixed costs</dt>
            <dd>{pricing.breakEvenSales === null ? 'Not achievable at this price' : pricing.breakEvenSales}</dd>
          </dl>
          <p className="luqi-business-result-note">This is an arithmetic estimate from your figures, not a sales forecast. Taxes, transaction fees, returns and unentered costs are excluded.</p>
        </section>}
        <p className="luqi-business-note">Need another tool? <Link to="/content-studio">Create a local storyboard</Link> or <Link to="/omega-tasks">check an Omega budget</Link>. <Link to="/pricing">See what is actually available</Link>.</p>
      </section>
    </div>
    <SalesBoard suggestedQuote={quote ? { alias: quote.customerName, amountZar: quote.subtotalZar } : null} />
  </main>;
}
