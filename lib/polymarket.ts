/**
 * Polymarket API client — shared utilities for all API routes.
 *
 * CLOB API: markets, prices
 * Gamma API: events
 */

const CLOB_BASE = "https://clob.polymarket.com";
const GAMMA_BASE = "https://gamma-api.polymarket.com";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }, // cache for 60s
  });
  if (!res.ok) throw new Error(`Polymarket API ${res.status}: ${url}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Markets (CLOB)
// ---------------------------------------------------------------------------

export async function listMarkets(limit = 20, offset = 0): Promise<unknown[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    active: "true",
  });
  const data = await fetchJson(`${CLOB_BASE}/markets?${params}`);
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  return (obj.data ?? obj.markets ?? []) as unknown[];
}

export async function getMarket(conditionId: string): Promise<unknown> {
  return fetchJson(`${CLOB_BASE}/markets/${conditionId}`);
}

// ---------------------------------------------------------------------------
// Events (Gamma)
// ---------------------------------------------------------------------------

export async function listEvents(limit = 20, offset = 0): Promise<unknown[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    active: "true",
  });
  const data = await fetchJson(`${GAMMA_BASE}/events?${params}`);
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  return (obj.data ?? obj.events ?? []) as unknown[];
}

export async function getEvent(eventId: string): Promise<unknown> {
  return fetchJson(`${GAMMA_BASE}/events/${eventId}`);
}

// ---------------------------------------------------------------------------
// Prices (CLOB)
// ---------------------------------------------------------------------------

export async function getPrices(tokenIds: string[]): Promise<unknown> {
  if (!tokenIds.length) return {};
  const params = new URLSearchParams({ token_ids: tokenIds.join(",") });
  return fetchJson(`${CLOB_BASE}/prices?${params}`);
}
