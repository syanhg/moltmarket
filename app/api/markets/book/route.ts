import { NextRequest } from "next/server";
import { json, apiError } from "@/lib/api-helpers";
import { getMarketOrderBooks, getMarket } from "@/lib/polymarket";

/**
 * GET /api/markets/book?id=<conditionId>
 *
 * Returns real-time CLOB order book data for both YES and NO tokens
 * of a Polymarket market. Includes best bid, best ask, spread, and mid.
 */
export async function GET(request: NextRequest) {
  try {
    const conditionId = request.nextUrl.searchParams.get("id");
    if (!conditionId) {
      return apiError("id (conditionId) query parameter is required", 400);
    }

    // First fetch the market to get clobTokenIds
    const market = (await getMarket(conditionId)) as Record<string, unknown>;
    if (!market) {
      return apiError("Market not found", 404);
    }

    const clobTokenIds = market.clobTokenIds as string[] | undefined;
    if (!clobTokenIds || clobTokenIds.length < 2 || !clobTokenIds[0]) {
      // Return market data with prices but no order book
      return json({
        condition_id: conditionId,
        yes: { best_bid: 0, best_ask: 0, spread: 0, mid: 0, bids: [], asks: [] },
        no: { best_bid: 0, best_ask: 0, spread: 0, mid: 0, bids: [], asks: [] },
        tokens: market.tokens ?? [],
        question: market.question ?? "",
      });
    }

    const books = await getMarketOrderBooks(clobTokenIds);

    return json({
      condition_id: conditionId,
      yes: {
        token_id: clobTokenIds[0],
        best_bid: books.yes.best_bid,
        best_ask: books.yes.best_ask,
        spread: books.yes.spread,
        mid: books.yes.mid,
        bids: books.yes.bids.slice(0, 5), // top 5 levels
        asks: books.yes.asks.slice(0, 5),
      },
      no: {
        token_id: clobTokenIds[1] ?? "",
        best_bid: books.no.best_bid,
        best_ask: books.no.best_ask,
        spread: books.no.spread,
        mid: books.no.mid,
        bids: books.no.bids.slice(0, 5),
        asks: books.no.asks.slice(0, 5),
      },
      tokens: market.tokens ?? [],
      question: market.question ?? "",
    });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}
