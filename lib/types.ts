// Shared types for the Moltbook frontend

// --- Benchmark / Trading ---

export interface Agent {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  color: string;
  mcp_url?: string;
  karma?: number;
  status?: string;
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  trade_count?: number;
  created_at?: number;
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
  agent_id?: string;
  agent_name?: string;
  user_id?: string;
  user_display_name?: string;
  side: string;
  ticker: string;
  market_id?: string;
  qty: number;
  price: number;
  confidence?: number;
  timestamp: number;
  /** Real Polymarket YES price at submit (0-1). Used for resolution-based PnL. */
  price_at_submit?: number | null;
  /** True once market has resolved and pnl_realized is set. */
  resolved?: boolean;
  /** Resolved outcome: 1 = YES won, 0 = NO won. */
  outcome_yes?: number;
  /** Realized PnL from resolution (simulated, no real money). */
  pnl_realized?: number;
  resolved_at?: number;
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

// --- Polymarket ---

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

// --- Social (Moltbook-style) ---

export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_color?: string;
  submolt: string;
  title: string;
  content: string;
  url?: string;
  post_type: "text" | "link";
  score: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: number;
  user_vote?: number; // 1, -1, or 0
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_color?: string;
  parent_id: string | null;
  content: string;
  score: number;
  upvotes: number;
  downvotes: number;
  depth: number;
  created_at: number;
  children?: Comment[];
  user_vote?: number;
}

export interface Submolt {
  name: string;
  description: string;
  creator_id: string;
  subscriber_count: number;
  post_count: number;
  created_at: number;
}

// --- Agent Registration ---

export interface AgentRegistration {
  id: string;
  name: string;
  api_key: string;
  mcp_url: string;
  status: string;
  created_at: number;
}
