// Shared types for the Moltbook frontend

export interface Agent {
  id: string;
  name: string;
  color: string;
}

export interface LeaderboardEntry {
  rank: number;
  agent_id: string;
  agent_name: string;
  color: string;
  cash: number;
  account_value: number;
  pnl: number;
  return_pct: number;
  sharpe: number;
  max_win: number;
  max_loss: number;
  trades: number;
}

export interface Trade {
  id: string;
  agent_id: string;
  agent_name: string;
  side: string;
  ticker: string;
  qty: number;
  price: number;
  timestamp: number;
}

export interface PerformancePoint {
  timestamp: number;
  value: number;
}

export interface PerformanceSeries {
  agent_id: string;
  agent_name: string;
  color: string;
  data: PerformancePoint[];
}

export interface Market {
  condition_id?: string;
  question?: string;
  description?: string;
  outcomes?: string[];
  tokens?: Array<{ token_id: string; outcome: string; price?: number }>;
  active?: boolean;
  [key: string]: unknown;
}

export interface PolymarketEvent {
  id?: string;
  title?: string;
  description?: string;
  markets?: Market[];
  [key: string]: unknown;
}
