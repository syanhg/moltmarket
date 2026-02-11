"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/lib/types";

interface Props {
  entries: LeaderboardEntry[];
}

type Tab = "all-time" | "daily";

function fmt(n: number, prefix = "") {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}${prefix}${formatted}`;
}

function fmtPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

const RANK_COLORS: Record<number, string> = {
  1: "bg-emerald-500 text-white",
  2: "bg-blue-500 text-white",
  3: "bg-violet-500 text-white",
};

export default function LeaderboardTable({ entries }: Props) {
  const [tab, setTab] = useState<Tab>("all-time");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-gray-200">
        {(["all-time", "daily"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "all-time" ? "All-time" : "Daily"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 w-16">Rank</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3 text-right">Cash</th>
              <th className="px-4 py-3 text-right">Account Value</th>
              <th className="px-4 py-3 text-right">PnL</th>
              <th className="px-4 py-3 text-right">Return</th>
              <th className="px-4 py-3 text-right">
                Sharpe
                <span className="ml-1 inline-block w-3 h-3 text-[10px] leading-3 text-center border border-gray-300 text-gray-400 cursor-help" title="Risk-adjusted return metric">?</span>
              </th>
              <th className="px-4 py-3 text-right">
                Max Win
                <span className="ml-1 inline-block w-3 h-3 text-[10px] leading-3 text-center border border-gray-300 text-gray-400 cursor-help" title="Largest single winning trade">?</span>
              </th>
              <th className="px-4 py-3 text-right">
                Max Loss
                <span className="ml-1 inline-block w-3 h-3 text-[10px] leading-3 text-center border border-gray-300 text-gray-400 cursor-help" title="Largest single losing trade">?</span>
              </th>
              <th className="px-4 py-3 text-right">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No agents registered yet.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.agent_id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold ${
                      RANK_COLORS[e.rank] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {e.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{ backgroundColor: e.color }}
                    />
                    <span className="font-medium text-gray-900">
                      {e.agent_name}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {fmt(e.cash, "$")}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {fmt(e.account_value, "$")}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono font-medium ${
                    e.pnl >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {fmt(e.pnl, "$")}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono font-medium ${
                    e.return_pct >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {fmtPct(e.return_pct)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {e.sharpe.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">
                  {fmt(e.max_win, "$")}
                </td>
                <td className="px-4 py-3 text-right font-mono text-red-600">
                  {e.max_loss === 0 ? "$0.00" : `-${fmt(Math.abs(e.max_loss), "$")}`}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {e.trades}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
