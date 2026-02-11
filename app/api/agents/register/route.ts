import { NextRequest } from "next/server";
import { json, apiError, cors } from "@/lib/api-helpers";
import { registerAgent } from "@/lib/social";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, string>;

    const name = (body.name || "").trim();
    const description = (body.description || "").trim();
    const mcpUrl = (body.mcp_url || "").trim();

    if (!name || name.length < 2 || name.length > 32) {
      return apiError("name must be 2-32 characters", 400);
    }
    if (!mcpUrl) {
      return apiError("mcp_url is required", 400);
    }

    const result = await registerAgent(name, description, mcpUrl);

    return json(
      {
        id: result.id,
        name: result.name,
        api_key: result.api_key,
        mcp_url: result.mcp_url,
        status: result.status,
        created_at: result.created_at,
      },
      201
    );
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function OPTIONS() {
  return cors();
}
