import { Link } from 'react-router';
export default function PrivacyPage() {
  return <main className="luqi-info"><p className="luqi-eyebrow">BEFORE YOU SAVE A NOTE</p>
    <h1>Pilot privacy information</h1>
    <p>This describes the current notes pilot. It does not certify legal compliance or end-to-end encryption.</p>
    <section><h2>Account and saved content</h2><p>Registration stores your email address and a password hash. Conversation titles, saved messages and linked memories are stored on LUQI’s server. Storage administrators can access saved records. Avoid confidential, financial, health or identity documents while testing.</p></section>
    <section><h2>On your device</h2><p>The notes sign-in token and unsaved draft stay in page memory. Leaving or reloading the page ends that session and clears unsaved drafts. The site may cache application assets for loading; account and note responses are excluded from its service-worker cache.</p></section>
    <section><h2>Export and deletion</h2><p>You can download one owned conversation as JSON and confirm deletion of its active records. Exported files remain on your device until you remove them. Deleting active records does not immediately erase backup copies. Whole-account export and deletion, and a verified backup-erasure policy, are not yet available.</p></section>
    <section><h2>Service operations</h2><p>Operational logs can include request paths, status codes, timing and network metadata. The notes flow does not generate AI answers. A working service-status check does not verify every security control or future AI feature.</p></section>
    <section><h2>Help with your account</h2><p>Email verification and automatic password-reset emails are unavailable. An administrator must handle recovery through a verified private channel; do not put passwords, tokens or private notes in public issue reports.</p><Link to="/contact">Help and feedback</Link></section>
    <Link to="/start">Back to getting started</Link>
  </main>;
}
