import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, Calculator, Compass, ExternalLink,
  Globe2, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
import { calculateScenario, type Scenario } from '../lib/trade-scenario';

/**
 * The former "live" radar returned invented deadlines, viewer counts, NDVI,
 * border times, and tariff concessions. This page only provides local maths
 * and clearly marked links to sources that the visitor must verify.
 */
export default function AfricanOpportunityRadarPage() {
  const [declaredUsd, setDeclaredUsd] = useState('');
  const [standardRate, setStandardRate] = useState('');
  const [comparisonRate, setComparisonRate] = useState('');
  const [result, setResult] = useState<Scenario | null>(null);
  const [error, setError] = useState('');

  function edit(set: (value: string) => void, value: string) {
    set(value); setResult(null); setError('');
  }
  function compute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setResult(null); setError('');
    try {
      setResult(calculateScenario({
        declaredUsd: declaredUsd.trim(), standardRate: standardRate.trim(),
        comparisonRate: comparisonRate.trim(),
      }));
    } catch {
      setError('Enter a positive USD value up to 99,999,999.99 and two independently checked or hypothetical duty rates from 0 to 100%, using no more than two decimal places.');
    }
  }

  const sources = [
    { name: 'AfCFTA e-Tariff Book', owner: 'African Union',
      url: 'https://etariff.au-afcfta.org',
      detail: 'Check the importing country, HS product code, current concessions and applicable Rules of Origin.' },
    { name: 'South Africa’s AfCFTA guidance', owner: 'the dtic',
      url: 'https://www.thedtic.gov.za/sectors-and-services-2/1-4-2-trade-and-export/afcfta-2/',
      detail: 'Understand country-specific processes. Rates and origin eligibility must be verified with the customs authority.' },
    { name: 'TIA official open calls', owner: 'Technology Innovation Agency',
      url: 'https://www.tia.org.za/category/open-calls/',
      detail: 'Check current programme deadlines and eligibility yourself; LUQI has not verified any open award.' },
    { name: 'Digital Earth Africa datasets', owner: 'Digital Earth Africa',
      url: 'https://digitalearthafrica.org/en_za/dea-platforms/',
      detail: 'Explore real Earth-observation platforms; LUQI does not currently analyse satellite imagery.' },
  ];

  return <main className="min-h-screen bg-slate-950 text-slate-100" aria-labelledby="africa-radar-title">
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="rounded-3xl border border-emerald-700/40 bg-linear-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 sm:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-emerald-300">
          <Compass className="h-5 w-5" aria-hidden="true" /> AFRICA-FIRST RESEARCH
        </p>
        <h1 id="africa-radar-title" className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
          African Opportunity Radar
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200">
          Explore African opportunities with a transparent trade scenario calculator and original information sources.
          LUQI is not currently connected to a verified live grant feed, customs tariff API, satellite forecast,
          settlement rail, or autonomous funding-application agent.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-200">
          <span className="rounded-full border border-slate-500/60 px-3 py-2">Free to try</span>
          <span className="rounded-full border border-slate-500/60 px-3 py-2">No AI credits or sign-in</span>
          <span className="rounded-full border border-slate-500/60 px-3 py-2">Inputs stay in this tab</span>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="trade-heading" className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900/75 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-amber-300" aria-hidden="true" />
            <h2 id="trade-heading" className="text-xl font-semibold">AfCFTA duty scenario planner</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Compare two <strong>rates you supply</strong> on the same cargo value. This is a
            local mathematical comparison, not an official tariff lookup or confirmation of
            eligibility under AfCFTA. No rates are assumed for you.
          </p>
          <form onSubmit={compute} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium" htmlFor="trade-amount">
              Declared cargo value (USD)
              <input id="trade-amount" type="text" inputMode="decimal" required
                maxLength={11} autoComplete="off" value={declaredUsd}
                onChange={event => edit(setDeclaredUsd, event.target.value)}
                placeholder="e.g. 65000.00"
                className="min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-base text-white" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium" htmlFor="trade-standard">
                Assumed standard duty (%)
                <input id="trade-standard" type="text" inputMode="decimal" required
                  autoComplete="off" maxLength={6} value={standardRate}
                  onChange={event => edit(setStandardRate, event.target.value)}
                  placeholder="Enter your rate"
                  className="min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-base text-white" />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="trade-comparison">
                Assumed comparison duty (%)
                <input id="trade-comparison" type="text" inputMode="decimal" required
                  autoComplete="off" maxLength={6} value={comparisonRate}
                  onChange={event => edit(setComparisonRate, event.target.value)}
                  placeholder="Enter your rate"
                  className="min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-base text-white" />
              </label>
            </div>
            <button className="min-h-12 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
              Calculate illustrative duties
            </button>
          </form>
          {error && <p role="alert" className="mt-4 rounded-lg border border-amber-500 bg-amber-950/40 p-4 text-sm text-amber-100">{error}</p>}
          {result && <section role="status" aria-label="Illustrative duty comparison"
            className="mt-6 space-y-4 rounded-xl border border-emerald-500/40 bg-slate-950 p-5">
            <h3 className="text-lg font-semibold">Hypothetical comparison — not verified customs duties</h3>
            <p className="text-sm text-slate-300">Your cargo value: USD {result.declaredUsd}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-400">Duty at {result.standardRate}%</dt>
                <dd className="mt-1 text-xl font-bold">USD {result.standardDutyUsd}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Duty at {result.comparisonRate}%</dt>
                <dd className="mt-1 text-xl font-bold">USD {result.comparisonDutyUsd}</dd>
              </div>
            </dl>
            <p className="rounded-lg bg-slate-900 p-4 font-semibold text-emerald-200">
              {result.direction === 'lower' ? 'Illustrative reduction: USD ' :
               result.direction === 'higher' ? 'Illustrative additional duty: USD ' :
               'No difference: USD '}{result.differenceUsd}
            </p>
            <p className="text-xs text-slate-400">
              Excludes VAT, excise, customs valuation adjustments, freight, brokerage, FX,
              border charges and the requirements for preferential trade. No route,
              clearance time, settlement confirmation or real savings are implied.
            </p>
          </section>}
        </section>

        <section aria-labelledby="sources-heading" className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900/75 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <Globe2 className="h-6 w-6 text-sky-300" aria-hidden="true" />
            <h2 id="sources-heading" className="text-xl font-semibold">Start with verified authorities</h2>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            These links lead outside LUQI. They are reference destinations, not live integrations.
            Check each organisation’s latest requirements before relying on them.
          </p>
          <ul className="mt-5 grid gap-3">
            {sources.map(source => <li key={source.url} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-300">{source.owner}</p>
              <a href={source.url} target="_blank" rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 font-semibold text-sky-200 underline underline-offset-4 hover:text-white">
                {source.name} <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">{source.detail}</p>
            </li>)}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <TrendingUp className="h-6 w-6 text-emerald-300" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Funding and grants</h2>
          <p className="mt-2 text-sm text-slate-300">No live award amounts, grant matches, open deadlines or application success rates are verified by LUQI.</p>
        </section>
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <Sprout className="h-6 w-6 text-emerald-300" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Agriculture and satellites</h2>
          <p className="mt-2 text-sm text-slate-300">No actual NDVI imagery, crop yields, soil moisture or drought predictions are calculated here.</p>
        </section>
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
          <ShieldCheck className="h-6 w-6 text-emerald-300" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">You stay in control</h2>
          <p className="mt-2 text-sm text-slate-300">No customs filing, payment settlement, funding application or autonomous self-healing action is launched from this page.</p>
        </section>
      </div>

      <section className="flex flex-col gap-5 rounded-xl border border-slate-700 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BookOpen className="h-6 w-6 shrink-0 text-sky-300" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Try LUQI’s working tools</h2>
            <p className="mt-1 text-sm text-slate-300">Prepare a quotation or practise study topics without model credits.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link to="/business-desk" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950">
            Business desk <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/study-desk" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-500 px-4 py-2 text-slate-100">
            Study desk
          </Link>
        </div>
      </section>
    </div>
  </main>;
}
