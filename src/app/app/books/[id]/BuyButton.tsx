"use client";

import { useState } from "react";
import { startBookPurchaseAction } from "@/app/actions/purchases";

export function BuyButton({ bookId, priceGhs }: { bookId: number; priceGhs: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setBusy(true);
    setError(null);
    const res = await startBookPurchaseAction(bookId);
    if (res.ok && res.url) {
      window.location.href = res.url; // → Paystack checkout (MoMo + cards)
      return;
    }
    setBusy(false);
    setError(res.error ?? "Could not start the payment.");
  };

  return (
    <div className="text-right">
      <button onClick={buy} disabled={busy} className="rl-btn rl-btn-primary">
        {busy ? "Starting…" : `Buy to read · GHS ${priceGhs}`}
      </button>
      {error && <div className="text-[12px] mt-1" style={{ color: "var(--danger)" }}>{error}</div>}
    </div>
  );
}
