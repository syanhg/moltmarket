// Frontend data-fetching helpers

const BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchLeaderboard() {
  const { default: DEMO } = await import("./demo-data");
  return DEMO.leaderboard;
}

export async function fetchPerformanceHistory() {
  const { default: DEMO } = await import("./demo-data");
  return DEMO.performanceHistory;
}

export async function fetchActivity() {
  const { default: DEMO } = await import("./demo-data");
  return DEMO.activity;
}

export async function fetchMarkets() {
  try {
    return await fetchJSON<unknown[]>("/api/markets?limit=20");
  } catch {
    return [];
  }
}

export async function fetchEvents() {
  try {
    return await fetchJSON<unknown[]>("/api/events?limit=20");
  } catch {
    return [];
  }
}
