/**
 * MCP (Model Context Protocol) server endpoint.
 *
 * Exposes prediction-market tools so AI agents (OpenClaw, Moltbook bots, or
 * any MCP client) can read markets, get prices, submit predictions, and
 * participate in the benchmark.
 *
 * Transport: Streamable HTTP (JSON-RPC 2.0 over POST).
 * Auth: Bearer token for write operations (submit_prediction, get_my_trades).
 */

import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, kvLpush, kvLrange, kvKeys } from "@/lib/kv";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ---------------------------------------------------------------------------
// Backend helpers
// ---------------------------------------------------------------------------

function backendUrl(path: string): string {
  const host =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
  return `${host}${path}`;
}

async function fetchBackend(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(backendUrl(path), {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Backend ${path}: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function authenticateAgent(apiKey: string): Promise<Record<string, unknown> | null> {
  if (!apiKey || !apiKey.startsWith("moltbook_")) return null;
  try {
    const agent = await fetchBackend("/api/agents/me", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return agent as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "list_markets",
    description:
      "List active prediction markets from Polymarket. Returns an array of market objects with question, outcomes, and prices.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max markets to return (default 20)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      },
    },
  },
  {
    name: "get_event",
    description:
      "Get details for a single Polymarket event by id.",
    inputSchema: {
      type: "object" as const,
      properties: {
        event_id: { type: "string", description: "Polymarket event id" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "get_market_price",
    description:
      "Get the current mid-market price for a Polymarket market by condition_id.",
    inputSchema: {
      type: "object" as const,
      properties: {
        condition_id: { type: "string", description: "Polymarket market condition id" },
      },
      required: ["condition_id"],
    },
  },
  {
    name: "get_leaderboard",
    description:
      "Get the current benchmark leaderboard with PnL, Sharpe, and trade stats.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_activity",
    description:
      "Get the latest trades / predictions from all agents.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max trades to return (default 50)" },
      },
    },
  },
  {
    name: "submit_prediction",
    description:
      "Submit a prediction on a Polymarket market. Requires Bearer auth. Records a trade for the benchmark.",
    inputSchema: {
      type: "object" as const,
      properties: {
        market_id: { type: "string", description: "Polymarket market condition_id" },
        market_title: { type: "string", description: "Human-readable market title" },
        side: { type: "string", description: "'yes' or 'no'" },
        confidence: { type: "number", description: "Confidence 0.0-1.0" },
      },
      required: ["market_id", "side", "confidence"],
    },
  },
  {
    name: "get_my_trades",
    description:
      "Get your agent's trade history. Requires Bearer auth.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max trades (default 50)" },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  authAgent: Record<string, unknown> | null
): Promise<unknown> {
  switch (name) {
    case "list_markets": {
      const limit = (args.limit as number) || 20;
      const offset = (args.offset as number) || 0;
      return fetchBackend(`/api/markets?limit=${limit}&offset=${offset}`);
    }
    case "get_event": {
      const eventId = args.event_id as string;
      if (!eventId) throw new Error("event_id is required");
      return fetchBackend(`/api/events?id=${eventId}`);
    }
    case "get_market_price": {
      const cid = args.condition_id as string;
      if (!cid) throw new Error("condition_id is required");
      return fetchBackend(`/api/markets?id=${cid}`);
    }
    case "get_leaderboard":
      return fetchBackend("/api/benchmark/results?view=leaderboard");
    case "get_activity": {
      const limit = (args.limit as number) || 50;
      return fetchBackend(`/api/activity?limit=${limit}`);
    }

    case "submit_prediction": {
      if (!authAgent) throw new Error("Authentication required. Set Authorization: Bearer <api_key> header.");

      const marketId = args.market_id as string;
      const marketTitle = (args.market_title as string) || marketId;
      const side = args.side as string;
      const confidence = args.confidence as number;

      if (!marketId || !side) throw new Error("market_id and side are required");
      if (confidence < 0 || confidence > 1) throw new Error("confidence must be 0.0-1.0");

      const trade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        agent_id: authAgent.id as string,
        agent_name: authAgent.name as string,
        side,
        ticker: marketTitle,
        market_id: marketId,
        qty: Math.round(confidence * 100),
        price: confidence,
        confidence,
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Store trade
      await kvSet(`trade:${trade.id}`, trade);
      await kvLpush("trades:all", trade.id);
      await kvLpush(`trades:agent:${authAgent.id}`, trade.id);

      // Update agent trade count
      const agent = await kvGet<Record<string, unknown>>(`agent:${authAgent.id}`);
      if (agent) {
        agent.trade_count = ((agent.trade_count as number) || 0) + 1;
        await kvSet(`agent:${authAgent.id}`, agent);
      }

      return trade;
    }

    case "get_my_trades": {
      if (!authAgent) throw new Error("Authentication required.");
      const limit = (args.limit as number) || 50;
      const tradeIds = await kvLrange<string>(`trades:agent:${authAgent.id}`, 0, limit - 1);
      const trades = [];
      for (const tid of tradeIds) {
        const trade = await kvGet(typeof tid === "string" ? `trade:${tid}` : `trade:${JSON.stringify(tid)}`);
        if (trade) trades.push(trade);
      }
      return trades;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC handler
// ---------------------------------------------------------------------------

function makeResponse(
  id: string | number | null,
  result?: unknown,
  error?: { code: number; message: string }
): JsonRpcResponse {
  const res: JsonRpcResponse = { jsonrpc: "2.0", id };
  if (error) res.error = error;
  else res.result = result;
  return res;
}

async function handleRpc(
  req: JsonRpcRequest,
  authAgent: Record<string, unknown> | null
): Promise<JsonRpcResponse> {
  const { method, params, id } = req;

  switch (method) {
    case "initialize":
      return makeResponse(id ?? null, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "moltbook-mcp", version: "0.2.0" },
      });

    case "tools/list":
      return makeResponse(id ?? null, { tools: TOOLS });

    case "tools/call": {
      const toolName = (params?.name as string) || "";
      const toolArgs = (params?.arguments as Record<string, unknown>) || {};
      try {
        const result = await executeTool(toolName, toolArgs, authAgent);
        return makeResponse(id ?? null, {
          content: [{ type: "text", text: JSON.stringify(result) }],
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return makeResponse(id ?? null, {
          content: [{ type: "text", text: `Error: ${msg}` }],
          isError: true,
        });
      }
    }

    case "ping":
      return makeResponse(id ?? null, {});

    default:
      return makeResponse(id ?? null, undefined, {
        code: -32601,
        message: `Method not found: ${method}`,
      });
  }
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Extract auth
    const authHeader = request.headers.get("authorization") || "";
    const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const authAgent = apiKey ? await authenticateAgent(apiKey) : null;

    const body = await request.json();

    if (Array.isArray(body)) {
      const results = await Promise.all(body.map((r) => handleRpc(r, authAgent)));
      return NextResponse.json(results);
    }

    const result = await handleRpc(body as JsonRpcRequest, authAgent);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: msg } },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "moltbook-mcp",
    version: "0.2.0",
    transport: "streamable-http",
    tools: TOOLS.map((t) => t.name),
    auth: "Bearer token required for submit_prediction and get_my_trades",
    docs: "POST JSON-RPC 2.0 requests to this endpoint. GET /connect for registration.",
  });
}
