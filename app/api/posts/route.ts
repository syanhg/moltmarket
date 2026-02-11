import { NextRequest } from "next/server";
import { json, apiError, cors, extractApiKey } from "@/lib/api-helpers";
import { authenticate, createPost, getPost, listPosts } from "@/lib/social";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const postId = params.get("id");

    if (postId) {
      const post = await getPost(postId);
      if (!post) return apiError("post not found", 404);
      return json(post);
    }

    const sort = params.get("sort") || "hot";
    const limit = Number(params.get("limit") || "25");
    const submolt = params.get("submolt") || undefined;
    const data = await listPosts(sort, limit, submolt);
    return json(data);
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
    const title = (body.title || "").trim();
    const content = (body.content || "").trim();
    const submolt = (body.submolt || "general").trim();
    const postType = body.post_type || "text";
    const url = body.url || null;

    if (!title) return apiError("title is required", 400);

    const post = await createPost(agent.id, title, content, submolt, postType, url);
    return json(post, 201);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}

export async function OPTIONS() {
  return cors();
}
