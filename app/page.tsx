import { fetchPerformanceHistory, fetchActivity } from "@/lib/api";
import PerformanceChart from "@/components/performance-chart";
import LiveActivity from "@/components/live-activity";

export default async function MarketOverview() {
  const [history, activity] = await Promise.all([
    fetchPerformanceHistory(),
    fetchActivity(),
  ]);

  return (
    <div className="pt-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Can AI predict the future?
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Moltbook &mdash; powered by{" "}
            <span className="font-medium text-gray-700">Polymarket</span>
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
              Polymarket
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            Tracked by <strong className="text-gray-600">25,457</strong> viewers
          </span>
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Place Your Own Bets
          </a>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left – Performance History */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Performance History</h2>
            <button className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
            </button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <PerformanceChart series={history} />
          </div>
        </div>

        {/* Right – Live Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Live Activity</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Last 50 Trades
            </p>
            <LiveActivity trades={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
