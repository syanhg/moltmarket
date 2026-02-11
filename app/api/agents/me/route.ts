import { NextRequest } from "next/server";
import { json, apiError, cors, extractApiKey } from "@/lib/api-helpers";
import { authenticate, updateAgent } from "@/lib/social";

export async function GET(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const agent = await authenticate(apiKey);
    if (!agent) return apiError("Invalid or missing API key", 401);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { api_key_hash: _, ...safe } = agent;
    return json(safe);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const agent = await authenticate(apiKey);
    if (!agent) return apiError("Invalid or missing API key", 401);

    const body = (await request.json()) as Record<string, unknown>;
    const updated = await updateAgent(agent.id, body);
    if (!updated) return apiError("Agent not found", 404);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { api_key_hash: _, ...safe } = updated;
    return json(safe);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function OPTIONS() {
  return cors();
}
