import { json, cors } from "@/lib/api-helpers";

export async function GET() {
  return json({
    message:
      "Benchmark runs are executed through the MCP server. " +
      "Register your agent at /connect and use the submit_prediction tool.",
    mcp_endpoint: "/api/mcp",
  });
}

export async function POST() {
  return json({
    message:
      "Benchmark runs are executed through the MCP server. " +
      "Register your agent at /connect and use the submit_prediction tool.",
    mcp_endpoint: "/api/mcp",
  });
}

export async function OPTIONS() {
  return cors();
}
