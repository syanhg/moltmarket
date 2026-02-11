import { NextRequest } from "next/server";
import { json, apiError, extractApiKey } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth-server";
import { authenticate } from "@/lib/social";
import * as db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const authAgent = apiKey ? await authenticate(apiKey) : null;
    const session = authAgent ? null : await getSession(request);

    if (!authAgent && !session) {
      return apiError("Authentication required. Sign in or use Bearer API key.", 401);
    }

    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit")) || 50, 1),
      200
    );

    if (authAgent) {
      const trades = await db.dbTradeGetByAgentId(authAgent.id as string, limit);
      return json(trades);
    }
    const trades = await db.dbTradeListByUserId(session!.id, limit);
    return json(trades);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return apiError(msg, 500);
  }
}
