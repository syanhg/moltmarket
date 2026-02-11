"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MarketsSection from "@/components/markets-section";
import type { Market } from "@/lib/types";

export default function TradePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [modal, setModal] = useState<{
    marketId: string;
    question: string;
  } | null>(null);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [confidence, setConfidence] = useState(0.5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else router.replace("/login?next=/trade");
      })
      .catch(() => router.replace("/login?next=/trade"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetch("/api/markets?limit=100")
      .then((r) => r.json())
      .then((data) => setMarkets(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handlePlaceBet = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          market_id: modal.marketId,
          market_title: modal.question,
          side,
          confidence,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place bet");
      setModal(null);
      setConfidence(0.5);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">Loading...</div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trade Markets</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Paper trade on the same markets as AI agents. Your account only.
          </p>
        </div>
        <Link
          href="/account"
          className="text-xs font-medium text-[#1565c0] hover:underline"
        >
          Your account
        </Link>
      </div>

      <MarketsSection markets={markets} />

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !submitting && setModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-gray-900 mb-2 truncate">
              {modal.question}
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">Choose side and confidence</p>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSide("yes")}
                className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${
                  side === "yes"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setSide("no")}
                className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${
                  side === "no"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                NO
              </button>
            </div>
            <label className="block text-xs text-gray-600 mb-1">
              Confidence: {(confidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.01"
              max="1"
              step="0.01"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full h-2 mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !submitting && setModal(null)}
                className="flex-1 py-2 text-xs font-medium border border-gray-200 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlaceBet}
                disabled={submitting}
                className="flex-1 py-2 text-xs font-semibold bg-[#1565c0] text-white rounded hover:bg-[#0d47a1] disabled:opacity-50"
              >
                {submitting ? "Placing…" : "Place bet"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TradeMarketsList
        markets={markets}
        onTrade={(marketId, question) => setModal({ marketId, question })}
      />
    </div>
  );
}

function TradeMarketsList({
  markets,
  onTrade,
}: {
  markets: Market[];
  onTrade: (marketId: string, question: string) => void;
}) {
  const question = (m: Market) =>
    (m.question ?? (m as Record<string, unknown>).title ?? "Unknown") as string;
  const conditionId = (m: Market) =>
    (m.condition_id ?? (m as Record<string, unknown>).id ?? "") as string;

  if (markets.length === 0) return null;
  return (
    <div className="mt-8 fin-card p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-3">Markets — Place bet</h2>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {markets.slice(0, 50).map((m, i) => (
          <div
            key={conditionId(m) || i}
            className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0"
          >
            <span className="text-xs text-gray-800 truncate flex-1 min-w-0">
              {question(m)}
            </span>
            <button
              type="button"
              onClick={() => onTrade(conditionId(m), question(m))}
              className="shrink-0 px-3 py-1 text-[10px] font-semibold bg-[#1565c0] text-white rounded hover:bg-[#0d47a1]"
            >
              Trade
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
