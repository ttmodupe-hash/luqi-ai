import { Navigate } from "react-router";

// Kept only for backwards-compatible imports. The reviewed login form lives
// in /companion and does not store a bearer token in browser persistence.
export default function LoginPage() {
  return <Navigate to="/companion" replace />;
}
