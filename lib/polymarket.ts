/**
 * Polymarket API client — shared utilities for all API routes.
 *
 * Gamma API: market discovery, listings, metadata, resolution status (primary)
 * CLOB API:  order book, real-time mid prices, individual market lookup (secondary)
 *
 * Includes timeout, retry with backoff, and error handling.
 */

const CLOB_BASE = "https://clob.polymarket.com";
const GAMMA_BASE = "https://gamma-api.polymarket.com";

const FETCH_TIMEOUT_MS = 12_000; // 12 seconds
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store", // always fetch real-time data
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
// Gamma market → normalised shape expected by the rest of the codebase
// ---------------------------------------------------------------------------

interface NormalisedToken {
  token_id: string;
  outcome: string;
  price: number;
}

/**
 * Turn a raw Gamma API market object into a shape the rest of our code expects:
 *   condition_id, question, tokens[].{token_id, outcome, price}, active, etc.
 */
function normaliseGammaMarket(raw: Record<string, unknown>): Record<string, unknown> {
  // Gamma uses `conditionId` while our codebase uses `condition_id`
  const conditionId =
    (raw.conditionId as string) ?? (raw.condition_id as string) ?? (raw.id as string) ?? "";

  const question =
    (raw.question as string) ?? (raw.title as string) ?? "Unknown";

  // Parse outcomePrices (Gamma returns a JSON-encoded string like "[\"0.63\",\"0.37\"]" or "0.63,0.37")
  let yesPrice = 0;
  let noPrice = 0;
  const op = raw.outcomePrices;
  if (typeof op === "string") {
    try {
      const parsed = JSON.parse(op);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        yesPrice = parseFloat(String(parsed[0])) || 0;
        noPrice = parseFloat(String(parsed[1])) || 0;
      }
    } catch {
      // fallback: comma-separated "0.63,0.37"
      const parts = op.split(",");
      if (parts.length >= 2) {
        yesPrice = parseFloat(parts[0]) || 0;
        noPrice = parseFloat(parts[1]) || 0;
      }
    }
  } else if (Array.isArray(op) && op.length >= 2) {
    yesPrice = parseFloat(String(op[0])) || 0;
    noPrice = parseFloat(String(op[1])) || 0;
  }

  // Override with lastTradePrice / bestBid / bestAsk if available and more recent
  if (yesPrice === 0 && raw.lastTradePrice != null) {
    yesPrice = Number(raw.lastTradePrice) || 0;
    noPrice = yesPrice > 0 ? 1 - yesPrice : 0;
  }

  // Build CLOB-style token IDs from clobTokenIds (JSON string or comma-separated)
  let tokenIds: string[] = [];
  const clobIds = raw.clobTokenIds;
  if (typeof clobIds === "string") {
    try {
      const parsed = JSON.parse(clobIds);
      if (Array.isArray(parsed)) tokenIds = parsed.map(String);
    } catch {
      tokenIds = clobIds.split(",").map((s) => s.trim());
    }
  } else if (Array.isArray(clobIds)) {
    tokenIds = clobIds.map(String);
  }

  // Parse outcomes (Gamma returns JSON string like "[\"Yes\",\"No\"]")
  let outcomes: string[] = ["Yes", "No"];
  const oc = raw.outcomes;
  if (typeof oc === "string") {
    try {
      const parsed = JSON.parse(oc);
      if (Array.isArray(parsed)) outcomes = parsed.map(String);
    } catch {
      outcomes = oc.split(",").map((s) => s.trim());
    }
  } else if (Array.isArray(oc)) {
    outcomes = oc.map(String);
  }

  const tokens: NormalisedToken[] = [
    {
      token_id: tokenIds[0] ?? "",
      outcome: outcomes[0] ?? "Yes",
      price: yesPrice,
    },
    {
      token_id: tokenIds[1] ?? "",
      outcome: outcomes[1] ?? "No",
      price: noPrice,
    },
  ];

  // Parse volume — Gamma returns string or number
  let volume = 0;
  const vol =
    raw.volumeNum ?? raw.volume ?? raw.volume24hr ?? 0;
  if (typeof vol === "number") volume = vol;
  else if (typeof vol === "string") volume = parseFloat(vol) || 0;

  // Determine active / closed status
  const active = raw.closed === true ? false : raw.active !== false;

  return {
    // Normalised fields
    condition_id: conditionId,
    question,
    description: (raw.description as string) ?? "",
    outcomes,
    tokens,
    active,
    closed: raw.closed ?? false,
    outcomePrices: raw.outcomePrices,

    // Extra useful Gamma fields
    image: raw.image ?? "",
    icon: raw.icon ?? "",
    slug: raw.slug ?? "",
    endDate: raw.endDate ?? raw.endDateIso ?? "",
    volume,
    volume24hr: Number(raw.volume24hr ?? 0) || 0,
    liquidity: Number(raw.liquidityNum ?? raw.liquidity ?? 0) || 0,
    bestBid: raw.bestBid ?? null,
    bestAsk: raw.bestAsk ?? null,
    lastTradePrice: raw.lastTradePrice ?? null,
    clobTokenIds: tokenIds,

    // Keep original for anything else that needs it
    _raw_id: raw.id,
  };
}

// ---------------------------------------------------------------------------
// Markets — uses Gamma API for discovery (real-time, active markets)
// ---------------------------------------------------------------------------

