/**
 * LUQI AI — Terms of Service
 * ===========================
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  FileText, ArrowLeft, Shield, User, Lock, Copyright,
  AlertTriangle, RefreshCw, Mail, ChevronDown,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Shield,
    title: "Acceptance of Terms",
    text: "By accessing or using LUQI AI, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service. These terms apply to all visitors, users, and others who access or use LUQI AI.",
  },
  {
    icon: User,
    title: "User Accounts",
    text: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account. LUQI AI reserves the right to terminate accounts that violate these terms.",
  },
  {
    icon: Lock,
    title: "Use of Service",
    text: "LUQI AI provides AI-powered information and tools for South African residents. The information provided is for general guidance only and does not constitute professional advice. Always consult qualified professionals for legal, financial, medical, or other specialist matters.",
  },
  {
    icon: AlertTriangle,
    title: "Prohibited Activities",
    text: "You may not use LUQI AI for any unlawful purpose, attempt to gain unauthorized access, interfere with the service's operation, use automated systems without permission, resell or redistribute content, or generate harmful, abusive, or discriminatory content.",
  },
  {
    icon: Copyright,
    title: "Intellectual Property",
    text: "All content, trademarks, and intellectual property on LUQI AI are owned by LUQI AI or its licensors. You may not copy, modify, distribute, or create derivative works without express written permission. AI-generated responses are provided for personal use.",
  },
  {
    icon: Shield,
    title: "Limitation of Liability",
    text: "LUQI AI is provided 'as is' without warranties of any kind. We do not guarantee accuracy, completeness, or reliability of any information. To the maximum extent permitted by law, LUQI AI shall not be liable for any direct, indirect, incidental, or consequential damages.",
  },
  {
    icon: Lock,
    title: "Privacy",
    text: "Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information. We comply with the Protection of Personal Information Act (POPIA) of South Africa.",
  },
  {
    icon: RefreshCw,
    title: "Modifications",
    text: "We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of LUQI AI after changes constitutes acceptance of the revised terms. We will notify users of significant changes via email or in-app notice.",
  },
  {
    icon: Mail,
    title: "Contact",
    text: "For questions about these terms, please contact us at support@luqi.ai or through our Contact & Support page.",
  },
];

export default function TermsPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <FileText size={24} className="text-cyan-500" />
          <div>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
            <p className="text-sm text-neutral-400">Last updated: July 2026</p>
          </div>
        </div>

        {/* Intro */}
        <p className="text-neutral-300 mb-6">
          Welcome to LUQI AI. Please read these terms carefully before using our service.
          By using LUQI AI, you agree to these Terms of Service.
        </p>

        {/* Sections */}
        <div className="space-y-2">
          {SECTIONS.map((section, i) => (
            <div
              key={i}
              className="border border-neutral-800 rounded-xl overflow-hidden"
            >
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

        {/* Footer */}
        <p className="text-center text-neutral-500 text-sm mt-8">
          If you have any questions about these Terms, please{" "}
          <button onClick={() => navigate("/contact")} className="text-cyan-500 hover:underline">
            contact us
          </button>
          .
        </p>
      </div>
    </div>
  );
}
