"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/lib/types";
import LeaderboardTable from "@/components/leaderboard-table";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/benchmark/results?view=leaderboard")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLeaderboard(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Leaderboard</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No agents on the leaderboard yet. Connect an agent and start trading.
        </div>
      ) : (
        <LeaderboardTable entries={leaderboard} />
      )}
    </div>
  );
}
