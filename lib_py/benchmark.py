"""Benchmark engine – run AI agents against prediction markets and score them."""

import json
import math
import os
import time
import uuid
from typing import Any

# ---------------------------------------------------------------------------
# In-memory store (replace with Vercel KV / Blob / external DB in production)
# ---------------------------------------------------------------------------

_runs: dict[str, dict] = {}
_trades: list[dict] = []
_leaderboard: list[dict] = []

STARTING_CASH = 10_000.0

# ---------------------------------------------------------------------------
# Seed data – demo agents with synthetic performance
# ---------------------------------------------------------------------------

DEMO_AGENTS = [
    {"id": "gpt-5.2", "name": "GPT 5.2", "color": "#10b981"},
    {"id": "gemini-3-pro", "name": "Gemini 3 Pro", "color": "#3b82f6"},
    {"id": "claude-opus-4.5", "name": "Claude Opus 4.5", "color": "#ef4444"},
    {"id": "grok-4.1", "name": "Grok 4.1", "color": "#f59e0b"},
    {"id": "glm-4.7", "name": "GLM 4.7", "color": "#8b5cf6"},
    {"id": "human-baseline", "name": "Human Baseline", "color": "#6b7280"},
]


def _seed_demo_data() -> None:
    """Generate synthetic leaderboard and trade history for demo."""
    import random
    random.seed(42)

    now = time.time()

    for i, agent in enumerate(DEMO_AGENTS):
        pnl = round(random.uniform(-2000, 3000), 2)
        cash = round(STARTING_CASH + pnl, 2)
        trades_count = random.randint(20, 150)
        returns = round(pnl / STARTING_CASH * 100, 2)
        sharpe = round(random.uniform(-0.5, 2.5), 2)
        max_win = round(random.uniform(100, 800), 2)
        max_loss = round(random.uniform(-800, -50), 2)

        _leaderboard.append({
            "rank": i + 1,
            "agent_id": agent["id"],
            "agent_name": agent["name"],
            "color": agent["color"],
            "cash": cash,
            "account_value": cash,
            "pnl": pnl,
            "return_pct": returns,
            "sharpe": sharpe,
            "max_win": max_win,
            "max_loss": max_loss,
            "trades": trades_count,
        })

        # Generate trades
        sides = ["Buy Yes", "Buy No", "Sell Yes", "Sell No"]
        tickers = ["BTC-100K", "ETH-MERGE", "FED-RATE", "TRUMP-2028", "AI-AGI-2027", "MARS-2030"]
        for t in range(min(trades_count, 10)):
            _trades.append({
                "id": str(uuid.uuid4()),
                "agent_id": agent["id"],
                "agent_name": agent["name"],
                "side": random.choice(sides),
                "ticker": random.choice(tickers),
                "qty": random.randint(1, 50),
                "price": round(random.uniform(0.05, 0.95), 2),
                "timestamp": now - random.randint(60, 86400),
            })

    # Sort leaderboard by PnL desc
    _leaderboard.sort(key=lambda x: x["pnl"], reverse=True)
    for i, entry in enumerate(_leaderboard):
        entry["rank"] = i + 1

    # Sort trades by time desc
    _trades.sort(key=lambda x: x["timestamp"], reverse=True)


def _ensure_seeded() -> None:
    if not _leaderboard:
        _seed_demo_data()


# ---------------------------------------------------------------------------
# Time-series for Performance History chart
# ---------------------------------------------------------------------------

def get_performance_history(hours: int = 48) -> list[dict]:
    """Return synthetic time-series data for the Performance History chart."""
    import random
    random.seed(7)

    _ensure_seeded()
    now = time.time()
    points_count = min(hours * 2, 200)  # one point every 30 min
    series: dict[str, list[dict]] = {}

    for agent in DEMO_AGENTS:
        value = STARTING_CASH
        agent_points = []
        for i in range(points_count):
            ts = now - (points_count - i) * 1800
            delta = random.gauss(0, 50)
            value = max(value + delta, STARTING_CASH * 0.5)
            agent_points.append({
                "timestamp": ts,
                "value": round(value, 2),
            })
        series[agent["id"]] = agent_points

    return [
        {
            "agent_id": a["id"],
            "agent_name": a["name"],
            "color": a["color"],
            "data": series[a["id"]],
        }
        for a in DEMO_AGENTS
    ]


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

def get_leaderboard() -> list[dict]:
    _ensure_seeded()
    return _leaderboard


# ---------------------------------------------------------------------------
# Activity (last N trades)
# ---------------------------------------------------------------------------

def get_activity(limit: int = 50) -> list[dict]:
    _ensure_seeded()
    return _trades[:limit]


# ---------------------------------------------------------------------------
# Benchmark run (stub for future real agent invocation)
# ---------------------------------------------------------------------------

def start_run(agent_mcp_url: str, market_ids: list[str] | None = None) -> dict:
    """Start a benchmark run (stub – returns a run id)."""
    run_id = str(uuid.uuid4())
    run = {
        "id": run_id,
        "agent_mcp_url": agent_mcp_url,
        "market_ids": market_ids or [],
        "status": "queued",
        "created_at": time.time(),
    }
    _runs[run_id] = run
    return run


def get_run(run_id: str) -> dict | None:
    return _runs.get(run_id)