export async function listMarkets(limit = 20, offset = 0): Promise<unknown[]> {
  const params = new URLSearchParams({
    limit: String(Math.min(limit, 100)),
    offset: String(Math.max(offset, 0)),
    closed: "false",
    order: "volume24hr",
    ascending: "false",
  });
  const data = await fetchJson(`${GAMMA_BASE}/markets?${params}`);
  const raw = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.data ??
        (data as Record<string, unknown>)?.markets ??
        []) as unknown[];

  return (raw as Record<string, unknown>[]).map(normaliseGammaMarket);
}

/**
 * Get a single market. Tries Gamma first (by conditionId), falls back to CLOB.
 */
export async function getMarket(conditionId: string): Promise<unknown> {
  // Try Gamma API first — gives richer data
  try {
    const params = new URLSearchParams({ condition_id: conditionId });
    const data = await fetchJson(`${GAMMA_BASE}/markets?${params}`);
    const arr = Array.isArray(data) ? data : [];
    if (arr.length > 0) {
      return normaliseGammaMarket(arr[0] as Record<string, unknown>);
    }
  } catch {
    // fall through to CLOB
  }

  // Fallback: CLOB API for individual market
  const raw = await fetchJson(
    `${CLOB_BASE}/markets/${encodeURIComponent(conditionId)}`
  );
  return raw;
}

/**
 * Extract the YES outcome price (0-1) from a market response.
 * Works with both normalised Gamma and raw CLOB formats.
 */
export function getMarketYesPrice(market: unknown): number | null {
  if (!market || typeof market !== "object") return null;
  const m = market as Record<string, unknown>;

  // Normalised tokens array (from normaliseGammaMarket or CLOB): { outcome: "Yes", price: 0.65 }
  const tokens = m.tokens as Array<{ outcome?: string; price?: number }> | undefined;
  if (tokens?.length) {
    const yes = tokens.find((t) => String(t.outcome).toLowerCase() === "yes");
    if (yes?.price != null && typeof yes.price === "number" && yes.price > 0)
      return Math.max(0, Math.min(1, yes.price));
  }

  // outcomePrices: Gamma returns string like "[\"0.65\",\"0.37\"]" or "0.65,0.35"
  const op = m.outcomePrices;
  if (typeof op === "string") {
    let first: number | undefined;
    try {
      const parsed = JSON.parse(op);
      if (Array.isArray(parsed) && parsed.length > 0)
        first = parseFloat(String(parsed[0]));
    } catch {
      first = parseFloat(op.split(",")[0]);
    }
    if (first != null && !Number.isNaN(first))
      return Math.max(0, Math.min(1, first));
  }
  if (Array.isArray(op) && op.length > 0) {
    const p = typeof op[0] === "string" ? parseFloat(op[0]) : op[0];
    if (!Number.isNaN(p)) return Math.max(0, Math.min(1, p));
  }

  // lastTradePrice from Gamma
  if (m.lastTradePrice != null) {
    const ltp = Number(m.lastTradePrice);
    if (!Number.isNaN(ltp) && ltp > 0) return Math.max(0, Math.min(1, ltp));
  }

  // bestBid / bestAsk (yes side) from CLOB or Gamma
  const bestBid = m.bestBid != null ? Number(m.bestBid) : NaN;
  const bestAsk = m.bestAsk != null ? Number(m.bestAsk) : NaN;
  if (!Number.isNaN(bestBid) || !Number.isNaN(bestAsk)) {
    const mid = Number.isNaN(bestBid)
      ? bestAsk
      : Number.isNaN(bestAsk)
        ? bestBid
        : (bestBid + bestAsk) / 2;
    return Math.max(0, Math.min(1, mid));
  }
  return null;
}

/**
 * Fetch market and return resolution state for binary markets.
 * Uses Gamma API — when a market is closed, outcomePrices are typically "1,0" (YES won) or "0,1" (NO won).
 */
export async function getMarketResolution(
  conditionId: string
): Promise<{ closed: boolean; outcomeYes: number | null }> {
  try {
    const market = await getMarket(conditionId);
    const m = market as Record<string, unknown> | null;
    if (!m) return { closed: false, outcomeYes: null };

    // Check both `active` and `closed` flags
    const isActive = m.active === true;
    const isClosed = m.closed === true;

    if (isActive && !isClosed) return { closed: false, outcomeYes: null };

    // When closed, outcomePrices indicate result: first value = YES outcome (1 or 0)
    const op = m.outcomePrices;
    let outcomeYes: number | null = null;

    if (typeof op === "string") {
      let first: number | undefined;
      try {
        const parsed = JSON.parse(op);
        if (Array.isArray(parsed) && parsed.length > 0)
          first = parseFloat(String(parsed[0]));
      } catch {
        first = parseFloat(op.split(",")[0]);
      }
      if (first != null && !Number.isNaN(first))
        outcomeYes = first > 0.5 ? 1 : first < 0.5 ? 0 : null;
    } else if (Array.isArray(op) && op.length > 0) {
      const p = typeof op[0] === "string" ? parseFloat(op[0]) : op[0];
      if (!Number.isNaN(p)) outcomeYes = p > 0.5 ? 1 : p < 0.5 ? 0 : null;
    }

    const closed = (isClosed || !isActive) && outcomeYes !== null;
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
    closed: "false",
    order: "volume24hr",
    ascending: "false",
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
