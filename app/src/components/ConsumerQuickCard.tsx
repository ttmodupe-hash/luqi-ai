import { Link } from 'react-router';
import { CONSUMER_QUICK, type DisputeType } from '../lib/consumer-rights-guide';
/** In-composer local preview, no submission, account, location or provider request. */
export default function ConsumerQuickCard({ category }: { category: DisputeType }) {
 const guide = CONSUMER_QUICK[category];
 return <section aria-label="Consumer quick guidance" className="m-3 space-y-2 rounded-xl border border-cyan-600 bg-slate-900 p-4 text-slate-100">
   <h2 className="font-semibold">Luqi consumer help — three first steps</h2>
   <p className="text-sm">{guide.title}. General guidance only, not a finding on your case.</p>
   <ol className="list-inside list-decimal space-y-2 text-sm">{guide.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
   <Link to="/consumer-rights" className="text-cyan-200 underline underline-offset-2">Open free source-linked consumer guide</Link>
 </section>;
}
