import { Link } from "react-router";

export default function ArchiveVaultPage() {
  return <section className="mx-auto max-w-3xl space-y-5 p-6" aria-labelledby="archive-title">
    <p className="text-sm font-semibold text-amber-300">Unavailable</p>
    <h1 id="archive-title" className="text-3xl font-bold">Archive vault</h1>
    <p>Archive access is paused while account ownership and reliable storage are implemented.
      Checkpoint history, shared cognitive records and artifact uploads are unavailable.</p>
    <p>No archive records are loaded or changed from this page. Existing files are preserved.</p>
    <p>For personal notes, use the companion workspace and sign in to your account.</p>
    <div className="flex flex-wrap gap-4">
      <Link className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2" to="/companion">Open private notes</Link>
      <Link className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2" to="/">Back to workspace</Link>
    </div>
  </section>;
}
