import { useState } from 'react';
import { Link } from 'react-router';
import { useOptionalCustomerSession } from '../providers/customer-session';
import { ACADEMY_TRACKS, STUDY_CYCLE, type AcademyTrack } from '../features/academy/academy-catalog';
import { cloudCost, courseOutline, generatedPractice, gradePractice, impulse, ipv4, nextReview, photoelectric, risk, safeVideoId, solar, sourceReviewStatus, workEnergy, type TrackId } from '../features/academy/academy-engine';
import { initialTerminal, runAcademyCommand, terminalPrompt } from '../features/academy/academy-terminal';
import '../features/academy/academy.css';

type Attempt = { id: string; track: string; prompt: string; response: string; expected: number; correct: boolean; assisted: boolean; explanation: string; at: string; reviewOn: string };
function downloadData(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Video({ id, title, status }: { id: string; title: string; status: string }) {
  const [allowed, setAllowed] = useState(false);
  return <section className="academy-card"><h3>{title}</h3><p>{status}</p>
    <p>YouTube is external and uses internet/data. Loading a player contacts YouTube; no video or transcript is copied into Luqi.</p>
    <div className="academy-actions"><button type="button" onClick={() => setAllowed(!allowed)}>{allowed ? 'Unload external player' : 'Load YouTube player'}</button>
    <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">Open on YouTube</a></div>
    {allowed && <iframe title={title} src={`https://www.youtube-nocookie.com/embed/${id}`} sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
    <p className="academy-small">Embedding may be blocked by the publisher or deployment policy. Use the original link; video viewing does not certify mastery.</p>
  </section>;
}
function PracticeTerminal({ track }: { track: AcademyTrack }) {
  const [state, setState] = useState(initialTerminal);
  const [command, setCommand] = useState('');
  const [lines, setLines] = useState<string[]>(['LOCAL TEACHING ENVIRONMENT. No shell, cloud call or live network operation. Type help.']);
  return <section className="academy-card"><h3>{track.id === 'python' ? 'Python-output trace console' : 'Local command practice'}</h3>
    <p>{track.boundary}</p><p>Try: <code>{track.terminal.join(' | ')}</code></p>
    <pre className="academy-terminal" aria-label="Local terminal transcript" tabIndex={0}>{lines.join('\n')}</pre>
    <form onSubmit={e => { e.preventDefault(); const result = runAcademyCommand(track.id, state, command); setState(result.state); setLines(old => [...old, `${terminalPrompt(state)} ${command}`, result.output].slice(-80)); setCommand(''); }}>
      <label>Practice command<input value={command} maxLength={300} autoComplete="off" spellCheck={false} onChange={e => setCommand(e.target.value)} /></label>
      <div className="academy-actions"><button type="submit">Run locally</button><button type="button" onClick={() => { setState(initialTerminal()); setLines(['Local fixture reset.']); }}>Reset terminal</button></div>
    </form><p role="status" className="academy-small">{lines.length > 1 ? lines[lines.length - 1] : ''}</p>
  </section>;
}
function CalculatorLab({ track }: { track: TrackId }) {
  const [values, setValues] = useState<Record<string,string>>({ address: '192.168.17.42', prefix: '20', asset: '100000', exposure: '.25', occurrences: '.4', gb: '100', storageRate: '.02', hours: '10', hourlyRate: '.05', mass: '2', initial: '3', final: '5', seconds: '.5', frequency: '8e14', workFunction: '2', load: '.4', backup: '6', depth: '.8', efficiency: '.9', daily: '10', sun: '5.2', pvEfficiency: '.8' });
  const [physics, setPhysics] = useState('work'); const [result, setResult] = useState(''); const [error, setError] = useState('');
  const [text, setText] = useState('My practice note'); const [digest, setDigest] = useState<{ text: string; value: string } | null>(null);
  const numeric = (key: string) => { if (!values[key]?.trim()) throw new Error('Complete every numeric input.'); return Number(values[key]); };
  const field = (key: string, label: string) => <label key={key}>{label}<input value={values[key]} inputMode={key === 'address' ? 'text' : 'decimal'} maxLength={60} onChange={e => { setValues(v => ({ ...v, [key]: e.target.value })); setResult(''); setError(''); }} /></label>;
  const calculate = () => {
    setError(''); setResult('');
    try {
      let output: unknown;
      if (track === 'ccna') output = ipv4(values.address, numeric('prefix'));
      else if (track === 'security') output = risk(numeric('asset'), numeric('exposure'), numeric('occurrences'));
      else if (track === 'aws') output = { illustrativeUSD: cloudCost(numeric('gb'), numeric('storageRate'), numeric('hours'), numeric('hourlyRate')), excludes: 'Requests, transfer, tax, support and other charges. Rates are assumptions, not live prices.' };
      else if (track === 'matric') output = physics === 'work' ? { netWorkJ: workEnergy(numeric('mass'), numeric('initial'), numeric('final')) } : physics === 'impulse' ? impulse(numeric('mass'), numeric('initial'), numeric('final'), numeric('seconds')) : photoelectric(numeric('frequency'), numeric('workFunction'));
      else output = solar(numeric('load'), numeric('backup'), numeric('depth'), numeric('efficiency'), numeric('daily'), numeric('sun'), numeric('pvEfficiency'));
      setResult(JSON.stringify(output, null, 2));
    } catch (e) { setError(e instanceof Error ? e.message : 'Check the input values.'); }
  };
  if (track === 'python') return <section className="academy-card"><h3>Build beyond the teaching console</h3><p>The trace console is not a full Python interpreter. Use the official tutorial and a separately isolated environment for functions, packages and FastAPI. Never enter credentials.</p><Link to="/study-desk">Build a code-prediction flashcard deck</Link></section>;
  return <section className="academy-card"><h3>Change inputs, predict, then verify</h3>
    {track === 'matric' && <label>Physics model<select value={physics} onChange={e => { setPhysics(e.target.value); setResult(''); setError(''); }}><option value="work">Work-energy (joules)</option><option value="impulse">Impulse and average force</option><option value="light">Photoelectric threshold</option></select></label>}
    <form onSubmit={e => { e.preventDefault(); calculate(); }}><div className="academy-fields">
      {track === 'ccna' && [field('address','IPv4 address'),field('prefix','Prefix length /0 to /32')]}
      {track === 'security' && [field('asset','Asset value (ZAR)'),field('exposure','Exposure factor (0 to 1)'),field('occurrences','Expected occurrences per year')]}
      {track === 'aws' && [field('gb','Storage (GB-month)'),field('storageRate','Illustrative USD per GB-month'),field('hours','Compute hours'),field('hourlyRate','Illustrative USD per hour')]}
      {track === 'matric' && physics !== 'light' && [field('mass','Mass (kg)'),field('initial','Initial signed velocity (m/s)'),field('final','Final signed velocity (m/s)')]}
      {track === 'matric' && physics === 'impulse' && field('seconds','Time interval (s)')}
      {track === 'matric' && physics === 'light' && [field('frequency','Frequency (Hz)'),field('workFunction','Work function (eV)')]}
      {track === 'solar' && [field('load','Average essential load (kW)'),field('backup','Backup duration (hours)'),field('depth','Usable battery depth (0.01 to 1)'),field('efficiency','Delivery efficiency (0.01 to 1)'),field('daily','Daily energy (kWh)'),field('sun','Assumed peak sun hours/day'),field('pvEfficiency','Assumed PV performance fraction (0.01 to 1)')]}
    </div><button type="submit">Calculate locally</button></form>
    {error && <p role="alert">{error}</p>}{result && <pre aria-live="polite">{result}</pre>}
    {track === 'solar' && <p>Illustrative energy estimates, not a compliant installation design. Location, season, surge, temperature, ageing, wiring and qualified review matter. No live mains practicals.</p>}
    {track === 'security' && <div><h4>Real SHA-256 demonstration</h4><label>Short non-sensitive practice text<input maxLength={2000} value={text} onChange={e => { setText(e.target.value); setDigest(null); }} /></label>
      <button type="button" onClick={() => { setDigest(null); const captured = text; if (!globalThis.crypto?.subtle) { setDigest({text: captured, value: 'WebCrypto unavailable in this browser/context.'}); return; } void crypto.subtle.digest('SHA-256',new TextEncoder().encode(captured)).then(buffer => setDigest({text: captured, value: Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2,'0')).join('')})).catch(() => setDigest({text: captured, value: 'Hash calculation unavailable.'})); }}>Hash locally</button>
      <output className="academy-hash">{digest?.text === text ? digest.value : ''}</output><p>A digest detects differences against a trusted reference. It does not encrypt the text or authenticate its author.</p></div>}
  </section>;
}
function PracticePanel({ track, onAttempt }: { track: TrackId; onAttempt: (attempt: Attempt) => void }) {
  const [seed, setSeed] = useState(1); const question = generatedPractice(track, seed);
  const [response, setResponse] = useState(''); const [feedback, setFeedback] = useState(''); const [recorded, setRecorded] = useState(false); const [assisted, setAssisted] = useState(false);
  return <section className="academy-card"><h3>Reproducible practice, not exam dumps</h3><p>One parameterized starter family per track. This is not a full mock exam or an issuer pass prediction. Numeric answers allow 0.1% rounding tolerance.</p>
    <p className="academy-question">{question.prompt}</p><label>Your answer ({question.unit})<input value={response} maxLength={100} onChange={e => { setResponse(e.target.value); }} /></label>
    <div className="academy-actions"><button type="button" disabled={recorded || !response.trim()} onClick={() => { const correct = gradePractice(question,response); const at = new Date().toISOString(); setFeedback(`${correct ? 'Correct for this activity.' : 'Not yet. Compare your reasoning with the worked answer.'} ${question.explanation}`); setRecorded(true); onAttempt({id:question.id,track,prompt:question.prompt,response,expected:question.answer,correct,assisted,explanation:question.explanation,at,reviewOn:nextReview(at,0,correct)}); }}>Check and record attempt</button>
      <button type="button" onClick={() => { setAssisted(true); setFeedback(`Worked answer: ${question.answer} ${question.unit}. ${question.explanation} Viewing an answer does not record a successful attempt.`); }}>Show worked answer</button>
      <button type="button" onClick={() => { setSeed(s => s + 1); setResponse(''); setFeedback(''); setRecorded(false); setAssisted(false); }}>New variation</button></div>
    <p role="status">{feedback}</p><p className="academy-small">Exercise seed: {seed}. Record your explanation as well as the numeric result.</p>
  </section>;
}
function CourseBuilder() {
  const [subject,setSubject] = useState(''); const [goal,setGoal] = useState(''); const [topics,setTopics] = useState(''); const [minutes,setMinutes] = useState('90'); const [url,setUrl] = useState('');
  const [outline,setOutline] = useState<ReturnType<typeof courseOutline> | null>(null); const [error,setError] = useState('');
  const videoId = safeVideoId(url);
  return <section className="academy-card"><h2>Build any custom course</h2><p>Create an editable, local learning plan from your own subject, outcome and topic list. This does not scrape a video, ingest its transcript, verify its content or call paid AI. Do not paste confidential material.</p>
    <form onSubmit={e => { e.preventDefault(); try { setOutline(courseOutline(subject,goal,topics,Number(minutes))); setError(''); } catch(e) { setError(e instanceof Error ? e.message : 'Check your course inputs.'); } }}>
      <label>Subject<input value={subject} maxLength={120} onChange={e=>setSubject(e.target.value)} required /></label>
      <label>What should the learner be able to demonstrate?<textarea value={goal} maxLength={600} onChange={e=>setGoal(e.target.value)} required /></label>
      <label>Topics, one per line (1-20)<textarea value={topics} maxLength={4000} onChange={e=>setTopics(e.target.value)} required /></label>
      <label>Study minutes per week<input type="number" min={15} max={1800} value={minutes} onChange={e=>setMinutes(e.target.value)} required /></label><button type="submit">Build local course outline</button>
    </form>{error && <p role="alert">{error}</p>}
    {outline && <div><h3>{outline.subject}</h3><p>{outline.status}. Outcome: {outline.goal}</p>{outline.modules.map(m=><details key={m.week}><summary>Module {m.week}: {m.title}</summary><ol>{m.steps.map(step=><li key={step}>{step}</li>)}</ol></details>)}<button type="button" onClick={()=>downloadData('luqi-custom-course.json',outline)}>Download course plan</button></div>}
    <label>Optional YouTube watch/share URL<input type="url" maxLength={1000} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
    {url && !videoId && <p role="status">Use a valid HTTPS YouTube watch URL or youtu.be share URL. No link has been fetched.</p>}
    {videoId && <Video key={videoId} id={videoId} title="Your selected course video" status="Unverified learner-selected resource. Confirm the creator, topic, date and rights before relying on it." />}
  </section>;
}
function AcademyWorkspace() {
  const [trackId,setTrackId] = useState<TrackId>('ccna'); const [lessonId,setLessonId] = useState(0); const [tab,setTab] = useState('learn');
  const [mode,setMode] = useState('direct'); const [language,setLanguage] = useState('English'); const [attempts,setAttempts] = useState<Attempt[]>([]); const [reflection,setReflection] = useState('');
  const track = ACADEMY_TRACKS.find(t=>t.id===trackId)!; const lesson = track.lessons[lessonId] || track.lessons[0];
  const prompt = `Help me study ${track.title}, topic: ${lesson.title}. Mode: ${mode}. Preferred explanation language: ${language}. Explain technical terms accurately; acknowledge translation uncertainty. Use a worked example, a safe practical task and a check of understanding. Answer directly when requested. Do not claim that I am certified. Check current official sources where needed.`;
  return <div className="academy-root">
    <header className="academy-hero"><p className="academy-kicker">KHORO LEARNING / TOOLS 02 + 017</p><h1>Universal Academy</h1><p>Learn it. Test it. Build something that matters.</p><p>Six expandable tracks, local practicals and custom study plans. Original starter lessons and curriculum maps; not complete accredited courses.</p>
      <div className="academy-actions"><Link to="/cert-academy/legacy">Existing Cisco / ITIL advanced practice</Link><Link to="/study-desk">Flashcard study desk</Link><Link to="/chat">Ask Luqi</Link></div></header>
    <nav className="academy-tracks" aria-label="Academy tracks">{ACADEMY_TRACKS.map(t=><button key={t.id} type="button" aria-pressed={t.id===trackId} onClick={()=>{setTrackId(t.id);setLessonId(0);setTab('learn');}}>{t.title}</button>)}</nav>
    <section className="academy-card"><h2>{track.title} <span className="academy-tag">{track.version}</span></h2><p>{track.versionNote}</p><details><summary>Curriculum map and scope</summary><ul>{track.domains.map(d=><li key={d}>{d}</li>)}</ul><p>Initial guided coverage: {track.lessons.length} activities. An outline or video list does not establish full exam coverage.</p></details></section>
    <nav className="academy-actions" aria-label="Learning activities">{[['learn','Understand'],['lab','Hands-on lab'],['practice','Practice and feedback'],['study','Study method and notebook'],['custom','Build custom course']].map(([id,label])=><button key={id} type="button" aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {tab==='learn' && <div className="academy-two"><section className="academy-card"><label>Guided activity<select value={lessonId} onChange={e=>setLessonId(Number(e.target.value))}>{track.lessons.map((l,i)=><option key={l.id} value={i}>{l.title}</option>)}</select></label><h3>{lesson.title}</h3><p>{lesson.explain}</p><h4>Worked example</h4><pre>{lesson.example}</pre><h4>Everyday analogy</h4><p>{lesson.analogy}</p><h4>Common mistake</h4><p>{lesson.misconception}</p><h4>Try it yourself</h4><ol>{lesson.practice.map(p=><li key={p}>{p}</li>)}</ol><p><strong>Evidence to keep:</strong> {lesson.evidence}</p><button type="button" onClick={()=>setTab('lab')}>Open this track's lab</button></section>
      <aside><section className="academy-card"><h3>Original sources and review dates</h3>{track.sources.map(source=><div key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p className="academy-small">{sourceReviewStatus(source.reviewedOn)} / {source.reviewedOn || 'Not independently verified'}<br/>{source.note}</p></div>)}<p>Review dates are not continuous freshness guarantees. Sources older than 30 days are flagged for review, not silently replaced.</p></section>{track.video && <Video key={track.video.id} {...track.video} />}</aside></div>}
    {tab==='lab' && <div key={track.id}><CalculatorLab track={track.id}/>{['ccna','security','aws','python'].includes(track.id)&&<PracticeTerminal track={track}/>}<section className="academy-card"><h3>Practical project</h3><p>{track.capstone}</p><p>{track.boundary}</p><p>Show a prediction, a result, an explanation and a limitation. Completion is not professional accreditation.</p>{track.id==='solar'&&<div className="academy-actions"><Link to="/driver-rights">Separate driver guidance</Link><Link to="/business-desk">Business quotation desk</Link></div>}</section></div>}
    {tab==='practice'&&<PracticePanel key={track.id} track={track.id} onAttempt={a=>setAttempts(old=>[...old,a].slice(-500))}/>}
    {tab==='study'&&<div className="academy-two"><section className="academy-card"><h2>Reflect-and-practise study cycle</h2><p>An optional modern approach inspired by Chinese self-cultivation, reflection and disciplined practice, combined with Ubuntu peer learning. It is not a claim that all Chinese education follows one method. No shaming, compulsory belief or exam-pressure scoring.</p><ol>{STUDY_CYCLE.map(s=><li key={s.title}><strong>{s.title}:</strong> {s.detail}</li>)}</ol>
      <label>Teaching preference<select value={mode} onChange={e=>setMode(e.target.value)}><option value="direct">Direct answer</option><option value="guided">Guided learning</option><option value="socratic">Socratic coaching</option><option value="project">Practical project</option><option value="exam">Exam preparation</option></select></label>
      <label>Language for your next tutor request<select value={language} onChange={e=>setLanguage(e.target.value)}>{['English','Sepitori','Setswana','isiZulu','Sesotho','isiXhosa','Afrikaans'].map(l=><option key={l}>{l}</option>)}</select></label><p>These choices prepare a request; they do not claim the English lesson has already been translated or that translation quality is verified.</p>
      <label>Prepared tutor request (copy only what you choose)<textarea readOnly value={prompt}/></label><Link to="/chat">Open Chat and paste your reviewed request</Link><p>No request, private notebook or provider call is sent automatically. Chat retains its existing sign-in, consent and budget checks.</p></section>
      <section className="academy-card"><h2>Mistake notebook and reflection</h2><label>What did you misunderstand, and what changed?<textarea maxLength={4000} value={reflection} onChange={e=>setReflection(e.target.value)}/></label><p>{attempts.length} attempts recorded in this workspace. Initial suggested revisit: tomorrow; further spacing should follow your demonstrated progress. Dates are study suggestions, not scheduled notifications.</p>
      {attempts.slice(-10).reverse().map((a,i)=><details key={`${a.at}-${i}`}><summary>{a.track}: {a.correct?'Correct activity':'Revisit mistake'} / {new Date(a.at).toLocaleDateString()}</summary><p>{a.prompt}</p><p>Your response: {a.response}. Expected: {a.expected}. {a.assisted ? 'Worked answer viewed before submission.' : 'No worked answer viewed before submission.'}</p><p>{a.explanation}</p><p>Revisit: {new Date(a.reviewOn).toLocaleDateString()}</p></details>)}
      <div className="academy-actions"><button type="button" onClick={()=>downloadData('luqi-learning-notebook.json',{schemaVersion:1,exportedAt:new Date().toISOString(),attempts,reflection,warning:'Self-study evidence, not a certificate or official score'})}>Download notebook</button><button type="button" onClick={()=>{if(window.confirm('Clear this workspace notebook? Export it first to keep a copy.')){setAttempts([]);setReflection('');}}}>Clear notebook</button></div></section></div>}
    {tab==='custom'&&<CourseBuilder/>}
    <footer className="academy-card academy-small">No paid AI, cloud resources, live network scanning or arbitrary code execution on this page. Drafts and attempts stay in React memory and clear on page navigation/reload or account change; explicitly download work to retain it. External sources and video require connectivity. Built-in calculations need no network after loading, but this is not a guaranteed offline-install package.</footer>
  </div>;
}
export default function UniversalAcademyPage() {
  const customer = useOptionalCustomerSession();
  // Recreate the entire private workspace on identity changes, not after painting old drafts.
  return <AcademyWorkspace key={customer?.session?.user.email || 'anonymous-academy'}/>;
}
