"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Market } from "@/lib/types";

/* ─── Helpers ─── */

function cents(p: number): string {
  if (p <= 0) return "—";
  return `${Math.round(p * 100)}\u00A2`;
}

function extractPrice(m: Market, outcome: string): number {
  if (m.tokens && Array.isArray(m.tokens)) {
    const t = m.tokens.find(
      (t) => t.outcome?.toLowerCase() === outcome.toLowerCase()
    );
    if (t?.price != null && t.price > 0) return t.price;
  }
  return 0;
}

function extractQuestion(m: Market): string {
  return (
    m.question ??
    (m as Record<string, unknown>).title ??
    "Unknown Market"
  ) as string;
}

function getConditionId(m: Market): string {
  return (m.condition_id ?? (m as Record<string, unknown>).id ?? "") as string;
}

const STARTING_CASH = 10_000;

/* ─── Types for order book data ─── */

interface BookSide {
  token_id?: string;
  best_bid: number;
  best_ask: number;
  spread: number;
  mid: number;
}

interface BookData {
  condition_id: string;
  yes: BookSide;
  no: BookSide;
  question: string;
}

/* ─── Main Page ─── */

export default function TradePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState("");

  // Trade form state
  const [selected, setSelected] = useState<Market | null>(null);
  const [book, setBook] = useState<BookData | null>(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [priceCents, setPriceCents] = useState(50);
  const [qty, setQty] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Fetch real CLOB order book when a market is selected
  const fetchBook = useCallback(async (m: Market) => {
    const cid = getConditionId(m);
    if (!cid) return;
    setBookLoading(true);
    setBook(null);
    try {
      const res = await fetch(`/api/markets/book?id=${encodeURIComponent(cid)}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data as BookData);
      }
    } catch {
      // silently fail — UI will show fallback from Gamma data
    } finally {
      setBookLoading(false);
    }
  }, []);

  function selectMarket(m: Market) {
    setSelected(m);
    setSuccess(null);
    setSide("yes");
    setQty(10);
    // Use Gamma price as initial default, will be overwritten when CLOB data loads
    const yesPrice = extractPrice(m, "yes");
    setPriceCents(yesPrice > 0 ? Math.round(yesPrice * 100) : 50);
    fetchBook(m);
  }

  // When CLOB book data arrives, set price to the real ask
  useEffect(() => {
    if (!book) return;
    const askPrice = side === "yes" ? book.yes.best_ask : book.no.best_ask;
    if (askPrice > 0) {
      setPriceCents(Math.round(askPrice * 100));
    }
  }, [book, side]);

  function switchSide(s: "yes" | "no") {
    setSide(s);
    if (book) {
      const askPrice = s === "yes" ? book.yes.best_ask : book.no.best_ask;
      if (askPrice > 0) setPriceCents(Math.round(askPrice * 100));
    } else if (selected) {
      const price = extractPrice(selected, s);
      if (price > 0) setPriceCents(Math.round(price * 100));
    }
  }

  // Polymarket cost calculation: buy at price, payout $1 if wins
  const totalCost = ((priceCents / 100) * qty).toFixed(2);
  const potentialPayout = qty.toFixed(2);
  const potentialProfit = (qty - (priceCents / 100) * qty).toFixed(2);
  const returnPct =
    priceCents > 0
      ? (((100 - priceCents) / priceCents) * 100).toFixed(1)
      : "0";

  async function handlePlaceTrade() {
    if (!selected) return;
    setSubmitting(true);
    setSuccess(null);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          market_id: getConditionId(selected),
          market_title: extractQuestion(selected),
          side,
          price: priceCents,
          qty,
          confidence: priceCents / 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place trade");
      setSuccess(
        `Placed: ${qty} ${side.toUpperCase()} @ ${priceCents}\u00A2 on "${extractQuestion(selected).slice(0, 50)}"`
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to place trade");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return markets;
    const q = search.toLowerCase();
    return markets.filter((m) => extractQuestion(m).toLowerCase().includes(q));
  }, [markets, search]);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 text-sm">Loading...</div>
    );
  }
  if (!user) return null;

  // Derive displayed bid/ask: prefer real CLOB data, fall back to Gamma
  const yesBid = book?.yes.best_bid ?? 0;
  const yesAsk = book?.yes.best_ask ?? 0;
  const noBid = book?.no.best_bid ?? 0;
  const noAsk = book?.no.best_ask ?? 0;
  const yesGamma = selected ? extractPrice(selected, "yes") : 0;
  const noGamma = selected ? extractPrice(selected, "no") : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trade Markets</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Place bets on the same Polymarket events as AI agents
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
              Cash Balance
            </div>
            <div className="text-lg font-bold font-mono text-gray-900">
              ${STARTING_CASH.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <Link
            href="/account"
            className="text-xs font-medium text-[#1565c0] hover:underline"
          >
            Account
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Trade Form */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="fin-card p-5 sticky top-20">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Place Trade</h2>

            {selected ? (
              <>
                {/* Market info */}
                <div className="mb-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                    Market
                  </div>
                  <p className="text-xs font-medium text-gray-800 leading-snug">
                    {extractQuestion(selected)}
                  </p>
                  {bookLoading && (
                    <div className="text-[10px] text-gray-400 mt-1 animate-pulse">
                      Loading live prices...
                    </div>
                  )}
                </div>

                {/* Side selector with real Bid/Ask */}
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Side
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {/* YES card */}
                  <button
                    type="button"
                    onClick={() => switchSide("yes")}
                    className={`p-3 border-2 transition-all text-left ${
                      side === "yes"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={side === "yes" ? "#16a34a" : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                        <polyline points="16 7 22 7 22 13" />
                      </svg>
                      <span className={`text-xs font-bold ${side === "yes" ? "text-green-700" : "text-gray-600"}`}>
                        YES
                      </span>
                      {side === "yes" && <span className="ml-auto h-2 w-2 bg-green-500" />}
                    </div>
                    <div className="text-[10px] text-gray-400">Bid / Ask</div>
                    <div className={`text-sm font-bold font-mono ${side === "yes" ? "text-green-700" : "text-gray-700"}`}>
                      {yesBid > 0 || yesAsk > 0
                        ? `${cents(yesBid)} / ${cents(yesAsk)}`
                        : yesGamma > 0
                          ? cents(yesGamma)
                          : "—"}
                    </div>
                  </button>

                  {/* NO card */}
                  <button
                    type="button"
                    onClick={() => switchSide("no")}
                    className={`p-3 border-2 transition-all text-left ${
                      side === "no"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={side === "no" ? "#dc2626" : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                        <polyline points="16 17 22 17 22 11" />
                      </svg>
                      <span className={`text-xs font-bold ${side === "no" ? "text-red-700" : "text-gray-600"}`}>
                        NO
                      </span>
                      {side === "no" && <span className="ml-auto h-2 w-2 bg-red-500" />}
                    </div>
                    <div className="text-[10px] text-gray-400">Bid / Ask</div>
                    <div className={`text-sm font-bold font-mono ${side === "no" ? "text-red-700" : "text-gray-700"}`}>
                      {noBid > 0 || noAsk > 0
                        ? `${cents(noBid)} / ${cents(noAsk)}`
                        : noGamma > 0
                          ? cents(noGamma)
                          : "—"}
                    </div>
                  </button>
                </div>

                {/* Price input */}
                <div className="mb-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                    Price
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={priceCents}
                      onChange={(e) =>
                        setPriceCents(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))
                      }
                      className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 text-lg font-bold font-mono text-gray-900 focus:border-[#1565c0] focus:bg-white transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono text-gray-400">
                      &cent;
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    {[10, 25, 50, 75, 90].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPriceCents(v)}
                        className={`flex-1 py-1 text-[10px] font-mono font-medium border transition-colors ${
                          priceCents === v
                            ? "border-[#1565c0] bg-blue-50 text-[#1565c0]"
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {v}&cent;
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity input */}
                <div className="mb-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                    Quantity (contracts)
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={qty}
                    onChange={(e) =>
                      setQty(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))
                    }
                    className="w-full border border-gray-200 bg-gray-50 px-3 py-2.5 text-lg font-bold font-mono text-gray-900 focus:border-[#1565c0] focus:bg-white transition-colors"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {[1, 5, 10, 25, 50, 100].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setQty(v)}
                        className={`flex-1 py-1 text-[10px] font-mono font-medium border transition-colors ${
                          qty === v
                            ? "border-[#1565c0] bg-blue-50 text-[#1565c0]"
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cost summary — real Polymarket math */}
                <div className="bg-gray-50 border border-gray-200 p-3 mb-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Cost ({qty} &times; {priceCents}&cent;)</span>
                    <span className="font-bold font-mono text-gray-900">${totalCost}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Payout if {side.toUpperCase()} wins</span>
                    <span className="font-bold font-mono num-positive">${potentialPayout}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5">
                    <span className="text-gray-500">Potential Profit</span>
                    <span className="font-bold font-mono num-positive">
                      +${potentialProfit} ({returnPct}%)
                    </span>
                  </div>
                </div>

                {/* Place trade button */}
                <button
                  type="button"
                  onClick={handlePlaceTrade}
                  disabled={submitting}
                  className={`w-full py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                    side === "yes"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submitting
                    ? "Placing..."
                    : `Buy ${side.toUpperCase()} — ${qty} @ ${priceCents}\u00A2`}
                </button>

                {success && (
                  <div className="mt-3 p-2.5 bg-green-50 border border-green-200 text-xs text-green-800">
                    {success}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setBook(null);
                    setSuccess(null);
                  }}
                  className="w-full mt-2 py-2 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Clear selection
                </button>
              </>
            ) : (
              <div className="py-8 text-center text-gray-400 text-xs">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-gray-300">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Select a market from the right to start trading
              </div>
            )}
          </div>
        </div>

        {/* Right: Market List */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1565c0] focus:bg-white transition-colors"
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-1.5 font-mono">
              {filtered.length} markets &middot; Live from Polymarket
            </div>
          </div>

          {/* Market cards */}
          <div className="space-y-2">
            {filtered.slice(0, 50).map((m, i) => {
              const q = extractQuestion(m);
              const cid = getConditionId(m);
              const yP = extractPrice(m, "yes");
              const nP = extractPrice(m, "no");
              const isSelected = selected && getConditionId(selected) === cid;

              return (
                <button
                  key={cid || i}
                  type="button"
                  onClick={() => selectMarket(m)}
                  className={`w-full text-left fin-card p-4 transition-all hover:shadow-sm ${
                    isSelected
                      ? "border-[#1565c0] ring-1 ring-[#1565c0]/20"
                      : "hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {m.image && (
                      <img
                        src={m.image as string}
                        alt=""
                        className="h-8 w-8 shrink-0 object-cover rounded-sm mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-gray-900 leading-snug mb-2">
                        {q}
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* YES */}
                        <div className={`flex-1 border p-2 ${isSelected && side === "yes" ? "border-green-400 bg-green-50" : "border-green-200 bg-green-50/50"}`}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                              <polyline points="16 7 22 7 22 13" />
                            </svg>
                            <span className="text-[10px] font-bold text-green-700">YES</span>
                          </div>
                          <div className="text-xs font-bold font-mono text-green-700">
                            {yP > 0 ? cents(yP) : "—"}
                          </div>
                        </div>

                        {/* NO */}
                        <div className={`flex-1 border p-2 ${isSelected && side === "no" ? "border-red-400 bg-red-50" : "border-red-200 bg-red-50/50"}`}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                              <polyline points="16 17 22 17 22 11" />
                            </svg>
                            <span className="text-[10px] font-bold text-red-700">NO</span>
                          </div>
                          <div className="text-xs font-bold font-mono text-red-700">
                            {nP > 0 ? cents(nP) : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">
                {search ? "No markets match your search." : "Loading markets..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
