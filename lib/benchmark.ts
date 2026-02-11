/**
 * Benchmark engine — leaderboard, performance history, activity.
 * Uses resolution-based PnL when available (Polymarket outcome); else simulated.
 * No real money: simulated $10k per agent, real prices and outcomes for scoring.
 */

import * as db from "./db";
import { listAgents } from "./social";
import { getMarketResolution } from "./polymarket";
import { computeTradePnl } from "./resolution";

const STARTING_CASH = 10_000;

/** Single-trade PnL: use pnl_realized if resolved, else legacy simulated formula. */
function tradePnl(trade: Record<string, unknown>): number {
  if (trade.resolved === true && trade.pnl_realized != null)
    return trade.pnl_realized as number;
  const conf = (trade.confidence as number) || 0.5;
  const qty = (trade.qty as number) || 1;
  const side = (trade.side as string) || "yes";
  const spread = (conf - 0.5) * 2;
  return spread * qty * (side === "yes" ? 1 : -1);
}

/**
 * Lazy resolution: for unresolved trades with market_id, fetch Polymarket resolution,
 * compute pnl_realized, update trade in KV and mutate in-memory.
 */
async function resolveUnresolvedTrades(
  marketToTrades: Map<string, Record<string, unknown>[]>
): Promise<void> {
  for (const [marketId, trades] of marketToTrades) {
    const { closed, outcomeYes } = await getMarketResolution(marketId);
    if (!closed || outcomeYes === null) continue;

    for (const trade of trades) {
      if (trade.resolved === true) continue;
      const pnlRealized = computeTradePnl(trade, outcomeYes);
      trade.resolved = true;
      trade.outcome_yes = outcomeYes;
      trade.pnl_realized = Math.round(pnlRealized * 100) / 100;
      trade.resolved_at = Math.floor(Date.now() / 1000);
      await db.dbTradeUpdate(trade.id as string, {
        resolved: true,
        outcome_yes: outcomeYes,
        pnl_realized: trade.pnl_realized,
        resolved_at: trade.resolved_at,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export async function getLeaderboard(): Promise<Record<string, unknown>[]> {
  const agents = await listAgents();
  const allTradesByAgent: Record<string, Record<string, unknown>[]> = {};
  const marketToTrades = new Map<string, Record<string, unknown>[]>();

  for (const agent of agents) {
    const agentId = (agent.id as string) || "";
    const trades = await db.dbTradeListByAgentId(agentId);

    for (const t of trades) {
      const mid = t.market_id as string | undefined;
      if (mid && t.resolved !== true) {
        const list = marketToTrades.get(mid) ?? [];
        list.push(t);
        marketToTrades.set(mid, list);
      }
    }

    allTradesByAgent[agentId] = trades;
  }

  await resolveUnresolvedTrades(marketToTrades);

  const entries: Record<string, unknown>[] = [];

  for (const agent of agents) {
    const agentId = (agent.id as string) || "";
    const trades = allTradesByAgent[agentId] ?? [];

    let totalPnl = 0;
    const returnsList: number[] = [];
    let maxWin = 0;
    let maxLoss = 0;

    for (const trade of trades) {
      const pnl = tradePnl(trade);
      totalPnl += pnl;
      returnsList.push(pnl / Math.max(STARTING_CASH, 1));
      if (pnl > maxWin) maxWin = pnl;
      if (pnl < maxLoss) maxLoss = pnl;
    }

    const cash = STARTING_CASH + totalPnl;
    const returnPct = (totalPnl / STARTING_CASH) * 100;

    let sharpe = 0;
    if (returnsList.length > 1) {
      const meanR = returnsList.reduce((a, b) => a + b, 0) / returnsList.length;
      const varR =
        returnsList.reduce((a, r) => a + (r - meanR) ** 2, 0) / returnsList.length;
      const stdR = Math.sqrt(varR);
      sharpe = stdR > 0 ? meanR / stdR : 0;
    }

    entries.push({
      rank: 0,
      agent_id: agentId,
      agent_name: agent.name || "unknown",
      color: agent.color || "#6b7280",
      cash: Math.round(cash * 100) / 100,
      account_value: Math.round(cash * 100) / 100,
      pnl: Math.round(totalPnl * 100) / 100,
      return_pct: Math.round(returnPct * 100) / 100,
      sharpe: Math.round(sharpe * 100) / 100,
      max_win: Math.round(maxWin * 100) / 100,
      max_loss: Math.round(maxLoss * 100) / 100,
      trades: trades.length,
    });
  }

  entries.sort((a, b) => ((b.pnl as number) || 0) - ((a.pnl as number) || 0));
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Performance History
// ---------------------------------------------------------------------------

export async function getPerformanceHistory(
  hours = 48
): Promise<Record<string, unknown>[]> {
  const agents = await listAgents();
  const now = Date.now() / 1000;
  const cutoff = now - hours * 3600;

  const series: Record<string, unknown>[] = [];

  for (const agent of agents) {
    const agentId = (agent.id as string) || "";
    const trades = await db.dbTradeListByAgentId(agentId);

    trades.sort(
      (a, b) => ((a.timestamp as number) || 0) - ((b.timestamp as number) || 0)
    );

    let value = STARTING_CASH;
    const dataPoints: { timestamp: number; value: number }[] = [
      { timestamp: cutoff, value: STARTING_CASH },
    ];

    for (const trade of trades) {
      const ts = (trade.timestamp as number) || 0;
      if (ts < cutoff) continue;
      const pnl = tradePnl(trade);
      value += pnl;
      dataPoints.push({ timestamp: ts, value: Math.round(value * 100) / 100 });
    }

    dataPoints.push({ timestamp: now, value: Math.round(value * 100) / 100 });

    series.push({
      agent_id: agentId,
      agent_name: agent.name || "unknown",
      color: agent.color || "#6b7280",
      data: dataPoints,
    });
  }

  return series;
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export async function getActivity(
  limit = 50
): Promise<Record<string, unknown>[]> {
  return db.dbTradeGetAll(limit);
}
