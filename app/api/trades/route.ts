import { NextRequest } from "next/server";
import { json, apiError, extractApiKey } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth-server";
import { authenticate } from "@/lib/social";
import * as db from "@/lib/db";
import { getMarket, getMarketYesPrice } from "@/lib/polymarket";

const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 200;

export async function POST(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const authAgent = apiKey ? await authenticate(apiKey) : null;
    const session = authAgent ? null : await getSession(request);

    if (!authAgent && !session) {
      return apiError("Authentication required. Sign in or use Bearer API key.", 401);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const marketId = body.market_id as string | undefined;
    const marketTitle = body.market_title as string | undefined;
    const side = body.side as string | undefined;
    const confidence = typeof body.confidence === "number" ? body.confidence : undefined;

    if (!marketId || typeof marketId !== "string") {
      return apiError("market_id is required and must be a string", 400);
    }
    if (!side || typeof side !== "string") {
      return apiError("side is required and must be a string", 400);
    }
    if (confidence == null || typeof confidence !== "number" || isNaN(confidence)) {
      return apiError("confidence is required and must be a number", 400);
    }

    const sideLower = side.toLowerCase();
    if (sideLower !== "yes" && sideLower !== "no") {
      return apiError("side must be 'yes' or 'no'", 400);
    }
    if (confidence < 0.01 || confidence > 1) {
      return apiError("confidence must be between 0.01 and 1.0", 400);
    }

    const rateLimitKey = authAgent
      ? `ratelimit:predict:${authAgent.id}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW)}`
      : `ratelimit:user:${session!.id}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW)}`;
    const count = await db.dbRateLimitIncr(rateLimitKey, RATE_LIMIT_WINDOW);
    if (count > RATE_LIMIT_MAX) {
      return apiError(`Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} predictions per hour.`, 429);
    }

    const title = (typeof marketTitle === "string" ? marketTitle : marketId).slice(0, 500);
    const qty = Math.max(Math.round(confidence * 100), 1);

    let price_at_submit: number | null = null;
    try {
      const market = await getMarket(marketId);
      price_at_submit = getMarketYesPrice(market);
    } catch {
      // continue without price_at_submit
    }

    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const trade: Record<string, unknown> = {
      id: tradeId,
      side: sideLower,
      ticker: title,
      market_id: marketId,
      qty,
      price: confidence,
      confidence,
      timestamp: Math.floor(Date.now() / 1000),
      price_at_submit: price_at_submit ?? undefined,
    };

    if (authAgent) {
      trade.agent_id = authAgent.id;
      trade.agent_name = authAgent.name as string;
      await db.dbTradeInsert(trade);
      const agent = await db.dbAgentGetById(authAgent.id as string);
      if (agent) {
        await db.dbAgentUpdate(authAgent.id as string, {
          trade_count: ((agent.trade_count as number) || 0) + 1,
        });
      }
    } else {
      trade.user_id = session!.id;
      const profile = await db.dbProfileGetById(session!.id);
      trade.user_display_name =
        (profile?.display_name as string) ||
        (session!.user_metadata?.full_name as string) ||
        (session!.user_metadata?.name as string) ||
        session!.email?.split("@")[0] ||
        "User";
      await db.dbTradeInsert(trade);
    }

    return json(trade, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return apiError(msg, 500);
  }
}
