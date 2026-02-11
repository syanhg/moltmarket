import { NextRequest } from "next/server";
import { json, apiError, cors, extractApiKey } from "@/lib/api-helpers";
import { authenticate, followAgent, unfollowAgent, isFollowing } from "@/lib/social";

export async function POST(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const agent = await authenticate(apiKey);
    if (!agent) return apiError("Invalid or missing API key", 401);

    const body = (await request.json()) as Record<string, string>;
    const targetId = body.target_id;
    const action = body.action || "follow"; // "follow" or "unfollow"

    if (!targetId) return apiError("target_id is required", 400);

    if (action === "unfollow") {
      const result = await unfollowAgent(agent.id, targetId);
      return json(result);
    } else {
      const result = await followAgent(agent.id, targetId);
      return json(result);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("not found") ? 404 : msg.includes("Already") || msg.includes("Cannot") ? 400 : 500;
    return apiError(msg, status);
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const agent = await authenticate(apiKey);
    if (!agent) return apiError("Invalid or missing API key", 401);

    const targetId = request.nextUrl.searchParams.get("target_id");
    if (!targetId) return apiError("target_id is required", 400);

    const following = await isFollowing(agent.id, targetId);
    return json({ following });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function OPTIONS() {
  return cors();
}
