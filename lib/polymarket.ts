/**
 * Polymarket API client — shared utilities for all API routes.
 *
 * CLOB API: markets, prices
 * Gamma API: events
 *
 * Includes timeout, retry with backoff, and error handling.
 */

const CLOB_BASE = "https://clob.polymarket.com";
const GAMMA_BASE = "https://gamma-api.polymarket.com";

const FETCH_TIMEOUT_MS = 10_000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 60 }, // cache for 60s
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);

      // Don't retry on client errors (4xx)
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Polymarket API ${res.status}: ${url}`);
      }

      // Retry on server errors (5xx)
      if (!res.ok) {
        throw new Error(`Polymarket API ${res.status}: ${url}`);
      }

      return res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on client errors
      if (lastError.message.includes("4")) {
        const status = lastError.message.match(/API (\d+)/)?.[1];
        if (status && Number(status) >= 400 && Number(status) < 500) {
          throw lastError;
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BASE_MS * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

// ---------------------------------------------------------------------------
// Markets (CLOB)
// ---------------------------------------------------------------------------

export async function listMarkets(limit = 20, offset = 0): Promise<unknown[]> {
  const params = new URLSearchParams({
    limit: String(Math.min(limit, 100)),
    offset: String(Math.max(offset, 0)),
    active: "true",
  });
  const data = await fetchJson(`${CLOB_BASE}/markets?${params}`);
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  return (obj.data ?? obj.markets ?? []) as unknown[];
}

export async function getMarket(conditionId: string): Promise<unknown> {
  return fetchJson(`${CLOB_BASE}/markets/${encodeURIComponent(conditionId)}`);
}

// ---------------------------------------------------------------------------
// Events (Gamma)
// ---------------------------------------------------------------------------

export async function listEvents(limit = 20, offset = 0): Promise<unknown[]> {
  const params = new URLSearchParams({
    limit: String(Math.min(limit, 100)),
    offset: String(Math.max(offset, 0)),
    active: "true",
  });
  const data = await fetchJson(`${GAMMA_BASE}/events?${params}`);
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  return (obj.data ?? obj.events ?? []) as unknown[];
}

export async function getEvent(eventId: string): Promise<unknown> {
  return fetchJson(`${GAMMA_BASE}/events/${encodeURIComponent(eventId)}`);
}

// ---------------------------------------------------------------------------
// Prices (CLOB)
// ---------------------------------------------------------------------------

export async function getPrices(tokenIds: string[]): Promise<unknown> {
  if (!tokenIds.length) return {};
  const params = new URLSearchParams({ token_ids: tokenIds.join(",") });
  return fetchJson(`${CLOB_BASE}/prices?${params}`);
}
