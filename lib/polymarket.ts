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

/**
 * Extract the YES outcome price (0-1) from a CLOB market response.
 * Used for benchmark: record real price at prediction time and for resolution.
 */
export function getMarketYesPrice(market: unknown): number | null {
  if (!market || typeof market !== "object") return null;
  const m = market as Record<string, unknown>;
  // Tokens array: { outcome: "Yes"|"No", price: number }
  const tokens = m.tokens as Array<{ outcome?: string; price?: number }> | undefined;
  if (tokens?.length) {
    const yes = tokens.find((t) => String(t.outcome).toLowerCase() === "yes");
    if (yes?.price != null && typeof yes.price === "number")
      return Math.max(0, Math.min(1, yes.price));
  }
  // outcomePrices: "0.65,0.35" or [0.65, 0.35]
  const op = m.outcomePrices;
  if (Array.isArray(op) && op.length > 0) {
    const p = typeof op[0] === "string" ? parseFloat(op[0]) : op[0];
    if (!Number.isNaN(p)) return Math.max(0, Math.min(1, p));
  }
  if (typeof op === "string") {
    const first = parseFloat(op.split(",")[0]);
    if (!Number.isNaN(first)) return Math.max(0, Math.min(1, first));
  }
  // bestBid / bestAsk (yes side)
  const bestBid = m.bestBid != null ? Number(m.bestBid) : NaN;
  const bestAsk = m.bestAsk != null ? Number(m.bestAsk) : NaN;
  if (!Number.isNaN(bestBid) || !Number.isNaN(bestAsk)) {
    const mid = Number.isNaN(bestBid) ? bestAsk : Number.isNaN(bestAsk) ? bestBid : (bestBid + bestAsk) / 2;
    return Math.max(0, Math.min(1, mid));
  }
  return null;
}

/**
 * Fetch market and return resolution state for binary markets.
 * When closed, outcomePrices are typically "1,0" (YES won) or "0,1" (NO won).
 */
export async function getMarketResolution(
  conditionId: string
): Promise<{ closed: boolean; outcomeYes: number | null }> {
  try {
    const market = await getMarket(conditionId);
    const m = market as Record<string, unknown> | null;
    if (!m) return { closed: false, outcomeYes: null };
    const active = m.active;
    if (active === true) return { closed: false, outcomeYes: null };
    // When closed, outcomePrices indicate result: first value = YES outcome (1 or 0)
    const op = m.outcomePrices;
    let outcomeYes: number | null = null;
    if (Array.isArray(op) && op.length > 0) {
      const p = typeof op[0] === "string" ? parseFloat(op[0]) : op[0];
      if (!Number.isNaN(p)) outcomeYes = p > 0.5 ? 1 : p < 0.5 ? 0 : null;
    } else if (typeof op === "string") {
      const first = parseFloat(op.split(",")[0]);
      if (!Number.isNaN(first)) outcomeYes = first > 0.5 ? 1 : first < 0.5 ? 0 : null;
    }
    const closed = active === false && outcomeYes !== null;
    return { closed, outcomeYes };
  } catch {
    return { closed: false, outcomeYes: null };
  }
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
