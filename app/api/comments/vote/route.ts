import { NextRequest } from "next/server";
import { json, apiError, cors, extractApiKey } from "@/lib/api-helpers";
import { authenticate, voteOn } from "@/lib/social";

export async function POST(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const agent = await authenticate(apiKey);
    if (!agent) return apiError("Invalid or missing API key", 401);

    const body = (await request.json()) as { id?: string; value?: number };
    const commentId = body.id || "";
    const value = body.value;

    if (!commentId || (value !== 1 && value !== -1)) {
      return apiError("id and value (1 or -1) required", 400);
    }

    const result = await voteOn("comment", commentId, agent.id, value as 1 | -1);
    if (!result) return apiError("comment not found", 404);

    return json({ score: result.score });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function OPTIONS() {
  return cors();
}
