/**
 * LUQI AI — Contact & Support
 * ============================
 * Feedback form, FAQ, and alternative contact methods.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Mail, ArrowLeft, Send, MessageCircle, HelpCircle,
  ChevronDown, Phone, CheckCircle, Loader2,
} from "lucide-react";

const FAQS = [
  {
    q: "How do I reset my password?",
    a: "Go to the Login page and click 'Forgot password?' Enter your email, and we'll send you a reset link.",
  },
  {
    q: "Is LUQI AI free to use?",
    a: "Yes! LUQI AI is currently free during our beta period. Some advanced features may require a subscription in the future.",
  },
  {
    q: "How accurate is the AI information?",
    a: "LUQI AI provides general guidance only. For legal, financial, or medical decisions, always consult a qualified professional.",
  },
  {
    q: "Can I use LUQI AI offline?",
    a: "Some features work offline once loaded, but AI-powered responses require an internet connection.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use SSL encryption, comply with South Africa's POPIA, and never sell your data. See our Privacy Policy for details.",
  },
];

export default function ContactPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", subject: "general", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/v25/feedback/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (res.ok) {
        setSent(true);
      } else {
        // Fallback: save to localStorage
        const existing = JSON.parse(localStorage.getItem("feedback_queue") || "[]");
        existing.push({ ...form, created_at: Date.now() });
        localStorage.setItem("feedback_queue", JSON.stringify(existing));
        setSent(true);
      }
    } catch {
      const existing = JSON.parse(localStorage.getItem("feedback_queue") || "[]");
      existing.push({ ...form, created_at: Date.now() });
      localStorage.setItem("feedback_queue", JSON.stringify(existing));
      setSent(true);
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <Mail size={24} className="text-cyan-500" />
          <div>
            <h1 className="text-2xl font-bold">Contact & Support</h1>
            <p className="text-sm text-neutral-400">We're here to help</p>
          </div>
        </div>

        {sent ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center mb-6">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Message Sent!</h2>
            <p className="text-neutral-400">
              Thank you for your feedback. We'll get back to you soon.
            </p>
            <button
              onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "general", message: "" }); }}
              className="mt-4 px-4 py-2 rounded-lg bg-cyan-500 text-black font-medium hover:bg-cyan-400 transition-colors"
            >
              Send Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="general">General Inquiry</option>
              <option value="technical">Technical Issue</option>
              <option value="billing">Billing</option>
              <option value="feature">Feature Request</option>
            </select>
            <textarea
              placeholder="How can we help you?"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 resize-none"
              required
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}

        {/* Alternative contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <a
            href="mailto:support@luqi.ai"
            className="flex items-center gap-3 p-4 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-cyan-500/50 transition-colors"
          >
            <Mail size={20} className="text-cyan-500" />
            <div>
              <p className="font-medium">Email Us</p>
              <p className="text-sm text-neutral-400">support@luqi.ai</p>
            </div>
          </a>
          <a
            href="https://wa.me/27000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-green-500/50 transition-colors"
          >
            <MessageCircle size={20} className="text-green-500" />
            <div>
              <p className="font-medium">WhatsApp</p>
              <p className="text-sm text-neutral-400">Chat with us</p>
            </div>
          </a>
        </div>

        {/* FAQ */}
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HelpCircle size={20} className="text-cyan-500" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-neutral-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/50 transition-colors text-left"
              >
                <span className="flex-1 text-sm font-medium">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-neutral-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-neutral-300">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
