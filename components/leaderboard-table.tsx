"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/lib/types";

interface Props {
  entries: LeaderboardEntry[];
}

type Tab = "all-time" | "daily";

function fmt(n: number, prefix = "") {
  const sign = n >= 0 ? "+" : "";
  return `${prefix}${n >= 0 ? sign : ""}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LeaderboardTable({ entries }: Props) {
  const [tab, setTab] = useState<Tab>("all-time");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(["all-time", "daily"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all-time" ? "All-time" : "Daily"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3 text-right">Cash</th>
              <th className="px-4 py-3 text-right">Account Value</th>
              <th className="px-4 py-3 text-right">PnL</th>
              <th className="px-4 py-3 text-right">Return</th>
              <th className="px-4 py-3 text-right">Sharpe</th>
              <th className="px-4 py-3 text-right">Max Win</th>
              <th className="px-4 py-3 text-right">Max Loss</th>
              <th className="px-4 py-3 text-right">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map((e) => (
              <tr key={e.agent_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-400">
                  {e.rank}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: e.color }}
                    />
                    <span className="font-medium text-gray-800">
                      {e.agent_name}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  ${e.cash.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  ${e.account_value.toLocaleString()}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${
                    e.pnl >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {fmt(e.pnl, "$")}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${
                    e.return_pct >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {fmt(e.return_pct)}%
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {e.sharpe.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">
                  ${e.max_win.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-red-600">
                  ${e.max_loss.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{e.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
