"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Performance {
  cash: number;
  account_value: number;
  pnl: number;
  return_pct: number;
  sharpe: number;
  max_win: number;
  max_loss: number;
  trades: Record<string, unknown>[];
  win_rate: number;
  total_trades: number;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ display_name: string } | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login?next=/account");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setUser(data.user);
          setPerformance(data.performance);
        }
      })
      .catch(() => router.replace("/login?next=/account"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">Loading...</div>
    );
  }

  if (!user) return null;

  const perf = performance;
  const fmtMoney = (n: number) =>
    n >= 0 ? `$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to overview
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{user.display_name}</h1>
          <p className="text-xs text-gray-500">Your account — only you see this</p>
        </div>
        <Link
          href="/trade"
          className="px-4 py-2 text-xs font-semibold bg-[#1565c0] text-white rounded hover:bg-[#0d47a1]"
        >
          Trade Markets
        </Link>
      </div>

      {perf && (
        <>
          <div className="fin-card p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Balance</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Cash balance</div>
                <div className="text-lg font-bold font-mono text-gray-900">
                  {fmtMoney(perf.cash)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Account value</div>
                <div className="text-lg font-bold font-mono text-gray-900">
                  {fmtMoney(perf.account_value)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Total PnL</div>
                <div
                  className={`text-lg font-bold font-mono ${
                    perf.pnl >= 0 ? "num-positive" : "num-negative"
                  }`}
                >
                  {fmtMoney(perf.pnl)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Return</div>
                <div
                  className={`text-lg font-bold font-mono ${
                    perf.return_pct >= 0 ? "num-positive" : "num-negative"
                  }`}
                >
                  {perf.return_pct >= 0 ? "+" : ""}
                  {perf.return_pct.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <div className="fin-card p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Performance</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Win rate</div>
                <div className="text-sm font-bold font-mono text-gray-900">
                  {perf.win_rate.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Total trades</div>
                <div className="text-sm font-bold font-mono text-gray-900">
                  {perf.total_trades}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Sharpe ratio</div>
                <div className="text-sm font-bold font-mono text-gray-900">
                  {perf.sharpe.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Max drawdown</div>
                <div className="text-sm font-bold font-mono num-negative">
                  {perf.max_loss <= 0 ? `${perf.max_loss.toFixed(2)}` : "0.00"}
                </div>
              </div>
            </div>
          </div>

          <div className="fin-card p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Recent trades</h2>
            {perf.trades.length === 0 ? (
              <p className="text-xs text-gray-500 py-4">
                No trades yet. <Link href="/trade" className="text-[#1565c0] hover:underline">Place a bet</Link>.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-[10px] font-semibold text-gray-400 uppercase">
                      <th className="py-2 pr-2">Market</th>
                      <th className="py-2 pr-2">Side</th>
                      <th className="py-2 pr-2">Conf.</th>
                      <th className="py-2 pr-2">PnL</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {perf.trades.slice(0, 30).map((t) => (
                      <tr key={(t.id as string) ?? Math.random()}>
                        <td className="py-2 pr-2 truncate max-w-[200px]" title={(t.ticker as string) ?? ""}>
                          {(t.ticker as string) ?? "-"}
                        </td>
                        <td className="py-2 pr-2 font-medium">
                          {(t.side as string)?.toUpperCase() ?? "-"}
                        </td>
                        <td className="py-2 pr-2 font-mono">
                          {typeof t.confidence === "number"
                            ? `${(t.confidence * 100).toFixed(0)}%`
                            : "-"}
                        </td>
                        <td
                          className={`py-2 pr-2 font-mono ${
                            (t.pnl_realized as number) >= 0 ? "num-positive" : "num-negative"
                          }`}
                        >
                          {t.resolved && t.pnl_realized != null
                            ? `$${(t.pnl_realized as number).toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="py-2">
                          {t.resolved ? (
                            <span className="text-gray-500">Settled</span>
                          ) : (
                            <span className="text-amber-600">Open</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!perf && user && (
        <div className="fin-card p-5">
          <p className="text-sm text-gray-600">Loading performance…</p>
        </div>
      )}
    </div>
  );
}
