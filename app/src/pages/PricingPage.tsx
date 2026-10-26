import { Link } from 'react-router';

export default function PricingPage() {
  return <main className="luqi-info"><p className="luqi-eyebrow">MAKE. LEARN. MOVE YOUR IDEA FORWARD.</p>
    <h1>Plans and availability</h1>
    <p>Turn an idea into something you can show, understand or build on. Start with LUQI’s working pilot tools.</p>
    <section><h2>Create a story worth sharing</h2>
      <p>Plan six scenes, explore a 3D animation and export a 90-second silent video from your browser. Download your storyboard, script and captions to keep developing your creation.</p>
      <p>Choose landscape, portrait or square for your next social project. You upload the finished file to your chosen channel.</p>
      <Link className="luqi-primary" to="/content-studio">Open the content studio</Link>
    </section>
    <section><h2>Get help with your next question</h2>
      <p>The separate AI text trial supports short questions after sign-in and acknowledgement of provider processing. It has a shared monthly allowance and a daily account limit; availability can change when limits are reached.</p>
      <p>Use ordinary test questions. Review every reply, especially for consequential decisions. Questions are not automatically drawn from your private notes.</p>
      <Link className="luqi-primary" to="/ai-trial">Check the AI text trial</Link>
    </section>
    <section><h2>Learn by changing something</h2>
      <p>Adjust a pendulum, compare its motion and see how the physics responds. Build understanding through a working experiment in your browser.</p>
      <Link className="luqi-primary" to="/pendulum-lab">Explore the physics lab</Link>
    </section>
    <section><h2>Keep your ideas together</h2>
      <p>Save account-owned notes, return to your conversations and download a copy. The notes workspace stores what you write and is separate from the AI trial.</p>
      <Link className="luqi-primary" to="/companion">Open your private notes</Link>
    </section>
    <section><h2>Prepare for your next customer</h2>
      <p>Use LUQI Business Desk to create a draft ZAR quotation and check your selling price, gross margin and break-even sales. Export a text draft without uploading customer information or using paid AI.</p>
      <p>It is a drafting and arithmetic aid, not an invoicing, tax or payment-collection service.</p>
      <Link className="luqi-primary" to="/business-desk">Open the business desk</Link>
    </section>
    <section><h2>Learn by practising what you remember</h2>
      <p>Make your own flashcards, reveal answers, review again on a suggested date and plan exam topics across the calendar. Export a study deck and re-import it when you return.</p>
      <p>This works only from user-supplied material; it does not certify exam results or automatically save your deck online. Downloaded JSON files are not encrypted.</p>
      <Link className="luqi-primary" to="/study-desk">Open the study desk</Link>
    </section>
    <section><h2>Paid plans</h2>
      <p>AI subscriptions and in-app credit purchases are not available in this pilot. Any one-time assisted service is listed separately with its seller, exact price, delivery and refund details.</p>
      <p>Check the payment page for current availability. Opening it does not charge you or change your AI allowance.</p>
      <Link className="luqi-primary" to="/payments">View payment availability</Link>
      <p>Generated voice and AI video, direct social posting, professional submissions and autonomous Omega workers require further integration. They are not included in an active paid plan.</p>
    </section>
    <p><Link to="/start">Choose your first step</Link> · <Link to="/service-status">Check service status</Link> · <Link to="/contact">Help and feedback</Link></p>
  </main>;
}
