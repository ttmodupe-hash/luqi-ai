import { Navigate } from "react-router";

// Kept only for backwards-compatible imports. The reviewed registration form
// lives in /join and enforces the same account contract as the production API.
export default function SignupPage() {
  return <Navigate to="/join" replace />;
}
