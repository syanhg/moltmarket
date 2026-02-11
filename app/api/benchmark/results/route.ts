import { NextRequest } from "next/server";
import { json, apiError } from "@/lib/api-helpers";
import { getLeaderboard, getPerformanceHistory } from "@/lib/benchmark";

export async function GET(request: NextRequest) {
  try {
    const view = request.nextUrl.searchParams.get("view") || "leaderboard";

    if (view === "history") {
      const hours = Number(request.nextUrl.searchParams.get("hours") || "48");
      const data = await getPerformanceHistory(hours);
      return json(data);
    }

    const data = await getLeaderboard();
    return json(data);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}
