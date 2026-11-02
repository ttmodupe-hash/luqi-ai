import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  MAX_STUDY_CARDS, createDeck, dueCards, exportStudyDeck, importStudyDeck,
  makeCard, planStudy, reviewCard, todayLocal, type StudyCard, type StudyPlan,
} from '../lib/study-desk';
import '../study-desk.css';
import KhoroExamConceptBridge from '../components/KhoroExamConceptBridge';

function saveDeck(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
  const element = document.createElement('a');
  element.href = url;
  element.download = 'luqi-study-deck.json';
  element.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export default function StudyDeskPage() {
  const [title, setTitle] = useState('My study deck');
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [topicCount, setTopicCount] = useState('');
  const [examDate, setExamDate] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [planError, setPlanError] = useState('');
  const epoch = useRef(0);
  useEffect(() => () => { epoch.current++; }, []);
  const today = todayLocal();
  const indices = cards.flatMap((card, i) => card.dueOn === null || card.dueOn <= today ? [i] : []);
  const activeIndex = indices[0] ?? -1;
  const active = cards[activeIndex] ?? null;
  const practiced = cards.filter(card => card.reviews > 0).length;

  function updateDraft() {
    epoch.current++;
    setNotice('');
    setRevealed(false);
  }
  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = makeCard(question, answer);
      if (editing !== null) {
        if (editing < 0 || editing >= cards.length) throw new Error('INVALID_STUDY_DECK');
        setCards(previous => previous.map((card, index) => index === editing ? next : card));
        setNotice('Card updated. Its previous review progress was reset.');
      } else {
        if (cards.length >= MAX_STUDY_CARDS) throw new Error('INVALID_STUDY_DECK');
        setCards(previous => [...previous, next]);
        setNotice('Study card added to the current deck.');
      }
      epoch.current++;
      setEditing(null); setQuestion(''); setAnswer(''); setRevealed(false);
    } catch {
      setNotice('Check the question and answer. Keep each card short and avoid private information.');
    }
  }
  function editCard(index: number) {
    if (!cards[index]) return;
    updateDraft(); setEditing(index);
    setQuestion(cards[index].question); setAnswer(cards[index].answer);
    setNotice('Editing this card will reset its review progress when saved.');
  }
  function deleteCard(index: number) {
    updateDraft();
    setCards(previous => previous.filter((_, i) => i !== index));
    setEditing(null); setQuestion(''); setAnswer('');
    setNotice('Card removed from this tab. Export a new file to keep the change.');
  }
  function mark(remembered: boolean) {
    if (activeIndex < 0 || !revealed) return;
    try {
      const updated = reviewCard(createDeck(title.trim() || 'Untitled deck', cards), activeIndex, remembered, todayLocal());
      setCards(updated.cards);
      setReviewedCount(value => value + 1);
      if (remembered) setRememberedCount(value => value + 1);
      setRevealed(false);
      epoch.current++;
      setNotice(remembered
        ? 'Answer marked remembered. Review is recommended on the next due date.'
        : 'Answer marked for more practice. Review is recommended tomorrow.');
    } catch {
      setNotice('The card could not be updated. Your current answers remain in this tab.');
    }
  }
  function exportFile() {
    try {
      if (!cards.length) throw new Error('EMPTY_STUDY_DECK');
      const json = exportStudyDeck(createDeck(title, cards));
      saveDeck(json);
      setNotice('Deck download prepared. Keep the JSON file safe; it is not encrypted.');
    } catch {
      setNotice('Enter a valid title and at least one card before exporting.');
    }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const started = ++epoch.current;
    setNotice('');
    try {
      if (!file.name.toLowerCase().endsWith('.json') || file.size < 1 || file.size > 64_000)
        throw new Error('INVALID_STUDY_DECK');
      const raw = await file.text();
      if (started !== epoch.current) return;
      const loaded = importStudyDeck(raw);
      setTitle(loaded.title); setCards(loaded.cards);
      setQuestion(''); setAnswer(''); setEditing(null); setRevealed(false);
      setRememberedCount(0); setReviewedCount(0);
      setNotice('Study deck imported into this tab. Nothing was uploaded.');
    } catch {
      if (started === epoch.current) setNotice('The selected file was not a valid bounded LUQI study deck. No current cards were replaced.');
    }
  }
  function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPlan(null); setPlanError('');
    try {
      const topics = /^[0-9]{1,3}$/.test(topicCount) ? Number(topicCount) : NaN;
      setPlan(planStudy(topics, examDate, todayLocal()));
    } catch {
      setPlanError('Enter 1–120 topics and an exam date between tomorrow and 365 days from today.');
    }
  }

  return <main className="luqi-study">
    <header className="luqi-study-heading">
      <p className="luqi-eyebrow">LEARN A LITTLE, OFTEN</p>
      <h1>Study desk</h1>
      <p>Make flashcards from material you already trust, practise what you remember, and plan exam topics. Your own progress is tracked inside this tab, with a downloadable file to continue later.</p>
      <p className="luqi-study-note">Runs locally: no account, uploads, AI calls, provider charges or automatic cloud storage. Answers are user-written and not checked for factual accuracy. Download before leaving if you want to keep your work.</p>
    </header>
    <div className="luqi-study-grid">
      <section className="luqi-study-panel" aria-labelledby="study-build-title">
        <h2 id="study-build-title">Build your own practice deck</h2>
        <label className="luqi-study-field">Deck title
          <input required maxLength={85} value={title}
            onChange={event => { setTitle(event.target.value); updateDraft(); }} />
        </label>
        <p className="luqi-study-note">{cards.length} of {MAX_STUDY_CARDS} cards · {practiced} reviewed at least once</p>
        <form className="luqi-study-form" onSubmit={saveCard}>
          <label className="luqi-study-field">Question
            <textarea required rows={2} maxLength={240} value={question} placeholder="What would you like to remember?"
              onChange={event => { setQuestion(event.target.value); updateDraft(); }} />
          </label>
          <label className="luqi-study-field">Answer
            <textarea required rows={4} maxLength={800} value={answer} placeholder="Write an answer from a source you trust"
              onChange={event => { setAnswer(event.target.value); updateDraft(); }} />
          </label>
          <div className="luqi-study-actions">
            <button className="luqi-primary" type="submit" disabled={editing === null && cards.length >= MAX_STUDY_CARDS}>
              {editing === null ? 'Add study card' : 'Save edited card'}
            </button>
            {editing !== null && <button className="luqi-study-secondary" type="button" onClick={() => {
              setEditing(null); setQuestion(''); setAnswer(''); updateDraft();
            }}>Cancel edit</button>}
          </div>
        </form>
        {cards.length > 0 && <section aria-label="Cards in this study deck">
          <h3>Saved in this tab</h3>
          <ol className="luqi-study-card-list">
            {cards.map((card, index) => <li key={index}>
              <span>{index + 1}. {card.question}</span>
              <small>{card.reviews === 0 ? 'Not reviewed yet' : 'Next due: ' + card.dueOn}</small>
              <div className="luqi-study-actions">
                <button className="luqi-study-secondary" type="button" onClick={() => editCard(index)}>Edit card {index + 1}</button>
                <button className="luqi-study-secondary" type="button" onClick={() => deleteCard(index)}>Remove card {index + 1}</button>
              </div>
            </li>)}
          </ol>
        </section>}
        <div className="luqi-study-file">
          <h3>Keep or reopen your deck</h3>
          <button className="luqi-study-secondary" type="button" disabled={!cards.length}
            onClick={exportFile}>Download deck and progress (JSON)</button>
          <label className="luqi-study-field">Import an existing LUQI deck
            <input type="file" accept=".json,application/json" onChange={event => { void importFile(event); }} />
          </label>
          <p className="luqi-study-note">Your download is plain JSON—not encrypted. Protect any sensitive study material. Import replaces the cards in this tab only after file validation.</p>
        </div>
      </section>
      <div className="luqi-study-side">
        <section className="luqi-study-panel" aria-labelledby="study-review-title">
          <h2 id="study-review-title">Review what you know</h2>
          <p className="luqi-study-note" aria-live="polite">{indices.length} cards ready today · {reviewedCount} answers reviewed this session · {rememberedCount} remembered</p>
          {!active && <p>{cards.length ? 'No cards due for review today. Download your deck and return on the due date.' : 'Add a question and answer to start practising.'}</p>}
          {active && <section className="luqi-study-practice" aria-label="Current flashcard">
            <h3>Question</h3>
            <p>{active.question}</p>
            {!revealed ? <button className="luqi-primary" type="button" onClick={() => setRevealed(true)}>Reveal answer</button> : <>
              <h3>Answer from your deck</h3>
              <p>{active.answer}</p>
              <div className="luqi-study-actions">
                <button className="luqi-study-secondary" type="button" onClick={() => mark(false)}>Need more practice</button>
                <button className="luqi-primary" type="button" onClick={() => mark(true)}>I remembered</button>
              </div>
            </>}
          </section>}
          <p className="luqi-study-note">These are suggested review intervals, not exam scores or proof of mastery. You decide whether you remembered each answer.</p>
        </section>
        <section className="luqi-study-panel" aria-labelledby="study-exam-title">
          <h2 id="study-exam-title">Plan your exam topics</h2>
          <p>Estimate the number of topics to cover each day before a deadline. Enter your own syllabus size and date.</p>
          <form className="luqi-study-form" onSubmit={createPlan}>
            <label className="luqi-study-field">Number of topics
              <input type="number" min="1" max="120" step="1" required value={topicCount}
                onChange={event => { setTopicCount(event.target.value); setPlan(null); setPlanError(''); }} />
            </label>
            <label className="luqi-study-field">Exam date
              <input type="date" min={today} required value={examDate}
                onChange={event => { setExamDate(event.target.value); setPlan(null); setPlanError(''); }} />
            </label>
            <button className="luqi-primary" type="submit">Make a topic plan</button>
          </form>
          {planError && <p className="luqi-study-error" role="alert">{planError}</p>}
          {plan && <section className="luqi-study-plan" aria-label="Study topic plan" role="status">
            <p className="luqi-study-figure">{plan.topicsPerDay} topic(s) per day</p>
            <p>{plan.topics} topics across {plan.daysAvailable} calendar days before {plan.examDate}.</p>
            <p>This is an even arithmetic split. Reserve time for revision and adjust for the difficulty of individual topics.</p>
          </section>}
        </section>
        <KhoroExamConceptBridge />
        <p className="luqi-study-note">Need explanations? <Link to="/ai-trial">The separate AI text trial</Link> may be available after sign-in and consent, subject to strict shared limits. It does not automatically read this study deck.</p>
      </div>
    </div>
    <p className="luqi-study-footer"><Link to="/business-desk">Try Business Desk</Link> · <Link to="/pendulum-lab">Explore physics</Link> · <Link to="/pricing">Plans and availability</Link></p>
    {notice && <p className="luqi-study-notice" role="status" aria-label="Study desk message">{notice}</p>}
  </main>;
}
