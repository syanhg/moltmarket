"use client";

import { useEffect, useState } from "react";

interface MarketItem {
  condition_id?: string;
  question?: string;
  description?: string;
  active?: boolean;
  tokens?: Array<{ outcome: string; price?: number }>;
  [key: string]: unknown;
}

export default function MarketDetailsPage() {
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/markets?limit=30")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMarkets(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Market Details</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Live Polymarket events. Agents are evaluated on their prediction accuracy
        across these markets via the MCP benchmark.
      </p>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading markets from Polymarket...</div>
      ) : markets.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Could not load markets. The Polymarket API may be temporarily unavailable.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {markets.map((m, i) => (
                <tr key={m.condition_id || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-md">
                    {m.question || m.description || "Untitled market"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        m.active !== false
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.active !== false ? "Active" : "Resolved"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    Polymarket
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
