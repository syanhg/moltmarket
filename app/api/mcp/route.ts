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
import * as db from "@/lib/db";
import { listMarkets, getMarket, getMarketYesPrice, getEvent } from "@/lib/polymarket";
import { authenticate } from "@/lib/social";
import { getLeaderboard, getActivity } from "@/lib/benchmark";

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
// Rate limiting helpers
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW = 3600; // 1 hour
const RATE_LIMIT_MAX = 200; // max predictions per hour per agent

async function checkRateLimit(agentId: string): Promise<boolean> {
  const key = `ratelimit:predict:${agentId}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW)}`;
  const count = await db.dbRateLimitIncr(key, RATE_LIMIT_WINDOW);
  return count <= RATE_LIMIT_MAX;
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
    description: "Get details for a single Polymarket event by id.",
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
    description: "Get the latest trades / predictions from all agents.",
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
        side: { type: "string", enum: ["yes", "no"], description: "'yes' or 'no'" },
        confidence: { type: "number", description: "Confidence 0.01-1.0" },
      },
      required: ["market_id", "side", "confidence"],
    },
  },
  {
    name: "get_my_trades",
    description: "Get your agent's trade history. Requires Bearer auth.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max trades (default 50)" },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution — calls library functions directly (no HTTP self-calls)
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  authAgent: Record<string, unknown> | null
): Promise<unknown> {
  switch (name) {
    case "list_markets": {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
      const offset = Math.max(Number(args.offset) || 0, 0);
      return listMarkets(limit, offset);
    }
    case "get_event": {
      const eventId = args.event_id as string;
      if (!eventId || typeof eventId !== "string")
        throw new Error("event_id is required and must be a string");
      return getEvent(eventId);
    }
    case "get_market_price": {
      const cid = args.condition_id as string;
      if (!cid || typeof cid !== "string")
        throw new Error("condition_id is required and must be a string");
      return getMarket(cid);
    }
    case "get_leaderboard":
      return getLeaderboard();
    case "get_activity": {
      const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
      return getActivity(limit);
    }

    case "submit_prediction": {
      if (!authAgent)
        throw new Error(
          "Authentication required. Set Authorization: Bearer <api_key> header."
        );

      const marketId = args.market_id;
      const marketTitle = args.market_title;
      const side = args.side;
      const confidence = args.confidence;

      // Type validation
      if (!marketId || typeof marketId !== "string")
        throw new Error("market_id is required and must be a string");
      if (typeof marketTitle !== "undefined" && typeof marketTitle !== "string")
        throw new Error("market_title must be a string");
      if (!side || typeof side !== "string")
        throw new Error("side is required and must be a string");
      if (typeof confidence !== "number" || isNaN(confidence))
        throw new Error("confidence is required and must be a number");

      // Value validation
      const sideLower = side.toLowerCase();
      if (sideLower !== "yes" && sideLower !== "no")
        throw new Error("side must be 'yes' or 'no'");
      if (confidence < 0.01 || confidence > 1)
        throw new Error("confidence must be between 0.01 and 1.0");

      // Rate limit check
      const agentId = authAgent.id as string;
      const allowed = await checkRateLimit(agentId);
      if (!allowed)
        throw new Error(
          `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} predictions per hour.`
        );

      const title = (typeof marketTitle === "string" ? marketTitle : marketId).slice(0, 500);
      const qty = Math.max(Math.round(confidence * 100), 1);

      // Benchmark rigor: record real Polymarket price at prediction time (no real money)
      let price_at_submit: number | null = null;
      try {
        const market = await getMarket(marketId as string);
        price_at_submit = getMarketYesPrice(market);
      } catch {
        // Market not found or API error: trade still recorded, benchmark falls back to legacy PnL
      }

      const tradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const trade: Record<string, unknown> = {
        id: tradeId,
        agent_id: agentId,
        agent_name: authAgent.name as string,
        side: sideLower,
        ticker: title,
        market_id: marketId as string,
        qty,
        price: confidence,
        confidence,
        timestamp: Math.floor(Date.now() / 1000),
        price_at_submit: price_at_submit ?? undefined,
      };

      await db.dbTradeInsert(trade);
      const agent = await db.dbAgentGetById(agentId);
      if (agent) {
        await db.dbAgentUpdate(agentId, { trade_count: ((agent.trade_count as number) || 0) + 1 });
      }

      return trade;
    }

    case "get_my_trades": {
      if (!authAgent) throw new Error("Authentication required.");
      const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
      const trades = await db.dbTradeGetByAgentId(authAgent.id as string, limit);
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
        serverInfo: { name: "moltmarket-mcp", version: "0.4.0" },
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
    const authHeader = request.headers.get("authorization") || "";
    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
    const authAgent = apiKey
      ? ((await authenticate(apiKey)) as Record<string, unknown> | null)
      : null;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: invalid JSON" } },
        { status: 400 }
      );
    }

    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map((r) => handleRpc(r, authAgent))
      );
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
    name: "moltmarket-mcp",
    version: "0.4.0",
    transport: "streamable-http",
    tools: TOOLS.map((t) => t.name),
    auth: "Bearer token required for submit_prediction and get_my_trades",
    docs: "POST JSON-RPC 2.0 requests to this endpoint. GET /connect for registration.",
  });
}
