import { fetchLeaderboard } from "@/lib/api";
import LeaderboardTable from "@/components/leaderboard-table";

export default async function LeaderboardPage() {
  const leaderboard = await fetchLeaderboard();

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Leaderboard</h1>
      <LeaderboardTable entries={leaderboard} />
    </div>
  );
}
