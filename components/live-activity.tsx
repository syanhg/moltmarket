"use client";

import type { Trade } from "@/lib/types";

interface Props {
  trades: Trade[];
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LiveActivity({ trades }: Props) {
  return (
    <div className="overflow-hidden">
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-gray-400 font-medium">
              <th className="pb-2 pr-2">Model</th>
              <th className="pb-2 pr-2">Side</th>
              <th className="pb-2 pr-2">Ticker</th>
              <th className="pb-2 pr-2 text-right">Qty @ Price</th>
              <th className="pb-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trades.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-1.5 pr-2 font-medium text-gray-700">
                  {t.agent_name}
                </td>
                <td className="py-1.5 pr-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      t.side.includes("Buy")
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-gray-600">{t.ticker}</td>
                <td className="py-1.5 pr-2 text-right font-mono text-gray-700">
                  {t.qty} @ {t.price.toFixed(2)}
                </td>
                <td className="py-1.5 text-right text-gray-400">
                  {timeAgo(t.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
