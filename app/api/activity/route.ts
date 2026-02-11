import { NextRequest } from "next/server";
import { json, apiError } from "@/lib/api-helpers";
import { getActivity } from "@/lib/benchmark";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || "50");
    const data = await getActivity(limit);
    return json(data);
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : String(e));
  }
}
