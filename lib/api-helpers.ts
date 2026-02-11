/**
 * Shared helpers for Next.js Route Handlers.
 */

import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** Return JSON with CORS headers. */
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

/** Return a JSON error with CORS headers. */
export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}

/** Return a 204 CORS preflight response. */
export function cors() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Extract Bearer token from Authorization header. */
export function extractApiKey(request: Request): string {
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}
