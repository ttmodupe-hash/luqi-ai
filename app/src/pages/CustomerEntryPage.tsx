import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import AccountAccessForm from '../components/AccountAccessForm';
import { useCustomerSession } from '../providers/customer-session';

/**
 * Registration and login belong to the Luqi account, not to the Notes vault.
 * Accept the already-validated account session, then open Chat without another
 * authentication request, automatic AI inference, or browser token storage.
 */
export default function CustomerEntryPage({ initialMode = 'signin' }: { initialMode?: 'signin' | 'signup' }) {
  const { session, acceptSession } = useCustomerSession();
  const navigate = useNavigate();
  const location = useLocation();
  // Never retain untrusted redirect targets, email addresses or passwords in
  // bookmarked hash-route query strings. Drop them before rendering the form.
  if (location.search) return <Navigate to={location.pathname} replace />;
  if (session) return <Navigate to="/chat" replace />;
  return <main className="luqi-info" aria-labelledby="luqi-account-entry-heading">
    <p className="luqi-eyebrow">One Luqi account</p>
    <h1 id="luqi-account-entry-heading">Welcome to Luqi</h1>
    <p>Sign in or create one account, then go straight to Chat. Notes are optional.
      Signing in does not send a question to an AI provider or activate a subscription.</p>
    <AccountAccessForm initialMode={initialMode} purpose="account" onAuthenticated={value => {
      acceptSession(value);
      navigate('/chat', { replace: true });
    }} />
    <p>Chat uses a limited AI text trial with separate consent and usage limits.
      You can also <Link to="/start">explore free tools</Link> without signing in.</p>
  </main>;
}
