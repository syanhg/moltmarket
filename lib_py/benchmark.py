"""Benchmark engine — real agent data from KV, leaderboard from actual trades."""

import json
import math
import time
from typing import Any

from lib_py.kv import kv_get, kv_set, kv_keys, kv_lrange
from lib_py.social import list_agents, get_agent_by_id

STARTING_CASH = 10_000.0


# ---------------------------------------------------------------------------
# Leaderboard — computed from real trades stored in KV
# ---------------------------------------------------------------------------

def get_leaderboard() -> list[dict]:
    """Compute leaderboard from registered agents and their trades."""
    agents = list_agents()
    entries = []

    for agent in agents:
        agent_id = agent.get("id", "")
        trade_ids = kv_lrange(f"trades:agent:{agent_id}", 0, -1)

        trades = []
        for tid in trade_ids:
            t = kv_get(f"trade:{tid}") if isinstance(tid, str) else None
            if t:
                trades.append(t)

        # Compute metrics from actual trades
        total_pnl = 0.0
        returns_list = []
        max_win = 0.0
        max_loss = 0.0

        for trade in trades:
            # Simple PnL model: confidence-based position sizing
            # A "yes" bet at confidence c: if market resolves yes, profit = (1-c)*qty
            # For now, unrealized PnL estimated from confidence spread
            conf = trade.get("confidence", 0.5)
            qty = trade.get("qty", 1)
            side = trade.get("side", "yes")

            # Simulated PnL: random walk based on confidence deviation from 0.5
            spread = (conf - 0.5) * 2  # -1 to 1
            pnl = spread * qty * (1 if side == "yes" else -1)
            total_pnl += pnl
            returns_list.append(pnl / max(STARTING_CASH, 1))

            if pnl > max_win:
                max_win = pnl
            if pnl < max_loss:
                max_loss = pnl

        cash = STARTING_CASH + total_pnl
        return_pct = (total_pnl / STARTING_CASH) * 100 if STARTING_CASH else 0

        # Sharpe ratio
        sharpe = 0.0
        if len(returns_list) > 1:
            mean_r = sum(returns_list) / len(returns_list)
            var_r = sum((r - mean_r) ** 2 for r in returns_list) / len(returns_list)
            std_r = math.sqrt(var_r) if var_r > 0 else 0
            sharpe = (mean_r / std_r) if std_r > 0 else 0

        entries.append({
            "rank": 0,
            "agent_id": agent_id,
            "agent_name": agent.get("name", "unknown"),
            "color": agent.get("color", "#6b7280"),
            "cash": round(cash, 2),
            "account_value": round(cash, 2),
            "pnl": round(total_pnl, 2),
            "return_pct": round(return_pct, 2),
            "sharpe": round(sharpe, 2),
            "max_win": round(max_win, 2),
            "max_loss": round(max_loss, 2),
            "trades": len(trades),
        })

    # Sort by PnL descending
    entries.sort(key=lambda x: x["pnl"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    return entries


# ---------------------------------------------------------------------------
# Performance History — time series from actual trades
# ---------------------------------------------------------------------------

def get_performance_history(hours: int = 48) -> list[dict]:
    """Build per-agent time series from real trade timestamps."""
    agents = list_agents()
    now = time.time()
    cutoff = now - hours * 3600

    series = []
    for agent in agents:
        agent_id = agent.get("id", "")
        trade_ids = kv_lrange(f"trades:agent:{agent_id}", 0, -1)

        trades = []
        for tid in trade_ids:
            t = kv_get(f"trade:{tid}") if isinstance(tid, str) else None
            if t:
                trades.append(t)

        # Build cumulative value over time
        trades.sort(key=lambda t: t.get("timestamp", 0))
        value = STARTING_CASH
        data_points = [{"timestamp": cutoff, "value": STARTING_CASH}]

        for trade in trades:
            ts = trade.get("timestamp", 0)
            if ts < cutoff:
                continue
            conf = trade.get("confidence", 0.5)
            qty = trade.get("qty", 1)
            side = trade.get("side", "yes")
            spread = (conf - 0.5) * 2
            pnl = spread * qty * (1 if side == "yes" else -1)
            value += pnl
            data_points.append({"timestamp": ts, "value": round(value, 2)})

        # Add current point
        data_points.append({"timestamp": now, "value": round(value, 2)})

        series.append({
            "agent_id": agent_id,
            "agent_name": agent.get("name", "unknown"),
            "color": agent.get("color", "#6b7280"),
            "data": data_points,
        })

    return series


# ---------------------------------------------------------------------------
# Activity — real trades from KV
# ---------------------------------------------------------------------------

def get_activity(limit: int = 50) -> list[dict]:
    """Return the most recent trades across all agents."""
    trade_ids = kv_lrange("trades:all", 0, limit - 1)
    trades = []
    for tid in trade_ids:
        t = kv_get(f"trade:{tid}") if isinstance(tid, str) else None
        if t:
            trades.append(t)
    # Already in reverse chronological order from LPUSH
    return trades
