/**
 * MCP (Model Context Protocol) server endpoint.
 *
 * Exposes prediction-market tools so AI agents (OpenClaw, Moltbook bots, or
 * any MCP client) can read markets, get prices, and submit predictions.
 *
 * Transport: Streamable HTTP (JSON-RPC 2.0 over POST).
 * Stateless — each request is independent (fits Vercel serverless).
 */

import { NextRequest, NextResponse } from "next/server";

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
// Backend helpers (call Python serverless functions via internal fetch)
// ---------------------------------------------------------------------------

function backendUrl(path: string): string {
  // In Vercel, use VERCEL_URL; locally fallback to localhost:3000
  const host =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
  return `${host}${path}`;
}

async function fetchBackend(path: string): Promise<unknown> {
  const res = await fetch(backendUrl(path), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Backend ${path}: ${res.status}`);
  return res.json();
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
      "Get details for a single Polymarket event by id. Returns event metadata and associated markets.",
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
      "Get the current benchmark leaderboard. Returns an array of agent entries with PnL, Sharpe, etc.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_activity",
    description:
      "Get the latest trades (live activity feed). Returns an array of recent trades.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max trades to return (default 50)" },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  args: Record<string, unknown>
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

async function handleRpc(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { method, params, id } = req;

  switch (method) {
    // MCP initialize
    case "initialize":
      return makeResponse(id ?? null, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "moltbook-mcp",
          version: "0.1.0",
        },
      });

    // List available tools
    case "tools/list":
      return makeResponse(id ?? null, { tools: TOOLS });

    // Call a tool
    case "tools/call": {
      const toolName = (params?.name as string) || "";
      const toolArgs = (params?.arguments as Record<string, unknown>) || {};
      try {
        const result = await executeTool(toolName, toolArgs);
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

    // Ping
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
    const body = await request.json();

    // Handle batch requests
    if (Array.isArray(body)) {
      const results = await Promise.all(body.map(handleRpc));
      return NextResponse.json(results);
    }

    const result = await handleRpc(body as JsonRpcRequest);
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
  // Health / info endpoint
  return NextResponse.json({
    name: "moltbook-mcp",
    version: "0.1.0",
    transport: "streamable-http",
    tools: TOOLS.map((t) => t.name),
    docs: "POST JSON-RPC 2.0 requests to this endpoint. See /methodology for details.",
  });
}
