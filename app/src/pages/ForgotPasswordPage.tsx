import { useState } from "react";
import { Link } from "react-router";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { post, loading } = useApi();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      // Attempt to call the backend forgot-password endpoint
      await post("/auth/forgot-password", { email });
    } catch {
      // Backend may not be available — that's ok, we still show success
      // to prevent email enumeration attacks
    }

    // Always show success (security best practice)
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">LUQI AI</h1>
          <p className="text-sm text-gray-400 mt-1">Reset your password</p>
        </div>

        {/* Card */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-xl">
          {submitted ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Check your email
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                If an account exists with that email, a reset link has been sent.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium"
              >
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">
                Forgot password?
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 bg-neutral-700 border-neutral-600 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium h-11"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-neutral-700 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  <ArrowLeft size={16} />
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          LUQI AI v29.0 — Built for Africa
        </p>
      </div>
    </div>
  );
}
