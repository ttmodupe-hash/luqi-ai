/**
 * LUQI AI — Privacy Policy
 * =========================
 * POPIA-compliant privacy policy for South Africa.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Shield, ArrowLeft, Database, Eye, Lock, Cookie,
  Users, Baby, RefreshCw, Mail, ChevronDown,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Eye,
    title: "Information We Collect",
    text: "We collect personal information you provide (name, email, province, industry), usage data (features accessed, search queries), technical data (IP address, browser type, device info), and cookies/tracking data. All collection is limited to what is necessary for the service.",
  },
  {
    icon: Database,
    title: "How We Use Your Information",
    text: "We use your information to provide and improve LUQI AI, personalise your experience, send important notifications, analyse usage patterns, ensure security, and comply with legal obligations. We do not sell your personal data to third parties.",
  },
  {
    icon: Lock,
    title: "Data Storage & Security",
    text: "Your data is stored on secure servers with encryption at rest and in transit. We use industry-standard security measures including SSL/TLS encryption, access controls, and regular security audits. Data is stored in South Africa where possible.",
  },
  {
    icon: Cookie,
    title: "Cookies & Tracking",
    text: "We use essential cookies for authentication and functionality, analytics cookies to understand usage (with your consent), and preference cookies to remember your settings. You can manage cookie preferences through our cookie consent banner.",
  },
  {
    icon: Users,
    title: "Third-Party Services",
    text: "We may use trusted third-party services for analytics (PostHog, Google Analytics) and AI processing (OpenAI). These services have their own privacy policies and are contractually bound to protect your data.",
  },
  {
    icon: Shield,
    title: "Your Rights (POPIA)",
    text: "Under South Africa's Protection of Personal Information Act (POPIA), you have the right to: access your personal data, correct inaccurate data, request deletion of your data, object to processing, lodge a complaint with the Information Regulator, and withdraw consent at any time.",
  },
  {
    icon: Database,
    title: "Data Retention",
    text: "We retain your personal data for as long as your account is active. You can request deletion at any time. Anonymous usage data may be retained longer for analytics. Backup data is retained for 30 days.",
  },
  {
    icon: Baby,
    title: "Children's Privacy",
    text: "LUQI AI is not intended for children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided personal data, contact us immediately.",
  },
  {
    icon: RefreshCw,
    title: "Changes to This Policy",
    text: "We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notice. Continued use after changes constitutes acceptance.",
  },
  {
    icon: Mail,
    title: "Contact",
    text: "For privacy-related questions or to exercise your POPIA rights, contact us at privacy@luqi.ai or through our Contact & Support page.",
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);

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
          <Shield size={24} className="text-cyan-500" />
          <div>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-neutral-400">POPIA Compliant</p>
          </div>
        </div>

        {/* POPIA Badge */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Shield size={20} className="text-cyan-500" />
          <div>
            <p className="text-sm font-medium text-cyan-400">
              Protection of Personal Information Act (POPIA)
            </p>
            <p className="text-xs text-neutral-400">
              LUQI AI complies with South Africa's POPIA to protect your personal information.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {SECTIONS.map((section, i) => (
            <div key={i} className="border border-neutral-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/50 transition-colors text-left"
              >
                <section.icon size={18} className="text-cyan-500 flex-shrink-0" />
                <span className="font-medium flex-1">{section.title}</span>
                <ChevronDown
                  size={18}
                  className={`text-neutral-500 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-4 pb-4 text-sm text-neutral-300 leading-relaxed">
                  {section.text}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-neutral-500 text-sm mt-8">
          Questions?{" "}
          <button onClick={() => navigate("/contact")} className="text-cyan-500 hover:underline">
            Contact our privacy team
          </button>
        </p>
      </div>
    </div>
  );
}
