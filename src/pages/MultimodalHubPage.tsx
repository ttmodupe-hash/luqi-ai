import { Link } from 'react-router';

/** Reviewed entrypoint; unverified provider/science components are not mounted. */
export function MultimodalHubPage() {
  return <main className="luqi-info">
    <p className="luqi-eyebrow">VISUAL LEARNING AND MEDIA</p>
    <h1>Advanced learning &amp; media</h1>
    <p>Start with the working local tools. Research data, voice, browsing and generative media need separate integration and evaluation.</p>
    <section><h2>Create and explore now</h2><p>The content studio combines a small-angle pendulum model, a perspective 3D camera, a time axis and an editable six-scene story. Export original silent motion graphics, subtitles and a script locally.</p><Link className="luqi-primary" to="/content-studio">Open the content studio</Link></section>
    <section><h2>Try hands-on physics</h2><p>Change the simulation, predict the result and compare it with what you observe. These are learning models, with their assumptions shown.</p><Link to="/pendulum-lab">Open the physics lab</Link></section>
    <section><h2>Research and live media remain in development</h2><p>Verified protein datasets, AlphaFold confidence values, grounded web research, live voice and AI-generated images/video are not available through this page. No provider request or private account data is loaded here. Synthetic molecular coordinates must not be presented as verified research results.</p></section>
    <section><h2>A separate text trial</h2><p>The signed-in text trial has its own availability check, provider-processing acknowledgement and spending limits. It does not browse or generate media.</p><Link to="/ai-trial">Check text trial availability</Link></section>
  </main>;
}
