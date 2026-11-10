import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Compass, FlaskConical, Globe2, GraduationCap, Layers3, ShieldCheck } from 'lucide-react';
import HeroAiChatConsole from './HeroAiChatConsole';
const AfricanBiblicalStudy = lazy(() => import('./AfricanBiblicalStudy'));
/** Deferred below-hero information. The headline, search and Moon load independently. */
export default function HomeHistorySections() {
 const [historyOpen, setHistoryOpen] = useState(false);
 return <>
        <section className="luqi-history-showcase" aria-labelledby="luqi-history-title">
          <div className="luqi-history-banner">
            <div className="luqi-history-intro">
              <p className="luqi-history-eyebrow"><BookOpen size={17} aria-hidden="true" /> AFRICAN HISTORY · EVIDENCE · EXPLORATION</p>
              <h2 id="luqi-history-title">African Peoples and Historical Evidence in Biblical Narratives</h2>
              <p>Explore named African peoples, individuals, ancient places and manuscript traditions. Compare texts and historical interpretations with actual evidence.</p>
              <div className="luqi-history-actions">
                <button type="button" onClick={() => setHistoryOpen(value => !value)}
                  aria-expanded={historyOpen} aria-controls="luqi-home-study">
                  {historyOpen ? "Close the study" : "Explore the topics"} <ArrowRight size={17} aria-hidden="true" />
                </button>
                <Link to="/comparative-evidence">Research &amp; sources <ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
            </div>
            <div className="luqi-history-figures" aria-label="Named figures in ancient sources; symbols are decorative, not historical portraits">
              {[
                ["Ebed-Melech", "Jeremiah 38–39"],
                ["Zipporah", "Numbers 12"],
                ["Tirhakah", "2 Kings 19"],
                ["Ethiopian official", "Acts 8"],
              ].map(([name, reference]) => <div className="luqi-history-figure" key={name}>
                <span className="luqi-history-figure-icon" aria-hidden="true"><BookOpen size={19} /></span>
                <strong>{name}</strong><small>{reference}</small>
              </div>)}
            </div>
          </div>
          <div className="luqi-history-tiles">
            <Link to="/comparative-evidence"><BookOpen size={23} aria-hidden="true" /><span><strong>Read the source</strong><small>Texts, provenance and scholarly context</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link to="/comparative-evidence"><Globe2 size={23} aria-hidden="true" /><span><strong>Peoples &amp; places</strong><small>What the evidence can and cannot establish</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link to="/space-science"><FlaskConical size={23} aria-hidden="true" /><span><strong>Explore knowledge</strong><small>Science, astronomy and learning</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <p className="luqi-history-caution">Illustrations are symbolic, not authentic portraits or proof of historical claims. Interpretations may be disputed; check original sources.</p>
          {historyOpen && <div id="luqi-home-study"><Suspense fallback={<p role="status">Opening the source-linked study…</p>}><AfricanBiblicalStudy /></Suspense></div>}
        </section>
        <nav className="luqi-quick-tools" aria-label="Quick access to Luqi's working tools">
          <div className="luqi-quick-tools-intro"><h2>Explore Luqi’s tools</h2><p>Useful starting points.</p></div>
          <Link to="/drive"><Compass size={21} aria-hidden="true" /><span>Luqi-Drive GPS</span></Link>
          <Link to="/driver-rights"><ShieldCheck size={21} aria-hidden="true" /><span>Driver rights</span></Link>
          <Link to="/study-desk"><GraduationCap size={21} aria-hidden="true" /><span>Education</span></Link>
          <Link to="/tenders"><BriefcaseBusiness size={21} aria-hidden="true" /><span>Small tenders</span></Link>
          <Link to="/near-me"><Compass size={21} aria-hidden="true" /><span>Near me</span></Link>
          <Link to="/comparative-evidence"><BookOpen size={21} aria-hidden="true" /><span>African history</span></Link>
          <Link to="/content-studio"><Layers3 size={21} aria-hidden="true" /><span>Studio</span></Link>
          <a href="#tools" onClick={event => {
            event.preventDefault(); document.getElementById("tools")?.scrollIntoView();
            document.getElementById("tools-heading")?.focus();
          }}><ArrowRight size={21} aria-hidden="true" /><span>All tools</span></a>
        </nav>
        <aside className="luqi-guest-guide" aria-label="Guest trial and country guide"><HeroAiChatConsole /></aside>

 </>;
}
