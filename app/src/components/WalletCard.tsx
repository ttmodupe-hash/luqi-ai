import { useState, useEffect } from "react";
import { Wallet, Plus, Loader2, ExternalLink } from "lucide-react";

/**
 * WalletCard — credit balance + Paystack top-up entry point.
 * Honest by design: shows real balance from the server, and a clear
 * "not configured" state until PAYSTACK_SECRET_KEY exists server-side.
 */
export default function WalletCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("ZAR");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [topupState, setTopupState] = useState<"idle" | "unconfigured" | "error">("idle");
  const [note, setNote] = useState("");

  const userEmail = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.email || "demo@luqi.ai";
    } catch {
      return "demo@luqi.ai";
    }
  })();

  useEffect(() => {
    fetch(`/api/v25/payments/balance?key=${encodeURIComponent(userEmail)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBalance(d.balanceCents ?? 0);
          setCurrency(d.currency ?? "ZAR");
        }
      })
      .catch(() => setBalance(null));
  }, [userEmail]);

  const handleTopup = async () => {
    const amt = Number(amount);
    if (!amt || amt < 5) {
      setNote("Minimum top-up is R5");
      return;
    }
    setLoading(true);
    setNote("");
    try {
      const res = await fetch("/api/v25/payments/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, amountZar: amt }),
      });
      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl; // Paystack hosted checkout
      } else if (res.status === 503) {
        setTopupState("unconfigured");
      } else {
        setTopupState("error");
        setNote(data.detail || "Could not start the top-up. Please try again.");
      }
    } catch {
      setTopupState("error");
      setNote("Couldn't reach the server. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-neutral-800 to-neutral-850 border border-neutral-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">My Wallet</h3>
        </div>
        {balance !== null && (
          <span className="text-lg font-bold text-emerald-400">
            R{((balance ?? 0) / 100).toFixed(2)} <span className="text-xs text-gray-500">{currency}</span>
          </span>
        )}
      </div>

      {topupState === "unconfigured" ? (
        <p className="text-xs text-gray-400">
          Top-ups open soon — payments are being activated. Your balance is safe and will appear here.
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            min="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (R)"
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleTopup}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Top Up
          </button>
        </div>
      )}

      {note && <p className="text-xs text-amber-400 mt-2">{note}</p>}
      {topupState === "idle" && (
        <p className="text-[11px] text-gray-600 mt-2 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Card, EFT & mobile money via Paystack secure checkout
        </p>
      )}
    </div>
  );
}
