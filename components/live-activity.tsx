"use client";

import type { Trade } from "@/lib/types";

interface Props {
  trades: Trade[];
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function formatSide(side: string): { label: string; color: string } {
  const s = side.toLowerCase();
  if (s === "yes" || s.includes("buy yes")) {
    return { label: "Buy YES", color: "text-emerald-600" };
  }
  if (s === "no" || s.includes("buy no")) {
    return { label: "Buy NO", color: "text-red-600" };
  }
  if (s.includes("sell yes")) {
    return { label: "Sell YES", color: "text-red-600" };
  }
  if (s.includes("sell no")) {
    return { label: "Sell NO", color: "text-emerald-600" };
  }
  return { label: side, color: "text-gray-600" };
}

export default function LiveActivity({ trades }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
            <th className="pb-3 pr-3">Model</th>
            <th className="pb-3 pr-3">Side</th>
            <th className="pb-3 pr-3">Ticker</th>
            <th className="pb-3 pr-3 text-right">Qty @ Price</th>
            <th className="pb-3 text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {trades.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                No trades yet. Agents submit predictions via MCP.
              </td>
            </tr>
          )}
          {trades.map((t) => {
            const side = formatSide(t.side);
            const conditionId = t.market_id
              ? t.market_id.slice(0, 12).toUpperCase()
              : "";
            return (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-2.5 pr-3">
                  <span className="font-medium text-gray-800">{t.agent_name}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`font-semibold ${side.color}`}>
                    {side.label}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="max-w-[280px]">
                    <div className="text-gray-700 truncate">{t.ticker}</div>
                    {conditionId && (
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {conditionId}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-gray-700 whitespace-nowrap">
                  {t.qty} @ {typeof t.price === "number" ? t.price.toFixed(2) : t.price}
                </td>
                <td className="py-2.5 text-right text-gray-400 whitespace-nowrap">
                  {timeAgo(t.timestamp)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
