import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus, Mail, Lock, Eye, EyeOff, AlertTriangle, Sparkles,
  User, MapPin, Building, Phone, ArrowRight, CheckCircle
} from "lucide-react";

const PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State",
  "Mpumalanga", "North West", "Limpopo", "Northern Cape"];
const INDUSTRIES = ["IT & Technology", "Agriculture", "Construction", "Finance", "Healthcare",
  "Education", "Mining", "Retail", "Manufacturing", "Services", "Transport", "Other"];

export default function SignupPage() {
  const navigate = useNavigate();
  const { post, loading } = useApi();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", province: "", industry: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "password") {
      let s = 0;
      if (value.length >= 8) s++;
      if (/[A-Z]/.test(value)) s++;
      if (/[0-9]/.test(value)) s++;
      if (/[^A-Za-z0-9]/.test(value)) s++;
      setPasswordStrength(s);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.email || !form.password) { setError("Please fill in all required fields"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!agreed) { setError("Please agree to the terms and conditions"); return; }
    try {
      const result = await post("/auth/register", {
        email: form.email, password: form.password,
        full_name: form.fullName, province: form.province, industry: form.industry
      }) as any;
      if (result?.token) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user || {}));
        navigate("/");
      } else {
        setError(result?.detail || "Registration failed");
      }
    } catch (err: any) {
      setError(err?.detail || "Registration failed. Try a different email.");
    }
  };

  const strengthColor = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"];
  const strengthLabel = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-3">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-gray-400 mt-1">Join LUQI AI today</p>
        </div>

        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)}
                  placeholder="John Doe" className="pl-10 bg-neutral-700 border-neutral-600 text-white" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com" className="pl-10 bg-neutral-700 border-neutral-600 text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Province</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                  <select value={form.province} onChange={(e) => update("province", e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-md bg-neutral-700 border border-neutral-600 text-white text-sm appearance-none">
                    <option value="">Select...</option>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Industry</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                  <select value={form.industry} onChange={(e) => update("industry", e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-md bg-neutral-700 border border-neutral-600 text-white text-sm appearance-none">
                    <option value="">Select...</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input type={showPassword ? "text" : "password"} value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Min 8 characters" className="pl-10 pr-10 bg-neutral-700 border-neutral-600 text-white" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < passwordStrength ? strengthColor[passwordStrength - 1] : "bg-neutral-600"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{passwordStrength > 0 ? strengthLabel[passwordStrength - 1] : ""}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password *</label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="Repeat password" className="bg-neutral-700 border-neutral-600 text-white" />
              {form.confirmPassword && form.confirmPassword === form.password && (
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Passwords match</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-neutral-600 bg-neutral-700 text-cyan-500" />
              <span>I agree to the <span className="text-cyan-400">Terms of Service</span> and <span className="text-cyan-400">Privacy Policy</span></span>
            </label>

            <Button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium h-11">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><UserPlus className="w-4 h-4 mr-2" />Create Account</>}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-neutral-700 text-center">
            <p className="text-sm text-gray-400">Already have an account?{" "}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Log in <ArrowRight className="w-3 h-3 inline" /></Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
