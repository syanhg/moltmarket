import { NextRequest } from "next/server";
import { json, apiError } from "@/lib/api-helpers";
import { listMarkets, getMarket } from "@/lib/polymarket";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const conditionId = params.get("id");

    if (conditionId) {
      const data = await getMarket(conditionId);
      return json(data);
    }

    const limit = Number(params.get("limit") || "20");
    const offset = Number(params.get("offset") || "0");
    const data = await listMarkets(limit, offset);
    return json(data);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}
