/**
 * Resolution-based benchmark (no real money).
 * Resolves agent trades against Polymarket outcomes and computes realized PnL.
 */

import { getMarketResolution } from "./polymarket";
import { kvGet, kvSet } from "./kv";

/** Compute realized PnL for a binary trade. Uses price_at_submit when available. */
export function computeTradePnl(
  trade: Record<string, unknown>,
  outcomeYes: number
): number {
  const side = (trade.side as string) || "yes";
  const qty = (trade.qty as number) || 1;
  const priceAtSubmit = trade.price_at_submit;
  // Use real price at submit when available; else use confidence as proxy (legacy)
  const p = priceAtSubmit != null && typeof priceAtSubmit === "number"
    ? priceAtSubmit
    : (trade.confidence as number) ?? 0.5;

  if (side === "yes") {
    return (outcomeYes - p) * qty;
  }
  // NO: payout (1 - outcomeYes), cost (1 - p)
  return (p - outcomeYes) * qty;
}

/**
 * Resolve a single trade: fetch market resolution, compute pnl_realized, update KV.
 * Idempotent: if trade already resolved, skips.
 */
export async function resolveTrade(
  trade: Record<string, unknown>
): Promise<boolean> {
  if (trade.resolved === true) return false;
  const marketId = trade.market_id;
  if (!marketId || typeof marketId !== "string") return false;

  const { closed, outcomeYes } = await getMarketResolution(marketId);
  if (!closed || outcomeYes === null) return false;

  const pnlRealized = computeTradePnl(trade, outcomeYes);
  const updated: Record<string, unknown> = {
    ...trade,
    resolved: true,
    outcome_yes: outcomeYes,
    pnl_realized: Math.round(pnlRealized * 100) / 100,
    resolved_at: Math.floor(Date.now() / 1000),
  };

  await kvSet(`trade:${trade.id}`, updated);
  return true;
}

/**
 * Resolve all unresolved trades that reference the given market.
 * Caller passes trade IDs; we load, resolve, and update. Returns count updated.
 */
export async function resolveTradesForMarket(
  tradeIds: string[],
  marketId: string
): Promise<number> {
  const { closed, outcomeYes } = await getMarketResolution(marketId);
  if (!closed || outcomeYes === null) return 0;

  let updated = 0;
  for (const tid of tradeIds) {
    const trade = await kvGet<Record<string, unknown>>(`trade:${tid}`);
    if (!trade || trade.resolved === true || trade.market_id !== marketId)
      continue;

    const pnlRealized = computeTradePnl(trade, outcomeYes);
    const resolvedTrade: Record<string, unknown> = {
      ...trade,
      resolved: true,
      outcome_yes: outcomeYes,
      pnl_realized: Math.round(pnlRealized * 100) / 100,
      resolved_at: Math.floor(Date.now() / 1000),
    };
    await kvSet(`trade:${tid}`, resolvedTrade);
    updated++;
  }
  return updated;
}
