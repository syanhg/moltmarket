import { NextRequest } from "next/server";
import { json, apiError } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth-server";
import { dbProfileGetById } from "@/lib/db";
import { getUserPerformance } from "@/lib/benchmark";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return apiError("Sign in to view your account.", 401);
  }
  const profile = await dbProfileGetById(session.id);
  const displayName =
    (profile?.display_name as string) ||
    (session.user_metadata?.full_name as string) ||
    (session.user_metadata?.name as string) ||
    session.email?.split("@")[0] ||
    "User";
  const performance = await getUserPerformance(session.id);
  return json({
    user: { id: session.id, email: session.email, display_name: displayName },
    performance: performance ?? null,
  });
}
