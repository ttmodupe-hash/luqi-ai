import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import TownshipSourceStatus from './TownshipSourceStatus';
import { createQuote, checkPricing, type QuoteResult, type PricingResult } from '../lib/business-desk';
import { newTownshipProject, readTownshipProject, writeTownshipProject, townshipContextKey,
  TOWNSHIP_PROJECT_MAX_BYTES, type TownshipContext, type TownshipProject, type ContextReview } from '../lib/township-workspace';

const field = 'mt-2 block min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
const button = 'min-h-11 rounded-lg border border-cyan-500 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';
const panel = 'scroll-mt-24 min-w-0 space-y-4 rounded-xl border border-slate-700 bg-slate-950 p-4 sm:p-5';
function jumpTo(id: string) {
  const target = document.getElementById(id);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'start' });
}
function download(value: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
interface Props {
  context: TownshipContext;
  steps: readonly string[];
  reviewContext: ContextReview;
  onRestoreContext: (context: TownshipContext) => void;
}
export default function TownshipBusinessWorkspace({ context, steps, reviewContext, onRestoreContext }: Props) {
  const key = townshipContextKey(context);
  const [projects, setProjects] = useState<Record<string, TownshipProject>>({});
  const project = projects[key] || newTownshipProject(context);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [pricingError, setPricingError] = useState('');
  const [notice, setNotice] = useState('');
  const [fileError, setFileError] = useState('');
  const [pending, setPending] = useState<TownshipProject | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const epoch = useRef(0);
  const activeKey = useRef(key);
  activeKey.current = key;
  useEffect(() => {
    epoch.current++;
    setPending(null); setQuote(null); setPricing(null); setQuoteError(''); setPricingError(''); setNotice(''); setFileError('');
  }, [key]);
  useEffect(() => () => { epoch.current++; }, []);
  const dirty = Object.entries(projects).some(([id, value]) => saved[id] !== JSON.stringify(value));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(update: Partial<TownshipProject>) {
    epoch.current++;
    setPending(null); setNotice(''); setFileError('');
    if ('businessName' in update || 'customerName' in update || 'reference' in update || 'items' in update) { setQuote(null); setQuoteError(''); }
    if ('pricing' in update) { setPricing(null); setPricingError(''); }
    setProjects(previous => ({ ...previous, [key]: { ...(previous[key] || newTownshipProject(context)), ...update } }));
  }
  function updateItem(index: number, name: 'description' | 'quantity' | 'price', value: string) {
    change({ items: project.items.map((item, at) => at === index ? { ...item, [name]: value } : item) });
  }
  function save() {
    try {
      const raw = writeTownshipProject(project, reviewContext);
      download(raw, 'luqi-township-workspace.json', 'application/json;charset=utf-8');
      setSaved(previous => ({ ...previous, [key]: JSON.stringify(project) }));
      setNotice('Project download requested. Keep the JSON file to restore these inputs and preparation ticks. Check that your browser saved it.');
      setFileError('');
    } catch { setFileError('This project could not be exported. Check the selected business context and remove unsupported control characters; your entries are still here.'); }
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    const attempt = ++epoch.current, startingKey = key;
    setPending(null); setFileError(''); setNotice('');
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.json') || file.size < 1 || file.size > TOWNSHIP_PROJECT_MAX_BYTES) throw new Error('INVALID_FILE');
      const raw = await file.text();
      if (epoch.current !== attempt || activeKey.current !== startingKey) return;
      const candidate = readTownshipProject(raw, reviewContext);
      if (epoch.current !== attempt || activeKey.current !== startingKey) return;
      setPending(candidate);
    } catch {
      if (epoch.current === attempt && activeKey.current === startingKey)
        setFileError('Not a supported Luqi workspace file (maximum 64 KB), or its saved context no longer matches this guide. Your current work was not replaced.');
    }
  }
  function restore() {
    if (!pending) return;
    // Revalidate at confirmation; files cannot supply source freshness or approvals.
    try {
      const clean = readTownshipProject(JSON.stringify(pending), reviewContext);
      const id = townshipContextKey(clean.context);
      epoch.current++;
      setProjects(previous => ({ ...previous, [id]: clean }));
      setSaved(previous => ({ ...previous, [id]: JSON.stringify(clean) }));
      setPending(null); setQuote(null); setPricing(null); setQuoteError(''); setPricingError('');
      onRestoreContext(clean.context);
      setNotice('Project restored. Calculations must be prepared again; preparation ticks are your record, not issuer approval.');
    } catch { setPending(null); setFileError('The project could not be restored. Your current work is unchanged.'); }
  }
  function prepareQuote() {
    setQuote(null); setQuoteError('');
    try {
      setQuote(createQuote({ businessName: project.businessName, customerName: project.customerName, reference: project.reference,
        rows: project.items.map(item => ({ description: item.description,
          quantity: /^[0-9]{1,4}$/.test(item.quantity) ? Number(item.quantity) : NaN, unitPriceZar: item.price.trim() })) }));
    } catch { setQuoteError('Add your business, customer and reference. Each line needs a description, a whole quantity from 1 to 1,000 and a nonnegative ZAR price with at most two decimals.'); }
  }
  function preparePricing() {
    setPricing(null); setPricingError('');
    try { setPricing(checkPricing({ sellingPriceZar: project.pricing.selling.trim(), directCostZar: project.pricing.direct.trim(), monthlyFixedZar: project.pricing.fixed.trim() })); }
    catch { setPricingError('Enter nonnegative ZAR amounts with at most two decimals. Use fixed costs for the same period as your sales target.'); }
  }
  return <section id="township-workbench" tabIndex={-1} aria-labelledby="township-workspace-heading" className="scroll-mt-24 min-w-0 space-y-5 rounded-2xl border border-cyan-700 bg-slate-900 p-4 sm:p-6">
    <header className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Turn the information into work you can use</p>
      <h2 id="township-workspace-heading" className="text-2xl font-bold">Your business workbench</h2>
      <p className="max-w-3xl text-sm text-slate-200">Prepare your business summary, track your next steps, test a selling price and create a quotation here. The guidance and original sources stay on this page.</p>
      <p className="text-xs text-slate-300">No sign-in or AI credits. Entries stay in this page’s memory; download an editable project before leaving. The file is not encrypted: keep it private and do not include ID numbers, bank details or passwords.</p>
      <TownshipSourceStatus />
      <nav aria-label="Business workbench sections" className="flex flex-wrap gap-3 text-sm text-cyan-200">
        <button type="button" className="min-h-11 underline underline-offset-4" onClick={()=>jumpTo('township-work-plan')}>Prepare</button>
        <button type="button" className="min-h-11 underline underline-offset-4" onClick={()=>jumpTo('township-work-price')}>Check pricing</button>
        <button type="button" className="min-h-11 underline underline-offset-4" onClick={()=>jumpTo('township-work-quote')}>Make a quote</button>
        <button type="button" className="min-h-11 underline underline-offset-4" onClick={()=>jumpTo('township-work-save')}>Save or restore</button>
      </nav>
    </header>
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <section id="township-work-plan" tabIndex={-1} aria-label="Business preparation workspace" className={panel}>
        <h3 className="text-lg font-semibold">1. Prepare your business</h3>
        <label className="block text-sm">Workbench business name<input className={field} maxLength={90} value={project.businessName} onChange={e=>change({businessName:e.target.value})}/></label>
        <label className="block text-sm">What you sell and who you serve<textarea className={field} rows={3} maxLength={1000} value={project.offering} onChange={e=>change({offering:e.target.value})}/></label>
        <p className="text-sm font-medium">{project.completedSteps.length} of {steps.length} preparation steps marked by you</p>
        <p className="text-xs text-slate-400">Your own progress record—not eligibility, a verified document or an application approval. Changing the selections keeps each plan’s work separately in this tab.</p>
        <ol className="space-y-3 text-sm">{steps.map((step, index)=><li key={step}>
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-700 p-3">
            <input type="checkbox" className="mt-1 size-5 shrink-0" checked={project.completedSteps.includes(step)}
              onChange={e=>change({completedSteps:e.target.checked?[...project.completedSteps,step]:project.completedSteps.filter(x=>x!==step)})}/>
            <span className="min-w-0">{index+1}. {step}</span>
          </label>
        </li>)}</ol>
        <label className="block text-sm">My next actions and questions<textarea className={field} rows={4} maxLength={4000} value={project.notes} onChange={e=>change({notes:e.target.value})}/></label>
      </section>
      <div className="min-w-0 space-y-5">
        <section id="township-work-price" tabIndex={-1} aria-label="Workbench pricing calculator" className={panel}>
          <h3 className="text-lg font-semibold">2. Check your selling price</h3>
          <p className="text-sm text-slate-300">Use your own costs. This reuses Luqi Business Desk’s exact-cent calculations; it does not predict demand or funding eligibility.</p>
          <label className="block text-sm">Workbench selling price (ZAR)<input className={field} inputMode="decimal" maxLength={11} value={project.pricing.selling} onChange={e=>change({pricing:{...project.pricing,selling:e.target.value}})}/></label>
          <label className="block text-sm">Workbench direct cost per sale (ZAR)<input className={field} inputMode="decimal" maxLength={11} value={project.pricing.direct} onChange={e=>change({pricing:{...project.pricing,direct:e.target.value}})}/></label>
          <label className="block text-sm">Workbench fixed costs for the period (ZAR)<input className={field} inputMode="decimal" maxLength={11} value={project.pricing.fixed} onChange={e=>change({pricing:{...project.pricing,fixed:e.target.value}})}/></label>
          <button type="button" className={button} onClick={preparePricing}>Calculate my sales target</button>
          {pricingError&&<p role="alert" className="text-sm text-amber-200">{pricingError}</p>}
          {pricing&&<div role="status" aria-label="Workbench pricing result" className="space-y-2 rounded-lg border border-cyan-600 p-3 text-sm">
            <p>Contribution per sale: <strong>R {pricing.grossProfitPerSaleZar}</strong></p>
            <p>Margin: {pricing.marginPercent===null?'No positive margin':pricing.marginPercent+'%'}</p>
            <p>Sales to cover these fixed costs: <strong>{pricing.breakEvenSales??'Not achievable at this price'}</strong></p>
            <p className="text-xs text-slate-300">Excludes taxes, financing, changing costs and uncertain demand. This is a planning calculation, not financial advice or a revenue promise.</p>
          </div>}
        </section>
        <section id="township-work-quote" tabIndex={-1} aria-label="Workbench quotation builder" className={panel}>
          <h3 className="text-lg font-semibold">3. Prepare a client quotation</h3>
          <p className="text-sm text-slate-300">Uses the business name above. A draft quotation is not a tax invoice, receipt or guarantee of payment.</p>
          <label className="block text-sm">Workbench customer name<input className={field} maxLength={90} value={project.customerName} onChange={e=>change({customerName:e.target.value})}/></label>
          <label className="block text-sm">Workbench quote reference<input className={field} maxLength={45} value={project.reference} onChange={e=>change({reference:e.target.value})}/></label>
          {project.items.map((item,index)=><fieldset key={index} className="min-w-0 space-y-3 rounded-lg border border-slate-600 bg-slate-950 p-3">
            <legend className="px-2 text-sm">Quote item {index+1}</legend>
            <label className="block text-sm">Workbench item {index+1} description<input className={field} maxLength={120} value={item.description} onChange={e=>updateItem(index,'description',e.target.value)}/></label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="block text-sm">Workbench item {index+1} quantity<input className={field} inputMode="numeric" maxLength={4} value={item.quantity} onChange={e=>updateItem(index,'quantity',e.target.value)}/></label>
              <label className="block text-sm">Workbench item {index+1} unit price (ZAR)<input className={field} inputMode="decimal" maxLength={11} value={item.price} onChange={e=>updateItem(index,'price',e.target.value)}/></label>
            </div>
            {project.items.length>1&&<button type="button" className={button} onClick={()=>change({items:project.items.filter((_,at)=>at!==index)})}>Remove quote item {index+1}</button>}
          </fieldset>)}
          <div className="flex flex-wrap gap-3">
            <button type="button" className={button+' disabled:opacity-50'} disabled={project.items.length>=12} onClick={()=>change({items:[...project.items,{description:'',quantity:'1',price:''}]})}>Add quote item</button>
            <button type="button" className={button} onClick={prepareQuote}>Prepare my quotation</button>
          </div>
          {quoteError&&<p role="alert" className="text-sm text-amber-200">{quoteError}</p>}
          {quote&&<div role="status" aria-label="Workbench quotation result" className="min-w-0 space-y-3 rounded-lg border border-cyan-600 p-3">
            <p className="text-xl font-semibold">R {quote.subtotalZar} <span className="text-sm font-normal">before taxes</span></p>
            <pre className="whitespace-pre-wrap break-words text-xs">{quote.textDraft}</pre>
            <button type="button" className={button} onClick={()=>download(quote.textDraft,'luqi-township-quotation.txt','text/plain;charset=utf-8')}>Download my quotation</button>
          </div>}
        </section>
      </div>
    </div>
    <section id="township-work-save" tabIndex={-1} aria-label="Save business workspace" className={panel}>
      <h3 className="text-lg font-semibold">4. Keep your work and continue later</h3>
      <p className="text-sm text-slate-300">Save even unfinished inputs. A project holds the selected business context, summary, preparation ticks, notes, quote lines and pricing inputs. It never renews source reviews or grants approvals. Each selected plan is a separate download.</p>
      <div className="flex flex-wrap items-start gap-4">
        <button type="button" className={button} onClick={save}>Save editable business project</button>
        <label className="block min-w-0 max-w-full text-sm">Restore business project (.json)<input type="file" accept=".json,application/json" className={field} onChange={e=>{void chooseFile(e);}}/></label>
      </div>
      {pending&&<div className="space-y-3 rounded-lg border border-amber-500 p-3" aria-label="Confirm workspace restore">
        <p className="break-words text-sm">Restore <strong>{pending.businessName||'Unnamed business'}</strong> — {pending.context.sector}, {pending.context.goal}, {pending.context.municipality||pending.context.province}? This replaces work for that selection only. Download any work you need to keep first.</p>
        <button type="button" className={button} onClick={restore}>Restore this project</button>{' '}
        <button type="button" className={button} onClick={()=>{epoch.current++;setPending(null);}}>Cancel restore</button>
      </div>}
      {fileError&&<p role="alert" className="text-sm text-amber-200">{fileError}</p>}
      {notice&&<p role="status" aria-label="Workspace file result" className="text-sm text-cyan-200">{notice}</p>}
      {dirty&&<p className="text-xs text-amber-200">Work remains in this tab. Save each changed plan before navigating away; there is no automatic account or browser-storage backup.</p>}
    </section>
  </section>;
}
