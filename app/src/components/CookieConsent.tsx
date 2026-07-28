/**
 * LUQI AI — Cookie Consent Banner
 * ================================
 * POPIA-compliant cookie consent with Accept All / Essential Only options.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Cookie, X } from "lucide-react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = (level: "all" | "essential") => {
    localStorage.setItem("cookie_consent", level);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie size={20} className="text-cyan-500 flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies to enhance your experience, analyze site traffic, and serve
          personalized content. By continuing to use LUQI AI, you consent to our use of
          cookies.{" "}
          <button
            onClick={() => navigate("/privacy")}
            className="text-cyan-500 hover:text-cyan-400 underline"
          >
            Privacy Policy
          </button>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => handleAccept("essential")}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Essential Only
          </button>
          <button
            onClick={() => handleAccept("all")}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-medium hover:bg-cyan-400 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
