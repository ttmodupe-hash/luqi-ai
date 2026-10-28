import { useState } from 'react';
import { Link } from 'react-router';
import {
  RIGHTS_INFORMATION, RIGHTS_LANGUAGES, RIGHTS_RECHECK_AFTER, RIGHTS_REVIEWED_ON,
  RIGHTS_SOURCES, RIGHTS_TOPICS, legalInformationIsCurrent, rightsLanguageHasSourceLinkedText,
  rightsSourcesFor, type RightsTopic,
} from '../lib/rights-source-guide';

/**
 * Source-linked public legal information. No user claims/forms are collected.
 * No account, provider, browser microphone, storage or submission integration.
 */
export default function RightsGuidePage() {
  const [topic, setTopic] = useState<RightsTopic>('starting');
  const [language, setLanguage] = useState('en');
  const current = legalInformationIsCurrent();
  const englishTextAvailable = rightsLanguageHasSourceLinkedText(language);
  const languageLabel = RIGHTS_LANGUAGES.find(item => item.code === language)?.name ?? 'Selected language';
  const october9 = RIGHTS_SOURCES.find(source => source.id === 'government-withdrawal');
  const october11 = RIGHTS_SOURCES.find(source => source.id === 'government-transition');

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-slate-100" aria-labelledby="rights-guide-title">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">Free public information · South Africa</p>
        <h1 id="rights-guide-title" className="text-3xl font-bold sm:text-4xl">Understand your rights and the asylum process</h1>
        <p className="max-w-3xl text-slate-200">
          Explore source-linked general information and find qualified help. This page does not assess eligibility,
          submit an asylum application, calculate appeal deadlines or replace a legal professional.
        </p>
        <p className="text-sm">Looking for traffic stops instead? <Link to="/driver-rights"
          className="text-cyan-300 underline underline-offset-2">Open Luqi's free South African driver rights guide</Link>.</p>
      </header>

      <section className="space-y-2 rounded-xl border border-amber-500/60 bg-amber-950/30 p-4" aria-label="Important legal information notice">
        <h2 className="text-lg font-semibold">Important: LUQI can make mistakes</h2>
        <p className="text-sm text-slate-100">
          This is general information, not legal advice or representation. Laws and office procedures can change.
          Check the linked original sources and consult a qualified or authorised legal professional,
          particularly for detention, deportation, a refusal or an appeal deadline.
        </p>
        <p className="text-sm">Never rely on LUQI alone for an urgent deadline or immigration decision.</p>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900/70 p-4" aria-labelledby="language-title">
        <h2 id="language-title" className="text-lg font-semibold">Language and understanding</h2>
        <label htmlFor="rights-language" className="block text-sm">Preferred explanation language</label>
        <select id="rights-language" value={language} onChange={event => setLanguage(event.target.value)}
          className="w-full max-w-lg rounded-lg border border-slate-500 bg-slate-950 px-3 py-3 text-white">
          {RIGHTS_LANGUAGES.map(item => <option value={item.code} key={item.code}>{item.name}</option>)}
        </select>
        <p aria-live="polite" className="text-sm text-cyan-100">
          {englishTextAvailable
            ? 'Showing an English source-linked summary. Independent legal review is still required.'
            : languageLabel + ' legal explanations are not yet independently reviewed. Showing the English source-linked text instead. Do not treat this as a translation.'}
        </p>
        <p className="text-sm text-slate-300">
          Sepitori is an explicit language-review track, not a synonym for Sepedi or Setswana.
          Voice and legal translation are not active on this page. Do not enter identity numbers,
          personal asylum statements, documents or passwords here.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="source-date-title">
        <h2 id="source-date-title" className="text-lg font-semibold">Source review and changes</h2>
        <p className="text-sm text-slate-200">Last manual source check: <strong>{RIGHTS_REVIEWED_ON}</strong>.
          This is not a live government feed or a qualified lawyer's sign-off.</p>
        {!current ? (
          <p role="alert" className="rounded-lg border border-rose-400 bg-rose-950/40 p-4 text-sm">
            Source review expired after {RIGHTS_RECHECK_AFTER}. Detailed summaries are withheld
            until the legal sources are reviewed again. Use the official links below and seek qualified help.
          </p>
        ) : (
          <p role="status" className="rounded-lg border border-slate-600 p-3 text-sm">
            Procedures may change before {RIGHTS_RECHECK_AFTER}. Home Affairs withdrew a prior asylum intake
            directive on 9 October 2026. Government subsequently proposed a new intention-registration system
            by 10 November; LUQI has not verified that system is operating.
            {' '}Read the{' '}
            {october9 && <a className="underline underline-offset-2 text-cyan-200" target="_blank" rel="noopener noreferrer"
              href={october9.url}>official withdrawal notice</a>}
            {' '}and{' '}
            {october11 && <a className="underline underline-offset-2 text-cyan-200" target="_blank" rel="noopener noreferrer"
              href={october11.url}>official October briefing</a>}.
          </p>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="rights-topics">
        <h2 id="rights-topics" className="text-xl font-semibold">Choose a topic</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Asylum information topics">
          {RIGHTS_TOPICS.map(item => (
            <button type="button" key={item.id} aria-pressed={topic === item.id}
              onClick={() => setTopic(item.id)}
              className={'rounded-lg border px-3 py-2 text-sm font-semibold ' +
                (topic === item.id ? 'border-cyan-300 bg-cyan-900 text-white' : 'border-slate-500 bg-slate-800 text-slate-100')}>
              {item.label}
            </button>
          ))}
        </div>
        {current ? (
          <div aria-live="polite" className="grid gap-4">
            {RIGHTS_INFORMATION.filter(item => item.topic === topic).map(item => (
              <article key={item.id} aria-labelledby={"rights-item-" + item.id} className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4">
                <h3 id={"rights-item-" + item.id} className="text-lg font-semibold">{item.title}</h3>
                <p className="leading-relaxed text-slate-200">{item.explanation}</p>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Where this information comes from:</p>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    {rightsSourcesFor(item).map(source => (
                      <li key={source.id}>
                        <a href={source.url} target="_blank" rel="noopener noreferrer"
                          className="break-words text-cyan-300 underline underline-offset-2">{source.publisher}: {source.title}</a>
                        <span className="text-slate-400"> · Checked {source.reviewedOn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-labelledby="adviser-questions">
        <h2 id="adviser-questions" className="text-xl font-semibold">Questions to take to a qualified adviser</h2>
        <p className="text-sm text-slate-200">Use these general questions privately with an authorised legal adviser or appropriate official.
          You do not need to give your story, identification number or case documents to LUQI.</p>
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-100">
          <li>What is the current official application or appointment procedure for my situation?</li>
          <li>Can I request an interpreter in a language I understand?</li>
          <li>How can I check the status and conditions of documents already issued to me?</li>
          <li>If I received a written decision, what is the applicable deadline and where can I obtain urgent legal help?</li>
        </ul>
        <p className="text-xs text-slate-300">These are preparation questions, not filing instructions or a personalised legal checklist.</p>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-500 bg-slate-900 p-4" aria-labelledby="urgent-support">
        <h2 id="urgent-support" className="text-xl font-semibold">Need a qualified person?</h2>
        <p className="text-sm">For detention, a written rejection, a possible deadline or urgent protection,
          contact a qualified legal organisation promptly. UNHCR lists assistance by province;
          LUQI has not verified live appointments or available representation.</p>
        <a href="https://help.unhcr.org/southafrica/topics/legal-assistance/" target="_blank"
          rel="noopener noreferrer" className="inline-block rounded-lg border border-cyan-400 px-4 py-3 font-semibold text-cyan-200">
          Open UNHCR legal-assistance directory
        </a>
      </section>

      <section className="space-y-2" aria-labelledby="original-sources">
        <h2 id="original-sources" className="text-xl font-semibold">Original sources</h2>
        <p className="text-sm text-slate-300">These links are external official or recognised assistance sites.
          The review date records when LUQI's source list was checked; it is not a guarantee the law has not changed.</p>
        <ul className="list-inside list-disc space-y-3">
          {RIGHTS_SOURCES.map(source => (
            <li key={source.id}>
              <a href={source.url} rel="noopener noreferrer" target="_blank" className="text-cyan-300 underline underline-offset-2">
                {source.publisher}: {source.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <footer className="border-t border-slate-700 pt-4 text-sm">
        <p>No claim submission, government account login, live legal consultation, provider AI call, file upload or automatic email is available here.</p>
        <p className="mt-2"><Link to="/start" className="text-cyan-300 underline">Return to the LUQI pilot tools</Link></p>
      </footer>
    </main>
  );
}
