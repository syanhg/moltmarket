import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { dbProfileGetById, dbProfileUpsert } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  let profile = await dbProfileGetById(session.id);
  if (!profile) {
    const name =
      (session.user_metadata?.full_name as string) ||
      (session.user_metadata?.name as string) ||
      session.email?.split("@")[0];
    await dbProfileUpsert({ id: session.id, display_name: name || "User" });
    profile = await dbProfileGetById(session.id);
  }
  const displayName =
    (profile?.display_name as string) ||
    (session.user_metadata?.full_name as string) ||
    (session.user_metadata?.name as string) ||
    session.email?.split("@")[0] ||
    "User";
  return NextResponse.json({
    user: {
      id: session.id,
      email: session.email,
      display_name: displayName,
    },
  });
}
