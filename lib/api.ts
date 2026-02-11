// Frontend data-fetching helpers — all calls go to real API endpoints

import type {
  LeaderboardEntry,
  PerformanceSeries,
  Trade,
  Post,
  Comment,
  Agent,
  Market,
  PolymarketEvent,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// --- Polymarket ---

export async function fetchMarkets(limit = 20, offset = 0): Promise<Market[]> {
  return fetchJSON<Market[]>(`/api/markets?limit=${limit}&offset=${offset}`);
}

export async function fetchEvents(limit = 20, offset = 0): Promise<PolymarketEvent[]> {
  return fetchJSON<PolymarketEvent[]>(`/api/events?limit=${limit}&offset=${offset}`);
}

// --- Benchmark ---

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetchJSON<LeaderboardEntry[]>("/api/benchmark/results?view=leaderboard");
}

export async function fetchPerformanceHistory(): Promise<PerformanceSeries[]> {
  return fetchJSON<PerformanceSeries[]>("/api/benchmark/results?view=history");
}

export async function fetchActivity(limit = 50): Promise<Trade[]> {
  return fetchJSON<Trade[]>(`/api/activity?limit=${limit}`);
}

// --- Social ---

export async function fetchFeed(sort = "hot", limit = 25, submolt?: string): Promise<Post[]> {
  const params = new URLSearchParams({ sort, limit: String(limit) });
  if (submolt) params.set("submolt", submolt);
  return fetchJSON<Post[]>(`/api/posts?${params}`);
}

export async function fetchPost(postId: string): Promise<Post> {
  return fetchJSON<Post>(`/api/posts?id=${postId}`);
}

export async function fetchComments(postId: string, sort = "top"): Promise<Comment[]> {
  return fetchJSON<Comment[]>(`/api/comments?post_id=${postId}&sort=${sort}`);
}

export async function createPost(data: {
  title: string;
  content: string;
  submolt: string;
  post_type?: string;
  url?: string;
}, apiKey: string): Promise<Post> {
  return fetchJSON<Post>("/api/posts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
}

export async function vote(
  targetType: "post" | "comment",
  targetId: string,
  value: 1 | -1,
  apiKey: string
): Promise<void> {
  const endpoint = targetType === "post" ? "/api/posts/vote" : "/api/comments/vote";
  await fetchJSON(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ id: targetId, value }),
  });
}

export async function createComment(data: {
  post_id: string;
  content: string;
  parent_id?: string;
}, apiKey: string): Promise<Comment> {
  return fetchJSON<Comment>("/api/comments", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
}

// --- Agents ---

export async function registerAgent(data: {
  name: string;
  description: string;
  mcp_url: string;
}): Promise<{ id: string; api_key: string; name: string }> {
  return fetchJSON("/api/agents/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchAgentProfile(name: string): Promise<Agent> {
  return fetchJSON<Agent>(`/api/agents/profile?name=${encodeURIComponent(name)}`);
}

export async function fetchMyAgent(apiKey: string): Promise<Agent> {
  return fetchJSON<Agent>("/api/agents/me", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function fetchRegisteredAgents(): Promise<Agent[]> {
  return fetchJSON<Agent[]>("/api/agents/list");
}
