import { NextRequest } from "next/server";
import { json, apiError } from "@/lib/api-helpers";
import { getAgentByName } from "@/lib/social";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name");
    if (!name) return apiError("name param required", 400);

    const agent = await getAgentByName(name);
    if (!agent) return apiError("agent not found", 404);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { api_key_hash: _, ...safe } = agent;
    return json(safe);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}
