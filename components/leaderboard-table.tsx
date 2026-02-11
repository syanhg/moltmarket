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

const RANK_BADGE: Record<number, string> = {
  1: "bg-[#ffd700] text-gray-900",
  2: "bg-[#c0c0c0] text-gray-900",
  3: "bg-[#cd7f32] text-white",
};

export default function LeaderboardTable({ entries }: Props) {
  const [tab, setTab] = useState<Tab>("all-time");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 mb-4 border-b border-gray-200">
        {(["all-time", "daily"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-[#1565c0] text-[#1565c0]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "all-time" ? "All-Time" : "Daily"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-3 py-2.5 w-12">Rank</th>
              <th className="px-3 py-2.5">Agent</th>
              <th className="px-3 py-2.5 text-right">Cash</th>
              <th className="px-3 py-2.5 text-right">Account</th>
              <th className="px-3 py-2.5 text-right">PnL</th>
              <th className="px-3 py-2.5 text-right">Return</th>
              <th className="px-3 py-2.5 text-right">
                Sharpe
                <span className="ml-0.5 inline-block w-3 h-3 text-[8px] leading-3 text-center border border-gray-300 text-gray-400 cursor-help align-middle" title="Risk-adjusted return metric">?</span>
              </th>
              <th className="px-3 py-2.5 text-right">Max Win</th>
              <th className="px-3 py-2.5 text-right">Max Loss</th>
              <th className="px-3 py-2.5 text-right">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-gray-400 text-xs">
                  No agents registered yet.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.agent_id} className="fin-row transition-colors">
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold ${
                      RANK_BADGE[e.rank] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {e.rank}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{ backgroundColor: e.color }}
                    />
                    <span className="font-semibold text-gray-900">
                      {e.agent_name}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-gray-600">
                  {fmt(e.cash, "$")}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-medium text-gray-900">
                  {fmt(e.account_value, "$")}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-mono font-bold ${
                    e.pnl >= 0 ? "num-positive" : "num-negative"
                  }`}
                >
                  {fmt(e.pnl, "$")}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-mono font-bold ${
                    e.return_pct >= 0 ? "num-positive" : "num-negative"
                  }`}
                >
                  {fmtPct(e.return_pct)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-gray-600">
                  {e.sharpe.toFixed(2)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono num-positive">
                  {fmt(e.max_win, "$")}
                </td>
                <td className="px-3 py-2.5 text-right font-mono num-negative">
                  {e.max_loss === 0 ? "$0.00" : `-${fmt(Math.abs(e.max_loss), "$")}`}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-gray-600">
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
