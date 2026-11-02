import { useId, useState } from 'react';
import { BIBLICAL_TITLE, BIBLICAL_EDITION, BIBLICAL_REVIEW_DUE, BIBLICAL_LAYERS,
  BIBLICAL_STUDIES, BIBLICAL_SOURCES, BIBLICAL_QUIZ, biblicalSource,
  biblicalStudyIsCurrent, checkBiblicalAnswer, type BiblicalLayerId } from '../lib/africa-biblical-study.mjs';
import './african-biblical-study.css';

function SourceLinks({ ids }: { ids: readonly string[] }) {
  return <ul className="luqi-africa-sources">{ids.map(id => {
    const source = biblicalSource(id);
    return <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher}: {source.title}</a>
      <span>{source.kind} · {source.scope}</span></li>;
  })}</ul>;
}

/** Static, source-linked local study. Choices are neither stored nor sent to AI. */
export default function AfricanBiblicalStudy({ now = new Date() }: { now?: Date }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(BIBLICAL_STUDIES[0].id);
  const [layer, setLayer] = useState<BiblicalLayerId>('text');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const current = biblicalStudyIsCurrent(now);
  const study = BIBLICAL_STUDIES.find(value => value.id === selected) ?? BIBLICAL_STUDIES[0];
  const panel = study[layer];
  return <section className="luqi-africa-study" aria-labelledby={`${id}-title`}>
    <header>
      <p className="luqi-africa-kicker">AFRICAN HISTORY · READ · EXPLORE · REFLECT</p>
      <h2 id={`${id}-title`}>{BIBLICAL_TITLE}</h2>
      <p>Explore named peoples, courageous individuals and ancient kingdoms through scripture, geography and historical evidence. Follow the sources and form thoughtful questions of your own.</p>
      <p className="luqi-africa-meta">Free study · no account · English edition {BIBLICAL_EDITION}</p>
      <button type="button" aria-expanded={open} aria-controls={`${id}-study`} onClick={() => setOpen(value => !value)}>
        {open ? 'Close African history study' : 'Explore African biblical history'}
      </button>
    </header>
    {open && <div id={`${id}-study`}>
      <p className="luqi-africa-meta">A text, an artifact and an interpretation answer different questions. Compare evidence, not people’s worth.</p>
      {!current && <p role="alert">This edition is due for source review. Summaries and answer exercises are paused; the source library remains available.</p>}
      {current && <>
        <div className="luqi-africa-topic-grid" role="group" aria-label="African biblical study topics">
          {BIBLICAL_STUDIES.map(entry => <button key={entry.id} type="button" aria-pressed={entry.id === selected}
            onClick={() => { setSelected(entry.id); setLayer('text'); }}>{entry.title}</button>)}
        </div>
        <div role="group" aria-label="Study evidence layers" className="luqi-africa-layers">
          {BIBLICAL_LAYERS.map(entry => <button key={entry.id} type="button" aria-pressed={entry.id === layer}
            onClick={() => setLayer(entry.id)}>{entry.label}</button>)}
        </div>
        <article aria-live="polite" aria-atomic="true" className="luqi-africa-reading">
          <p className="luqi-africa-kicker">{study.reference}</p>
          <h3>{study.title}</h3>
          <h4>{BIBLICAL_LAYERS.find(entry => entry.id === layer)?.label}</h4>
          <p>{panel.body}</p>
          {layer === 'reflection' ? <p className="luqi-africa-meta">Luqi-designed activity, not a quoted source or a test of religious belief.</p> : <SourceLinks ids={panel.sourceIds} />}
        </article>
        <details>
          <summary>Try four evidence-reading questions</summary>
          <p>Practise reading sources, not judging faith. Answers stay only in this page’s memory and reset on reload.</p>
          {BIBLICAL_QUIZ.map(question => {
            const chosen = answers[question.id];
            const result = checkBiblicalAnswer(question.id, chosen);
            return <fieldset key={question.id} className="luqi-africa-question">
              <legend>{question.question}</legend>
              {question.options.map((option, index) => <label key={option}>
                <input type="radio" name={`${id}-${question.id}`} checked={chosen === index}
                  onChange={() => setAnswers(value => ({ ...value, [question.id]: index }))} />{option}
              </label>)}
              {result && <div role="status"><p><strong>{result.correct ? 'Supported by the source.' : 'Review the source and try again.'}</strong> {result.explanation}</p>
                <SourceLinks ids={result.sourceIds} /></div>}
            </fieldset>;
          })}
          <button type="button" onClick={() => setAnswers({})}>Reset practice answers</button>
        </details>
      </>}
      <details open={!current}>
        <summary>Source library and editorial notes</summary>
        <p>Adapted from a supplied documentary review with agreed factual corrections, with separately checked passages and institutional records. The supplied Forgotten Bible Stories video was not transcribed; this lesson is not a verified summary of that documentary.</p>
        <p>Scripture links identify their English translation. Editorial notes and named scholarship are interpretation, not the original passage. No generated historical portraits or modern racial ancestry claims are used as evidence.</p>
        <p>Source edition: {BIBLICAL_EDITION}. Review due: {BIBLICAL_REVIEW_DUE}. This is a reading guide, not independent academic certification or live source verification. African-language teaching and narration require separate review.</p>
        <SourceLinks ids={BIBLICAL_SOURCES.map(source => source.id)} />
      </details>
    </div>}
  </section>;
}
