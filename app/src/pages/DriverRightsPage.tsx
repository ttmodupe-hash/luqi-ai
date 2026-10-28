import { useState } from 'react';
import { Link } from 'react-router';
import { RIGHTS_LANGUAGES } from '../lib/rights-source-guide';
import {
  DRIVER_FACTS, DRIVER_QUICK, DRIVER_RECHECK_AFTER, DRIVER_REVIEWED_ON,
  DRIVER_SOURCES, DRIVER_TOPICS, driverGuideIsCurrent, driverSourcesFor,
  type DriverMode, type DriverTopic,
} from '../lib/driver-rights';

const modes: DriverMode[] = ['stop', 'bribe', 'search', 'fine', 'arrest'];

/** Public, source-linked roadside information. No location tracking, account, microphone,
 * camera, automatic 10111 dialling, evidence upload, AI call or report submission. */
export default function DriverRightsPage() {
  const [mode, setMode] = useState<DriverMode>('stop');
  const [topic, setTopic] = useState<DriverTopic>('stopping');
  const [language, setLanguage] = useState('en');
  const current = driverGuideIsCurrent();
  const quick = DRIVER_QUICK[mode];
  const languageName = RIGHTS_LANGUAGES.find(item => item.code === language)?.name ?? 'Selected language';

  return <main className="mx-auto max-w-5xl min-w-0 space-y-6 px-3 py-6 text-slate-100 sm:px-5 sm:py-9" aria-labelledby="driver-rights-title">
    <header className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi Rights · South Africa · Free, no account</p>
      <h1 id="driver-rights-title" className="text-3xl font-bold sm:text-4xl">Driver rights and safe traffic stops</h1>
      <p className="max-w-3xl text-slate-200">A quick offline-in-the-browser reading guide for South African motorists, followed by dated legal sources. Luqi cannot see your stop, verify an officer, report a crime or provide a lawyer.</p>
    </header>

    <section className="space-y-3 rounded-xl border border-amber-500/70 bg-slate-900 p-4" aria-label="Immediate safety notice">
      <h2 className="text-lg font-bold">Safety first — do not read or tap while driving</h2>
      <p className="text-sm">Stop safely and lawfully before using Luqi. If you are in immediate danger, seek police assistance at <strong>10111</strong> or a mobile emergency service on <strong>112</strong>. Luqi does not place calls or share your location.</p>
      <p className="text-sm">This guide is general information, not case-specific legal advice. Never confront or physically resist a lawful official because of anything shown here.</p>
    </section>

    <section className="space-y-4 rounded-xl border border-cyan-700 bg-slate-900 p-4 sm:p-6" aria-label="Quick roadside protocol">
      <h2 className="text-xl font-bold">Quick roadside protocol</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Choose your traffic stop situation">
        {modes.map(item => <button key={item} type="button" aria-pressed={mode === item}
          className={'rounded-lg border px-3 py-3 text-left font-semibold ' + (mode === item
            ? 'border-cyan-300 bg-cyan-900 text-white' : 'border-slate-500 bg-slate-800')}
          onClick={() => setMode(item)}>{DRIVER_QUICK[item].label}</button>)}
      </div>
      <div aria-live="polite" className="space-y-3">
        <h3 className="text-lg font-semibold">{quick.title}</h3>
        <ol className="list-inside list-decimal space-y-3 text-base font-semibold leading-relaxed">
          {quick.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
        <p className="text-sm text-slate-200">{quick.detail}</p>
      </div>
      <p className="text-xs text-slate-300">These are brief safety steps, not a substitute for the law or a real emergency service.</p>
    </section>

    <section className="space-y-2 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-label="Language availability">
      <h2 className="text-lg font-semibold">Language choice</h2>
      <label className="block text-sm" htmlFor="driver-language">Preferred explanation language</label>
      <select id="driver-language" value={language} onChange={event => setLanguage(event.target.value)}
        className="w-full max-w-lg rounded-lg border border-slate-500 bg-slate-950 px-3 py-3 text-white">
        {RIGHTS_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
      <p className="text-sm text-slate-200">{language === 'en'
        ? 'English source-linked text is shown. It has not received independent legal sign-off.'
        : languageName + ' legal wording is not independently reviewed. Showing English only; this is not a translation.'}</p>
      <p className="text-xs text-slate-300">No voice capture, automatic translation, audio recording or live translation is enabled. Sepitori is a distinct review track.</p>
    </section>

    <section className="space-y-3" aria-labelledby="driver-legal-review">
      <h2 id="driver-legal-review" className="text-xl font-semibold">What the law says, with exceptions</h2>
      <p className="text-sm">Sources checked <strong>{DRIVER_REVIEWED_ON}</strong>. Scheduled legal-content recheck: <strong>{DRIVER_RECHECK_AFTER}</strong>. This is an editorial check, not a lawyer certification or live feed.</p>
      {!current ? <p role="alert" className="rounded-lg border border-rose-400 bg-rose-950/40 p-4">
        Detailed legal summaries have expired and are hidden until their sources are reviewed again. Basic personal-safety steps and source links remain visible. Seek qualified legal advice for a live dispute.
      </p> : <>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Driver legal information topics">
          {DRIVER_TOPICS.map(item => <button key={item.id} type="button" aria-pressed={topic === item.id}
            className={'rounded-lg border px-3 py-2 text-sm ' + (topic === item.id
              ? 'border-cyan-300 bg-cyan-900 font-semibold' : 'border-slate-500 bg-slate-800')}
            onClick={() => setTopic(item.id)}>{item.label}</button>)}
        </div>
        <div aria-live="polite" className="space-y-4">
          {DRIVER_FACTS.filter(fact => fact.topic === topic).map(fact => <article
            key={fact.id} aria-labelledby={'driver-fact-' + fact.id}
            className="min-w-0 space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4">
            <h3 id={'driver-fact-' + fact.id} className="text-lg font-bold">{fact.title}</h3>
            <p className="text-slate-200 leading-relaxed">{fact.summary}</p>
            <p className="text-xs font-semibold uppercase text-slate-300">Check the original sources</p>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {driverSourcesFor(fact).map(source => <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer"
                  className="break-words text-cyan-300 underline underline-offset-2">
                  {source.publisher}: {source.title}
                </a>
              </li>)}
            </ul>
          </article>)}
        </div>
      </>}
    </section>

    <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-label="Report misconduct safely">
      <h2 className="text-xl font-semibold">Reporting suspicious payment demands</h2>
      <p className="text-sm">Once you are safe, write down what you remember; avoid handling your phone or secretly filming during a confrontation. Luqi does not submit complaints or store your evidence.</p>
      <p className="text-sm"><strong>National Traffic Call Centre:</strong> 0861 400 800 (not toll free). <strong>SAPS service complaints:</strong> 0800 333 177 (not an emergency line). For an immediate police emergency, use 10111.</p>
      <p className="text-sm">Verify current reporting channels through the official <a href="https://www.gov.za/anti-corruption/hotlines"
        target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">government anti-corruption directory</a>
        {' '}or <a href="https://www.saps.gov.za/services/service_complaints_centre.php" target="_blank"
          rel="noopener noreferrer" className="text-cyan-300 underline">SAPS complaints guidance</a>.</p>
    </section>

    <section className="space-y-2" aria-label="Original driver law sources">
      <h2 className="text-xl font-semibold">Original sources</h2>
      <p className="text-sm text-slate-300">Links are to government, responsible authorities and identified public-law compilations. Recheck each source for amendments and local procedure; not all source summaries are themselves legislation.</p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        {DRIVER_SOURCES.map(source => <li key={source.id}>
          <a className="break-words text-cyan-300 underline underline-offset-2" href={source.url}
            target="_blank" rel="noopener noreferrer">{source.publisher}: {source.title}</a>
        </li>)}
      </ul>
    </section>
    <footer className="border-t border-slate-700 pt-4 text-sm">
      <p>No live law-enforcement feed, SOS dispatch, police verification, evidence recording, automatic location sharing, paid AI generation, legal filing or legal representation exists on this page.</p>
      <p className="mt-2"><Link to="/rights-guide" className="text-cyan-300 underline">Other Luqi Rights information</Link>
        {' · '}<Link to="/chat" className="text-cyan-300 underline">Return to Luqi Chat</Link></p>
    </footer>
  </main>;
}
