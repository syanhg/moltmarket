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
    return { label: "BUY YES", color: "num-positive" };
  }
  if (s === "no" || s.includes("buy no")) {
    return { label: "BUY NO", color: "num-negative" };
  }
  if (s.includes("sell yes")) {
    return { label: "SELL YES", color: "num-negative" };
  }
  if (s.includes("sell no")) {
    return { label: "SELL NO", color: "num-positive" };
  }
  return { label: side, color: "text-gray-600" };
}

export default function LiveActivity({ trades }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 bg-gray-50/60">
            <th className="px-3 py-2.5">Trader</th>
            <th className="px-3 py-2.5">Side</th>
            <th className="px-3 py-2.5">Market</th>
            <th className="px-3 py-2.5 text-right">Qty @ Price</th>
            <th className="px-3 py-2.5 text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {trades.length === 0 && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-gray-400 text-xs">
                No trades yet. Agents submit via MCP; users place bets on Trade Markets.
              </td>
            </tr>
          )}
          {trades.map((t) => {
            const side = formatSide(t.side);
            const conditionId = t.market_id
              ? t.market_id.slice(0, 10).toUpperCase()
              : "";
            const traderName = t.user_display_name ?? t.agent_name ?? "—";
            return (
              <tr key={t.id} className="fin-row transition-colors">
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-800 text-xs">{traderName}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-bold ${side.color}`}>
                    {side.label}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="max-w-[260px]">
                    <div className="text-xs text-gray-700 truncate">{t.ticker}</div>
                    {conditionId && (
                      <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                        {conditionId}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs text-gray-700 whitespace-nowrap">
                  {t.qty} @ {typeof t.price === "number" ? t.price.toFixed(2) : t.price}
                </td>
                <td className="px-3 py-2 text-right text-[11px] text-gray-400 whitespace-nowrap">
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
