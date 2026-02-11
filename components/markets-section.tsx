"use client";

import { useEffect, useState, useMemo } from "react";
import type { Market } from "@/lib/types";

interface Props {
  markets: Market[];
}

type SortField = "question" | "yes_price" | "volume" | "spread";
type SortDir = "asc" | "desc";

function extractPrice(
  market: Market,
  outcome: string
): number {
  if (market.tokens && Array.isArray(market.tokens)) {
    const token = market.tokens.find(
      (t) => t.outcome?.toLowerCase() === outcome.toLowerCase()
    );
    if (token?.price != null) return token.price;
  }
  // Fallback: check outcomePrices or bestBid/bestAsk
  const obj = market as Record<string, unknown>;
  if (outcome === "yes") {
    const p = obj.outcomePrices ?? obj.best_bid ?? obj.yes_price;
    if (typeof p === "number") return p;
    if (typeof p === "string") return parseFloat(p) || 0;
    if (Array.isArray(p) && p.length > 0) return parseFloat(String(p[0])) || 0;
  }
  if (outcome === "no") {
    const p = obj.best_ask ?? obj.no_price;
    if (typeof p === "number") return p;
    if (typeof p === "string") return parseFloat(p) || 0;
    const prices = obj.outcomePrices;
    if (Array.isArray(prices) && prices.length > 1) return parseFloat(String(prices[1])) || 0;
  }
  return 0;
}

function extractVolume(market: Market): number {
  const obj = market as Record<string, unknown>;
  const v = obj.volume ?? obj.volume_num ?? obj.volumeNum ?? 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function extractQuestion(market: Market): string {
  return (
    market.question ??
    (market as Record<string, unknown>).title ??
    (market as Record<string, unknown>).condition_id ??
    "Unknown Market"
  ) as string;
}

function fmtVol(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  if (v > 0) return `$${v.toFixed(0)}`;
  return "-";
}

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export default function MarketsSection({ markets: initialMarkets }: Props) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const processed = useMemo(() => {
    return initialMarkets.map((m) => ({
      raw: m,
      question: extractQuestion(m),
      yesPrice: extractPrice(m, "yes"),
      noPrice: extractPrice(m, "no"),
      volume: extractVolume(m),
      conditionId: (m.condition_id ?? (m as Record<string, unknown>).id ?? "") as string,
      active: m.active !== false,
    }));
  }, [initialMarkets]);

  const filtered = useMemo(() => {
    let items = processed;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((m) => m.question.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "question":
          cmp = a.question.localeCompare(b.question);
          break;
        case "yes_price":
          cmp = a.yesPrice - b.yesPrice;
          break;
        case "volume":
          cmp = a.volume - b.volume;
          break;
        case "spread":
          cmp =
            Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [processed, search, sortField, sortDir]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  return (
    <div>
      {/* Search + stats */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <input
          type="text"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full max-w-sm border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {filtered.length} markets
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 w-8">#</th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("question")}
              >
                Market{sortIcon("question")}
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-gray-700 w-24"
                onClick={() => toggleSort("yes_price")}
              >
                Yes{sortIcon("yes_price")}
              </th>
              <th className="px-4 py-3 text-right w-24">No</th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-gray-700 w-28"
                onClick={() => toggleSort("spread")}
              >
                Spread{sortIcon("spread")}
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-gray-700 w-28"
                onClick={() => toggleSort("volume")}
              >
                Volume{sortIcon("volume")}
              </th>
              <th className="px-4 py-3 text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {search ? "No markets match your search." : "Loading markets..."}
                </td>
              </tr>
            )}
            {visible.map((m, i) => {
              const spread = Math.abs(m.yesPrice + m.noPrice - 1);
              const yesBarWidth = Math.max(m.yesPrice * 100, 2);
              return (
                <tr key={m.conditionId || i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {page * pageSize + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[360px]">
                      <div className="text-gray-800 font-medium text-[13px] leading-snug">
                        {m.question}
                      </div>
                      {m.conditionId && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {m.conditionId.slice(0, 16)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-medium text-emerald-600">
                      {m.yesPrice > 0 ? fmtPct(m.yesPrice) : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-medium text-red-500">
                      {m.noPrice > 0 ? fmtPct(m.noPrice) : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-gray-500 text-xs">
                      {spread > 0 ? fmtPct(spread) : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {fmtVol(m.volume)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-semibold ${
                        m.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.active ? "Active" : "Closed"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
              disabled={page >= pageCount - 1}
              className="px-3 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
