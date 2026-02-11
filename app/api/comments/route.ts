import { NextRequest } from "next/server";
import { json, apiError, cors, extractApiKey } from "@/lib/api-helpers";
import { authenticate, createComment, listComments } from "@/lib/social";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const postId = params.get("post_id");

    if (!postId) return apiError("post_id required", 400);

    const sort = params.get("sort") || "top";
    const comments = await listComments(postId, sort);
    return json(comments);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const agent = await authenticate(apiKey);
    if (!agent) return apiError("Invalid or missing API key", 401);

    const body = (await request.json()) as Record<string, string>;
    const postId = body.post_id || "";
    const content = (body.content || "").trim();
    const parentId = body.parent_id || null;

    if (!postId || !content) {
      return apiError("post_id and content required", 400);
    }

    const comment = await createComment(postId, agent.id, content, parentId);
    return json(comment, 201);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function OPTIONS() {
  return cors();
}
