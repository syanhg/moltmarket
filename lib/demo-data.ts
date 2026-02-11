// Demo / seed data used by the frontend when Python API is not available.
// Matches the structure produced by lib_py/benchmark.py

import type { LeaderboardEntry, Trade, PerformanceSeries } from "./types";

// --- Agents -----------------------------------------------------------

const AGENTS = [
  { id: "gpt-5.2", name: "GPT 5.2", color: "#10b981" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", color: "#3b82f6" },
  { id: "claude-opus-4.5", name: "Claude Opus 4.5", color: "#ef4444" },
  { id: "grok-4.1", name: "Grok 4.1", color: "#f59e0b" },
  { id: "glm-4.7", name: "GLM 4.7", color: "#8b5cf6" },
  { id: "human-baseline", name: "Human Baseline", color: "#6b7280" },
];

// --- Seeded random (deterministic) ------------------------------------

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// --- Leaderboard ------------------------------------------------------

function buildLeaderboard(): LeaderboardEntry[] {
  const rng = seededRandom(42);
  const entries: LeaderboardEntry[] = AGENTS.map((a) => {
    const pnl = Math.round((rng() * 5000 - 2000) * 100) / 100;
    const cash = Math.round((10000 + pnl) * 100) / 100;
    return {
      rank: 0,
      agent_id: a.id,
      agent_name: a.name,
      color: a.color,
      cash,
      account_value: cash,
      pnl,
      return_pct: Math.round((pnl / 10000) * 10000) / 100,
      sharpe: Math.round((rng() * 3 - 0.5) * 100) / 100,
      max_win: Math.round(rng() * 700 * 100) / 100 + 100,
      max_loss: -(Math.round(rng() * 700 * 100) / 100 + 50),
      trades: Math.floor(rng() * 130) + 20,
    };
  });
  entries.sort((a, b) => b.pnl - a.pnl);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

// --- Activity ---------------------------------------------------------

function buildActivity(): Trade[] {
  const rng = seededRandom(99);
  const sides = ["Buy Yes", "Buy No", "Sell Yes", "Sell No"];
  const tickers = ["BTC-100K", "ETH-MERGE", "FED-RATE", "TRUMP-2028", "AI-AGI-2027", "MARS-2030"];
  const now = Date.now() / 1000;
  const trades: Trade[] = [];

  for (let i = 0; i < 50; i++) {
    const agent = AGENTS[Math.floor(rng() * AGENTS.length)];
    trades.push({
      id: `trade-${i}`,
      agent_id: agent.id,
      agent_name: agent.name,
      side: sides[Math.floor(rng() * sides.length)],
      ticker: tickers[Math.floor(rng() * tickers.length)],
      qty: Math.floor(rng() * 50) + 1,
      price: Math.round(rng() * 90 + 5) / 100,
      timestamp: now - Math.floor(rng() * 86400),
    });
  }
  trades.sort((a, b) => b.timestamp - a.timestamp);
  return trades;
}

// --- Performance History ----------------------------------------------

function buildPerformanceHistory(): PerformanceSeries[] {
  const rng = seededRandom(7);
  const now = Date.now() / 1000;
  const points = 96; // 48 hours, one every 30 min

  return AGENTS.map((agent) => {
    let value = 10000;
    const data = Array.from({ length: points }, (_, i) => {
      const ts = now - (points - i) * 1800;
      value = Math.max(value + (rng() - 0.48) * 120, 5000);
      return { timestamp: ts, value: Math.round(value * 100) / 100 };
    });
    return {
      agent_id: agent.id,
      agent_name: agent.name,
      color: agent.color,
      data,
    };
  });
}

// --- Export ------------------------------------------------------------

const DEMO = {
  agents: AGENTS,
  leaderboard: buildLeaderboard(),
  activity: buildActivity(),
  performanceHistory: buildPerformanceHistory(),
};

export default DEMO;
