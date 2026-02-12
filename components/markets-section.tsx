"use client";

import { useState, useMemo } from "react";
import type { Market } from "@/lib/types";

interface Props {
  markets: Market[];
}

type SortField = "question" | "yes_price" | "volume" | "spread";
type SortDir = "asc" | "desc";

function extractPrice(market: Market, outcome: string): number {
  // Prefer normalised tokens (from Gamma normalisation)
  if (market.tokens && Array.isArray(market.tokens)) {
    const token = market.tokens.find(
      (t) => t.outcome?.toLowerCase() === outcome.toLowerCase()
    );
    if (token?.price != null && token.price > 0) return token.price;
  }
  // Fallback: parse outcomePrices
  const op = market.outcomePrices;
  const idx = outcome.toLowerCase() === "yes" ? 0 : 1;
  if (typeof op === "string") {
    try {
      const parsed = JSON.parse(op);
      if (Array.isArray(parsed) && parsed.length > idx)
        return parseFloat(String(parsed[idx])) || 0;
    } catch {
      const parts = op.split(",");
      if (parts.length > idx) return parseFloat(parts[idx]) || 0;
    }
  }
  if (Array.isArray(op) && op.length > idx)
    return parseFloat(String(op[idx])) || 0;

  return 0;
}

function extractVolume(market: Market): number {
  // Normalised Gamma data puts volume as a number directly
  if (typeof market.volume === "number") return market.volume;
  if (typeof market.volume === "string") return parseFloat(market.volume) || 0;
  const obj = market as Record<string, unknown>;
  const v = obj.volumeNum ?? obj.volume_num ?? 0;
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
          cmp = Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5);
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
        <div className="relative w-full max-w-sm">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-[#1565c0] focus:bg-white transition-colors"
          />
        </div>
        <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
          {filtered.length} markets
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-3 py-2.5 w-8">#</th>
              <th
                className="px-3 py-2.5 cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("question")}
              >
                Market{sortIcon("question")}
              </th>
              <th
                className="px-3 py-2.5 text-right cursor-pointer hover:text-gray-700 w-20"
                onClick={() => toggleSort("yes_price")}
              >
                Yes{sortIcon("yes_price")}
              </th>
              <th className="px-3 py-2.5 text-right w-20">No</th>
              <th
                className="px-3 py-2.5 text-right cursor-pointer hover:text-gray-700 w-20"
                onClick={() => toggleSort("spread")}
              >
                Spread{sortIcon("spread")}
              </th>
              <th
                className="px-3 py-2.5 text-right cursor-pointer hover:text-gray-700 w-24"
                onClick={() => toggleSort("volume")}
              >
                Volume{sortIcon("volume")}
              </th>
              <th className="px-3 py-2.5 text-center w-16">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-gray-400 text-xs">
                  {search ? "No markets match your search." : "Loading markets..."}
                </td>
              </tr>
            )}
            {visible.map((m, i) => {
              const spread = Math.abs(m.yesPrice + m.noPrice - 1);
              return (
                <tr key={m.conditionId || i} className="fin-row transition-colors">
                  <td className="px-3 py-2.5 text-gray-400 font-mono">
                    {page * pageSize + i + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[340px] flex items-center gap-2">
                      {m.raw.image && (
                        <img
                          src={m.raw.image as string}
                          alt=""
                          className="h-6 w-6 shrink-0 object-cover rounded-sm"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-gray-800 font-medium text-xs leading-snug truncate">
                          {m.question}
                        </div>
                        {m.conditionId && (
                          <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                            {m.conditionId.slice(0, 14)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono font-bold num-positive">
                      {m.yesPrice > 0 ? fmtPct(m.yesPrice) : "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono font-bold num-negative">
                      {m.noPrice > 0 ? fmtPct(m.noPrice) : "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono text-gray-500">
                      {spread > 0 ? fmtPct(spread) : "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600">
                    {fmtVol(m.volume)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[9px] font-bold ${
                        m.active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.active ? "ACTIVE" : "CLOSED"}
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
        <div className="flex items-center justify-between mt-3 text-[10px] text-gray-500">
          <span className="font-mono">
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-medium"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
              disabled={page >= pageCount - 1}
              className="px-2.5 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
